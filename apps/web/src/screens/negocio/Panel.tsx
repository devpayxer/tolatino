'use client';

// Business admin panel (`/negocio`) — Handoff v2 dashboard. Desktop ≥1024:
// fixed sidebar; mobile: drawer. Content varies by plan (Free/Verified/
// Premium) and rubro. Tab content: Insights + Module setup + the uniform
// module pages.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Bell, Check, ChevronDown, ExternalLink, Menu, MessageCircle, Plus, Search, ShoppingBag, Star, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { supabase } from '@/lib/supabase';
import { useBizAdmin, rubroFromCat } from '@/lib/bizAdmin';
import { CAT, type CatKey } from '@/lib/tiles';
import { VerifiedBadge } from '@/components/ui';
import { LangToggle } from '@/components/AppHeader';
import { CAT_INFO, activeMods, buildGeneric, buildNav, pageHead, type Mods, type PanelCtx, type Rubro, type TabKey, type Tier } from '@/screens/negocio/tabs';
import { GenericTab } from '@/screens/negocio/GenericTab';
import { HoursReminders } from '@/screens/negocio/HoursReminders';
import { InsightsFree, InsightsPaid } from '@/screens/negocio/Insights';
import { ModulesSetup } from '@/screens/negocio/ModulesSetup';
import { UpdatesModule } from '@/screens/negocio/modules/Updates';
import { BillingModule } from '@/screens/negocio/modules/Billing';
import { CustomersModule } from '@/screens/negocio/modules/Customers';
import { StaffModule } from '@/screens/negocio/modules/Staff';
import { RentalModule } from '@/screens/negocio/modules/Rental';
import { EventsModule } from '@/screens/negocio/modules/Events';
import { ProductsModule } from '@/screens/negocio/modules/Products';
import { ServicesModule } from '@/screens/negocio/modules/Services';
import { FoodModule } from '@/screens/negocio/modules/Food';
import { ListingModule } from '@/screens/negocio/modules/Listing';
import { HoursModule } from '@/screens/negocio/modules/Hours';
import { PhotosModule } from '@/screens/negocio/modules/Photos';
import { RelatedModule } from '@/screens/negocio/modules/Related';
import { SettingsModule } from '@/screens/negocio/modules/Settings';
import { MessagesModule } from '@/screens/negocio/modules/Messages';
import { PaymentsModule } from '@/screens/negocio/modules/Payments';

// Tabs that render their own rich module screen (mode toggles / sub-tabs /
// wizards / sheets) instead of the uniform GenericTab — the panel hides its
// generic "+ CTA" row for these (each module owns its own actions).
const RICH_MODULES = new Set<TabKey>([
  'listing', 'hours', 'photos', 'related', 'settings', 'messages', 'payments',
  'updates', 'billing', 'customers', 'orders', 'reviews', 'staff', 'jobs',
  'rental', 'events', 'products', 'shipping', 'services', 'bookings', 'menu',
]);

const RUBRO_FROM_ONB: Record<string, Rubro> = {
  comida: 'restaurant', belleza: 'beauty', auto: 'auto', tiendas: 'retail', abarrotes: 'retail', deportes: 'rental',
};

const DEFAULT_MODS: Mods = { menu: true, services: true, bookings: true, products: true, rental: true, events: true, updates: true, staff: true };

export function PanelScreen() {
  const { L } = useLang();
  const app = useApp();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>('insights');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [photoCount, setPhotoCount] = useState<number | undefined>(undefined);
  const admin = useBizAdmin();
  const real = admin.active; // the signed-in owner's active business (null in demo)

  // Real gallery photo count for the active business → the "Fotos y media" nav
  // badge. Refetched on business switch and on tab change (so it stays fresh
  // after uploads). Demo → 0 (empty demo gallery).
  useEffect(() => {
    if (!real || admin.demo || !supabase) { setPhotoCount(admin.demo ? 0 : undefined); return; }
    let cancelled = false;
    supabase
      .from('business_photos')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', real.id)
      .then(({ count }) => { if (!cancelled) setPhotoCount(count ?? 0); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo, tab]);
  const [drawer, setDrawer] = useState(false);
  const [mods, setMods] = useState<Mods>(DEFAULT_MODS);

  // Load the real business's saved module config (null → tier default).
  useEffect(() => {
    setMods(real?.modules ? { ...DEFAULT_MODS, ...real.modules } : DEFAULT_MODS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id]);

  // Toggling a module persists to the real business (local-only in demo).
  const toggleMod = (k: keyof Mods) =>
    setMods((m) => {
      const next = { ...m, [k]: !m[k] };
      if (real) admin.update({ modules: next });
      return next;
    });

  // The real business drives plan/rubro/identity; when the owner has no listing
  // (or isn't signed in) the panel falls back to the demo tier switcher so it
  // stays fully explorable.
  const [demoTier, setDemoTier] = useState<Tier>(app.biz ? (app.biz.plan === 'pro' ? 'verified' : 'free') : 'verified');
  const tier: Tier = real ? real.tier : demoTier;
  const rubro: Rubro = real ? rubroFromCat(real.category_id) : ((app.biz && RUBRO_FROM_ONB[app.biz.cat]) || 'restaurant');
  const ci = CAT_INFO[rubro];
  const isFree = tier === 'free';
  const isPremium = tier === 'premium';

  const ctx: PanelCtx = useMemo(
    () => ({
      L, es: L('x', 'y') === 'x', tier, rubro, ci, isFree, isPremium, mods, photoCount,
      go: (t) => { setTab(t); setDrawer(false); },
    }),
    [L, tier, rubro, ci, isFree, isPremium, mods, photoCount],
  );

  const initialsOf = (n: string) => n.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'TL';
  const catLabel = (cat: string) => L(CAT[cat as CatKey]?.es ?? cat, CAT[cat as CatKey]?.en ?? cat);

  const bizName = real ? real.name : isFree ? 'Lupita’s Tortillería' : (app.biz?.name && app.biz.plan === 'pro' ? app.biz.name : ci.name);
  const bizInitials = real ? initialsOf(real.name) : isFree ? 'LT' : ci.initials;
  // Business avatar: the uploaded logo when present, else the initials tile.
  const bizAvatar = (cls: string) =>
    real?.logo_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={real.logo_url} alt="" className={`${cls} flex-none border border-hair object-cover`} />
    ) : (
      <span className={`${cls} flex flex-none items-center justify-center font-extrabold text-white`} style={{ background: isFree ? '#9F1239' : '#7B61FF' }}>
        {bizInitials}
      </span>
    );
  const bizCategory = real ? catLabel(real.category_id) : isFree ? L('Panadería · Tortillería', 'Bakery · Tortillería') : L(ci.es, ci.en);
  const bizArea = real ? (real.address || real.city || '') : ci.area;
  const catTile = real ? `${real.tile_a ?? '#EFEBFF'} 0 9px,${real.tile_b ?? '#E5DEF9'} 9px 18px` : isFree ? '#FCE3EC 0 9px,#F6CEDD 9px 18px' : ci.tile;

  const livePill = real
    ? real.is_open
      ? { bg: '#E3F5EA', c: '#1F8A4C', dot: '#1F9D57', text: L('Abierto', 'Open') }
      : { bg: '#FCEFD6', c: '#9A6A12', dot: '#E8954A', text: L('Cerrado', 'Closed') }
    : isFree
      ? { bg: '#FCEFD6', c: '#9A6A12', dot: '#E8954A', text: L('Sin verificar', 'Unverified') }
      : { bg: '#E3F5EA', c: '#1F8A4C', dot: '#1F9D57', text: L('Abierto · hasta 10 PM', 'Open · until 10 PM') };
  const planPill = isFree
    ? { bg: '#F1EFFA', c: '#8A86A0', text: 'Free' }
    : isPremium
      ? { bg: '#1E1B2E', c: '#F4B740', text: '✦ Premium' }
      : { bg: '#F1EFFA', c: '#6D4DF6', text: 'Verified' };

  const stats = {
    rating: isFree ? '—' : '4.8',
    s1v: isFree ? '108' : '1,420', s1l: L('Vistas/sem', 'Views/wk'),
    s2v: isFree ? '12' : '284', s2l: isFree ? L('Visitas', 'Visits') : L('Seguidores', 'Followers'),
  };

  const nav = buildNav(ctx);
  const head = pageHead(tab, ctx);
  const am = activeMods(ctx);

  // If the current tab's module got turned off, fall back to insights.
  if (tab in am && !(am as Record<string, boolean>)[tab] && !['insights'].includes(tab)) {
    // handled implicitly: nav locks it; keep simple.
  }

  const sidebar = (
    <div className="flex h-full w-[264px] flex-none flex-col border-r border-hair bg-white">
      {/* business card */}
      <div className="border-b border-hair p-4">
        <div className="h-2 rounded-full" style={{ background: `repeating-linear-gradient(135deg,${catTile})` }} />
        <div className="mt-3 flex items-center gap-2.5">
          {bizAvatar('h-11 w-11 rounded-btn text-[14px]')}
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[14px] font-extrabold text-ink">{bizName}</span>
              {!isFree && <VerifiedBadge size={15} />}
            </span>
            <span className="block truncate text-[11px] font-semibold text-muted">{bizCategory}</span>
            <span className="block truncate text-[10.5px] font-semibold text-muted-2">{bizArea}</span>
          </span>
        </div>

        {/* business switcher — a clear dropdown when the owner has 2+ listings:
            lists each business (avatar · name · rubro, ✓ on the active one) and a
            "publish another" action. */}
        {admin.businesses.length > 1 && (
          <div className="relative mt-3">
            <button
              onClick={() => setSwitcherOpen((o) => !o)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-field border-[1.5px] border-lilac-line bg-app px-2.5 py-2 text-left"
              aria-label={L('Cambiar de negocio', 'Switch business')}
              aria-expanded={switcherOpen}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-extrabold uppercase tracking-[.05em] text-muted-2">{L('Negocio', 'Business')} · {admin.businesses.length}</span>
                <span className="block truncate text-[12px] font-extrabold text-ink">{real?.name ?? '—'}</span>
              </span>
              <ChevronDown size={15} className={`flex-none text-muted transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
            </button>
            {switcherOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 overflow-hidden rounded-card-sm border border-hair bg-white shadow-modal">
                  <div className="max-h-[240px] overflow-y-auto p-1.5">
                    {admin.businesses.map((b) => {
                      const on = b.id === admin.activeId;
                      return (
                        <button
                          key={b.id}
                          onClick={() => { admin.setActive(b.id); setSwitcherOpen(false); }}
                          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-btn px-2 py-2 text-left ${on ? 'bg-lilac-2' : 'hover:bg-app'}`}
                        >
                          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-[11px] font-extrabold text-white" style={{ background: b.tier === 'free' ? '#9F1239' : '#7B61FF' }}>
                            {initialsOf(b.name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-extrabold text-ink">{b.name}</span>
                            <span className="block truncate text-[10.5px] font-semibold text-muted-2">{catLabel(b.category_id)}</span>
                          </span>
                          {on && <Check size={15} strokeWidth={2.6} className="flex-none text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => { setSwitcherOpen(false); router.push('/negocio/publicar'); }}
                    className="flex w-full cursor-pointer items-center gap-2 border-t border-hair px-3 py-2.5 text-left text-[12px] font-extrabold text-primary-dark hover:bg-app"
                  >
                    <Plus size={14} strokeWidth={2.6} /> {L('Publicar otro negocio', 'Publish another business')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <div className="mt-3 flex items-center gap-1.5">
          <span className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-extrabold" style={{ background: livePill.bg, color: livePill.c }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: livePill.dot }} />
            {livePill.text}
          </span>
          <span className="rounded-full px-2 py-1 text-[10px] font-extrabold" style={{ background: planPill.bg, color: planPill.c }}>
            {planPill.text}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          {[
            [stats.rating, '★'],
            [stats.s1v, stats.s1l],
            [stats.s2v, stats.s2l],
          ].map(([v, l]) => (
            <span key={l} className="rounded-[10px] bg-app px-1 py-2">
              <span className="block text-[13px] font-extrabold text-ink">{v}</span>
              <span className="block truncate text-[9px] font-bold text-muted">{l}</span>
            </span>
          ))}
        </div>
      </div>

      {/* nav */}
      <nav className="min-h-0 flex-1 overflow-y-auto p-3">
        {nav.map((gp, gi) => (
          <div key={gi} className="mb-2">
            {gp.label && (
              <div className="flex items-center justify-between px-2 pb-1 pt-2">
                <span className="text-[10.5px] font-extrabold uppercase tracking-[.06em] text-ink">{gp.label}</span>
                {gp.add && (
                  <button onClick={gp.add.onAdd} className="cursor-pointer text-[9.5px] font-extrabold" style={{ color: gp.add.color }}>
                    {gp.add.label}
                  </button>
                )}
              </div>
            )}
            {gp.items.map((n) => {
              const active = tab === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => !n.locked && ctx.go(n.id)}
                  className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-left ${active ? 'bg-[#F1EEFE]' : ''} ${n.locked ? 'cursor-default' : 'cursor-pointer hover:bg-app'} ${n.indent ? 'pl-[30px]' : ''}`}
                >
                  <n.Icon size={15} strokeWidth={2.2} className={active ? 'text-primary-press' : n.locked ? 'text-[#C0BBD0]' : 'text-muted'} />
                  <span className={`flex-1 text-[13px] ${active ? 'font-extrabold text-primary-press' : n.locked ? 'font-semibold text-muted-faint' : 'font-semibold text-ink-soft'}`}>
                    {n.label}
                  </span>
                  {n.sub && <Check size={12} strokeWidth={3} className="text-green" />}
                  {!n.locked && n.count != null && (
                    <span className={`rounded-[7px] px-[7px] py-0.5 text-[10px] font-extrabold ${n.live ? 'bg-green-bg text-green-dark' : n.warn ? 'bg-amber-bg text-amber-ink' : 'bg-lilac-2 text-muted'}`}>
                      {n.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {isFree && (
          <div className="mt-2 rounded-card-sm p-3.5 text-white" style={{ background: 'linear-gradient(140deg,#6743E2,#8268FF)' }}>
            <div className="text-[12.5px] font-extrabold">{L('Desbloquea todo el kit', 'Unlock the full toolkit')}</div>
            <div className="mt-0.5 text-[10.5px] font-semibold leading-snug text-[rgba(255,255,255,.85)]">
              {L('Activa menú, reservas, productos y más. Insignia verificada y 5× más visibilidad.', 'Activate menu, bookings, products & more. Verified badge and 5× visibility.')}
            </div>
            <button onClick={() => ctx.go('billing')} className="mt-2 cursor-pointer rounded-[9px] bg-white px-3 py-1.5 text-[10.5px] font-extrabold text-primary-press">
              {L('Mejorar a Verified ›', 'Upgrade to Verified ›')}
            </button>
          </div>
        )}
      </nav>
    </div>
  );

  // Handoff mobile chrome: the top bar is DARK on Inicio/Insights and light with
  // a title elsewhere; desktop (lg+) keeps the light topbar + sidebar shell.
  const isInicio = tab === 'insights';

  return (
    <div className="flex min-h-screen flex-col bg-dash">
      {/* topbar */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-[8px] ${isInicio ? 'border-transparent bg-ink lg:border-hair lg:bg-[rgba(255,255,255,.95)]' : 'border-hair bg-[rgba(255,255,255,.95)]'}`}>
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 md:px-5">
          <button
            onClick={() => setDrawer(true)}
            className={`flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full lg:hidden ${isInicio ? 'bg-[rgba(255,255,255,.12)]' : 'bg-lilac-2'}`}
            aria-label={L('Menú', 'Menu')}
          >
            <Menu size={17} strokeWidth={2.2} className={isInicio ? 'text-white' : 'text-ink'} />
          </button>
          <button onClick={() => router.push('/comunidad')} className="flex cursor-pointer items-baseline">
            <span className={`text-[18px] font-extrabold tracking-[-.03em] ${isInicio ? 'text-white lg:text-ink' : 'text-ink'}`}>To&rsquo;</span>
            <span className={`text-[18px] font-extrabold tracking-[-.03em] ${isInicio ? 'text-amber lg:text-primary' : 'text-primary'}`}>Latino</span>
            <span className={`ml-1.5 text-[10.5px] font-bold md:hidden ${isInicio ? 'text-[rgba(255,255,255,.55)]' : 'text-muted'}`}>{L('Negocios', 'Business')}</span>
          </button>
          <span className="hidden rounded-full bg-lilac px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.04em] text-primary-dark md:inline">
            {L('Negocios', 'Business')}
          </span>
          <div className="mx-2 hidden min-w-0 max-w-[380px] flex-1 items-center gap-2 rounded-btn bg-app px-3 py-2 md:flex">
            <Search size={14} className="flex-none text-muted" strokeWidth={2.2} />
            <input placeholder={L('Ir a pedidos, productos…', 'Jump to orders, items…')} className="min-w-0 flex-1 bg-transparent text-[12.5px] font-medium outline-none placeholder:text-muted" />
          </div>
          <div className="ml-auto flex flex-none items-center gap-2">
            <button onClick={() => router.push('/negocios')} className="hidden cursor-pointer items-center gap-1.5 rounded-[10px] border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[11.5px] font-extrabold text-ink-soft md:flex">
              <ExternalLink size={12} strokeWidth={2.4} />
              {L('Ver listado', 'View public')}
            </button>
            <LangToggle mini />
            <button
              className={`relative flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full ${isInicio ? 'bg-[rgba(255,255,255,.12)] lg:bg-lilac-2' : 'bg-lilac-2'}`}
              aria-label={L('Notificaciones', 'Notifications')}
            >
              <Bell size={16} strokeWidth={2.2} className={isInicio ? 'text-white lg:text-ink' : 'text-ink'} />
              <span className="absolute right-0.5 top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-[9px] border-2 border-white bg-pink px-[3px] text-[8.5px] font-extrabold text-white">
                {isFree ? '2' : '7'}
              </span>
            </button>
            {bizAvatar('h-9 w-9 rounded-full text-[11px]')}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* desktop sidebar */}
        <aside className="sticky top-[58px] hidden h-[calc(100vh-58px)] lg:block">{sidebar}</aside>

        {/* mobile drawer */}
        {drawer && (
          <div className="fixed inset-0 z-40 flex lg:hidden" onClick={() => setDrawer(false)}>
            <div className="h-full" onClick={(e) => e.stopPropagation()}>
              {sidebar}
            </div>
            <div className="flex-1 bg-[rgba(30,27,46,.45)]" />
            <button onClick={() => setDrawer(false)} className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white shadow-card" aria-label={L('Cerrar', 'Close')}>
              <X size={16} strokeWidth={2.6} className="text-ink" />
            </button>
          </div>
        )}

        {/* content */}
        <main className="min-w-0 flex-1 px-3.5 pb-[96px] pt-4 md:px-6 md:pt-5 lg:pb-6">
          {/* Horario heads-up: holidays / special days starting today or tomorrow,
              across all the owner's businesses (see docs/LAUNCH-CHECKLIST.md for the
              push-notification follow-up). Shown on the dashboard home. */}
          {isInicio && (
            <HoursReminders
              businesses={admin.businesses}
              L={L}
              es={ctx.es}
              onOpenHours={(id) => { admin.setActive(id); ctx.go('hours'); }}
            />
          )}
          {/* identity card (handoff mobile Inicio) — business avatar + name + plan */}
          {isInicio && (
            <div className="mb-3.5 flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 shadow-card lg:hidden">
              {bizAvatar('h-[46px] w-[46px] rounded-[13px] text-[13px]')}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-extrabold text-ink">{bizName}</span>
                  {!isFree && <VerifiedBadge size={15} />}
                </span>
                <span className="block truncate text-[11px] font-semibold text-muted-2">{bizCategory}</span>
              </span>
              <span className="flex-none rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold" style={{ background: planPill.bg, color: planPill.c }}>
                {planPill.text}
              </span>
            </div>
          )}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[20px] font-extrabold tracking-[-.02em] text-ink md:text-[23px]">{head.title}</h1>
                {head.hasAccent && (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10.5px] font-extrabold text-muted shadow-[inset_0_0_0_1px_rgba(30,27,46,.08)]">
                    {head.accent}
                  </span>
                )}
              </div>
              <div className="mt-0.5 max-w-[640px] text-[12.5px] font-semibold text-muted">{head.sub}</div>
            </div>
            <div className="ml-auto flex flex-none items-center gap-2">
              {head.hasGhost && (
                <button className="hidden cursor-pointer rounded-[10px] border-[1.5px] border-lilac-line bg-white px-3.5 py-2 text-[12px] font-extrabold text-ink-soft md:block">
                  {head.ghost}
                </button>
              )}
              {!RICH_MODULES.has(tab) && (
                <button className="cursor-pointer rounded-[10px] bg-primary px-4 py-2 text-[12px] font-extrabold text-white shadow-cta-sm">
                  + {head.cta}
                </button>
              )}
            </div>
          </div>

          {/* demo plan switcher inside billing — lets you preview each tier when
              exploring without a real listing; a real business shows its own plan */}
          {tab === 'billing' && !real && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card-sm border border-hair bg-white p-3.5 shadow-card">
              <span className="text-[12px] font-extrabold text-ink">{L('Vista previa del plan:', 'Preview plan:')}</span>
              {(
                [
                  ['free', 'Free · $0'],
                  ['verified', 'Verified · $19/mo'],
                  ['premium', '✦ Premium · $49/mo'],
                ] as const
              ).map(([k, lab]) => (
                <button
                  key={k}
                  onClick={() => setDemoTier(k)}
                  className={`cursor-pointer rounded-full px-3.5 py-2 text-[11.5px] font-extrabold ${demoTier === k ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-2'}`}
                >
                  {lab}
                </button>
              ))}
            </div>
          )}

          {tab === 'insights' && (isFree ? <InsightsFree ctx={ctx} /> : <InsightsPaid ctx={ctx} />)}
          {tab === 'modules' && <ModulesSetup ctx={ctx} onToggle={toggleMod} />}
          {tab === 'updates' && <UpdatesModule ctx={ctx} />}
          {tab === 'billing' && <BillingModule ctx={ctx} tab={tab} />}
          {(tab === 'customers' || tab === 'orders' || tab === 'reviews') && <CustomersModule ctx={ctx} tab={tab} />}
          {(tab === 'staff' || tab === 'jobs') && <StaffModule ctx={ctx} tab={tab} />}
          {tab === 'rental' && <RentalModule ctx={ctx} tab={tab} />}
          {tab === 'events' && <EventsModule ctx={ctx} tab={tab} />}
          {(tab === 'products' || tab === 'shipping') && <ProductsModule ctx={ctx} tab={tab} />}
          {(tab === 'services' || tab === 'bookings') && <ServicesModule ctx={ctx} tab={tab} />}
          {tab === 'menu' && <FoodModule ctx={ctx} tab={tab} />}
          {tab === 'listing' && <ListingModule ctx={ctx} />}
          {tab === 'hours' && <HoursModule ctx={ctx} />}
          {tab === 'photos' && <PhotosModule ctx={ctx} />}
          {tab === 'related' && <RelatedModule ctx={ctx} />}
          {tab === 'settings' && <SettingsModule ctx={ctx} />}
          {tab === 'messages' && <MessagesModule ctx={ctx} />}
          {tab === 'payments' && <PaymentsModule ctx={ctx} />}
          {tab !== 'insights' && tab !== 'modules' && !RICH_MODULES.has(tab) && <GenericTab g={buildGeneric(tab, ctx)} ctx={ctx} />}
        </main>
      </div>

      {/* mobile bottom tabs (handoff): Inicio · Pedidos · Mensajes · Reseñas · Más */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-hair bg-white pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 lg:hidden">
        {(
          [
            ['insights', BarChart3, L('Inicio', 'Home'), null],
            ['orders', ShoppingBag, L('Pedidos', 'Orders'), isFree ? null : '12'],
            ['messages', MessageCircle, L('Mensajes', 'Messages'), null],
            ['reviews', Star, L('Reseñas', 'Reviews'), isFree ? null : '3'],
          ] as const
        ).map(([k, Icon, label, badge]) => {
          const active = tab === k;
          return (
            <button key={k} onClick={() => ctx.go(k)} className="relative flex min-h-[46px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5">
              <Icon size={19} strokeWidth={2.2} className={active ? 'text-primary' : 'text-muted-2'} />
              <span className={`text-[9px] font-extrabold ${active ? 'text-primary' : 'text-muted-2'}`}>{label}</span>
              {badge && (
                <span className="absolute right-[calc(50%-20px)] top-0 flex h-[14px] min-w-[14px] items-center justify-center rounded-[7px] border-[1.5px] border-white bg-pink px-[3px] text-[8px] font-extrabold text-white">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
        <button onClick={() => setDrawer(true)} className="flex min-h-[46px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5">
          <Menu size={19} strokeWidth={2.2} className={drawer ? 'text-primary' : 'text-muted-2'} />
          <span className={`text-[9px] font-extrabold ${drawer ? 'text-primary' : 'text-muted-2'}`}>{L('Más', 'More')}</span>
        </button>
      </nav>
    </div>
  );
}
