'use client';

// Business admin panel (`/negocio`) — Handoff v2 dashboard. Desktop ≥1024:
// fixed sidebar; mobile: drawer. Content varies by plan (Free/Verified/
// Premium) and rubro. Tab content: Insights + Module setup + the uniform
// module pages.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconChartBar as BarChart3, IconBell as Bell, IconBike as Bike, IconCheck as Check, IconChevronDown as ChevronDown, IconExternalLink as ExternalLink, IconMenu2 as Menu, IconMessageCircle as MessageCircle, IconPackage as Package, IconPlus as Plus, IconSearch as Search, IconShoppingBag as ShoppingBag, IconBuildingStore as Store, IconSpeakerphone as Megaphone, IconStar as Star, IconTicket as Ticket, IconToolsKitchen2 as Utensils, IconX as X } from '@tabler/icons-react';
import type { Icon as LucideIcon } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { supabase } from '@/lib/supabase';
import { useScrollLock } from '@/lib/scrollLock';
import { useBizAdmin, rubroFromCat } from '@/lib/bizAdmin';
import { useAuth } from '@/lib/auth';
import { CAT, type CatKey } from '@/lib/tiles';
import { LogoMark, VerifiedBadge } from '@/components/ui';
import { LangToggle } from '@/components/AppHeader';
import { CAT_INFO, activeMods, buildNav, pageHead, type Mods, type PanelCtx, type Rubro, type TabKey, type Tier } from '@/screens/negocio/tabs';
import { HoursReminders } from '@/screens/negocio/HoursReminders';
import { DashboardHome } from '@/screens/negocio/DashboardHome';
import { Estadisticas } from '@/screens/negocio/Estadisticas';
import { Promociones } from '@/screens/negocio/Promociones';
import { ModulesSetup } from '@/screens/negocio/ModulesSetup';
import { UpdatesModule } from '@/screens/negocio/modules/Updates';
import { BillingModule } from '@/screens/negocio/modules/Billing';
import { CustomersModule } from '@/screens/negocio/modules/Customers';
import { StaffModule } from '@/screens/negocio/modules/Staff';
import { RentalModule } from '@/screens/negocio/modules/Rental';
import { EventsModule } from '@/screens/negocio/modules/Events';
import { RealEstateModule } from '@/screens/negocio/modules/RealEstate';
import { AutosModule } from '@/screens/negocio/modules/Autos';
import { ProductsModule } from '@/screens/negocio/modules/Products';
import { FulfillmentModule } from '@/screens/negocio/modules/Fulfillment';
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
// wizards / sheets) — the panel hides its generic "+ CTA" row for these (each
// module owns its own actions). Every real tab is here, so the row never shows.
const RICH_MODULES = new Set<TabKey>([
  'stats',
  'listing', 'hours', 'photos', 'related', 'settings', 'messages', 'payments',
  'updates', 'billing', 'customers', 'orders', 'reviews', 'staff', 'jobs',
  'rental', 'events', 'inmuebles', 'vehiculos', 'products', 'fulfillment', 'shipping', 'drivers', 'services', 'bookings', 'menu', 'promos',
]);

const RUBRO_FROM_ONB: Record<string, Rubro> = {
  comida: 'restaurant', belleza: 'beauty', auto: 'auto', tiendas: 'retail', abarrotes: 'retail', deportes: 'rental',
};

// DEMO (no real listing) shows everything so the panel is fully explorable.
const DEFAULT_MODS: Mods = { menu: true, services: true, bookings: true, products: true, rental: true, events: true, inmuebles: true, vehiculos: true, updates: true, staff: true };
// A REAL business starts LISTING-ONLY: published & visible, but nothing to sell
// yet ("el listado es el master, vender es opcional"). The owner opts into
// commerce from "Vender en To'Latino". Non-commerce extras (updates/staff) keep
// their prior default so only selling is off by default. Stored modules override.
const LISTING_ONLY_MODS: Mods = { menu: false, services: false, bookings: false, products: false, rental: false, events: false, inmuebles: false, vehiculos: false, updates: true, staff: true };

// Valid ?t= values → the dashboard tab restored on refresh (keep in sync with TabKey).
const VALID_TABS = new Set<string>([
  'insights', 'stats', 'listing', 'photos', 'hours', 'related',
  'menu', 'services', 'bookings', 'products', 'fulfillment', 'shipping', 'drivers', 'rental', 'events', 'inmuebles', 'vehiculos',
  'customers', 'orders', 'messages', 'reviews', 'updates',
  'promos', 'payments', 'staff', 'jobs', 'modules', 'billing', 'settings',
]);

export function PanelScreen() {
  const { L } = useLang();
  const app = useApp();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>('insights');
  const tabInit = useRef(false);
  const reflectReady = useRef(false);
  // The active dashboard tab lives in the URL (/negocio?t=<tab>) so a refresh keeps
  // you on the same section instead of bouncing to Inicio. `tab` (React) mirrors it;
  // we replace (not push) so tab clicks don't spam browser history — refresh-safe
  // without hijacking the back button. `insights` (home) omits the param.
  useEffect(() => {
    if (tabInit.current || typeof window === 'undefined') return;
    tabInit.current = true;
    const t = new URLSearchParams(window.location.search).get('t');
    if (t && VALID_TABS.has(t)) setTab(t as TabKey);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!reflectReady.current) { reflectReady.current = true; return; } // skip mount so we don't strip ?t before restore
    const url = new URL(window.location.href);
    if (tab === 'insights') url.searchParams.delete('t'); else url.searchParams.set('t', tab);
    window.history.replaceState(window.history.state, '', url.toString());
  }, [tab]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => { const t = new URLSearchParams(window.location.search).get('t'); setTab(t && VALID_TABS.has(t) ? (t as TabKey) : 'insights'); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [photoCount, setPhotoCount] = useState<number | undefined>(undefined);
  // header: jump-to search + real notifications (avisos) bell
  const [jumpQ, setJumpQ] = useState('');
  const [jumpOpen, setJumpOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [avisos, setAvisos] = useState({ orders: 0, reviews: 0, messages: 0 });
  const admin = useBizAdmin();
  const { user } = useAuth();
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
  // Real notification counts for the header bell (new orders · unreplied reviews
  // · unread messages). Refetched on business switch and tab change so it stays
  // fresh after the owner acts. Demo → zeros (a real avisos bell, never faked).
  useEffect(() => {
    if (!real || admin.demo || !supabase) { setAvisos({ orders: 0, reviews: 0, messages: 0 }); return; }
    let cancelled = false;
    (async () => {
      const [o, r, c] = await Promise.all([
        supabase!.from('business_orders').select('id', { count: 'exact', head: true }).eq('business_id', real.id).eq('status', 'new'),
        supabase!.from('reviews').select('id', { count: 'exact', head: true }).eq('business_id', real.id).is('replied_at', null),
        supabase!.from('business_conversations').select('unread').eq('business_id', real.id),
      ]);
      if (cancelled) return;
      const msgs = ((c.data as Record<string, unknown>[]) ?? []).reduce((s, x) => s + (Number(x.unread ?? 0) > 0 ? 1 : 0), 0);
      setAvisos({ orders: o.count ?? 0, reviews: r.count ?? 0, messages: msgs });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo, tab]);

  const [drawer, setDrawer] = useState(false);
  useScrollLock(drawer);
  const [mods, setMods] = useState<Mods>(DEFAULT_MODS);

  // Load the real business's saved module config. A real business defaults to
  // LISTING-ONLY (selling off) with stored modules layered on top; demo shows all.
  useEffect(() => {
    setMods(real ? { ...LISTING_ONLY_MODS, ...(real.modules ?? {}) } : DEFAULT_MODS);
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
      isReal: !!real, reviewsCount: real ? (real.reviews_count ?? 0) : null,
      // A nav click clears the module sub-tab param (?sub=) synchronously — BEFORE
      // the target module mounts and reads it — so a sub-tab from the previous module
      // never leaks in (and re-clicking a module returns to its default sub-tab).
      // Refresh/back keep ?sub (they don't go through here → deep-link stays intact).
      go: (t) => {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          if (url.searchParams.has('sub')) { url.searchParams.delete('sub'); window.history.replaceState(window.history.state, '', url.toString()); }
        }
        setTab(t); setDrawer(false);
      },
    }),
    [L, tier, rubro, ci, isFree, isPremium, mods, photoCount, real],
  );

  const initialsOf = (n: string) => n.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'TL';
  const catLabel = (cat: string) => L(CAT[cat as CatKey]?.es ?? cat, CAT[cat as CatKey]?.en ?? cat);

  // Sin negocio real el panel no llega aquí (compuerta arriba). Los respaldos
  // fabricados ('Lupita’s Tortillería', ci.name/ci.area de CAT_INFO) se eliminan
  // para que ni una regresión pueda volver a mostrar un negocio que no existe.
  const bizName = real?.name ?? app.biz?.name ?? '';
  const bizInitials = real ? initialsOf(real.name) : initialsOf(app.biz?.name ?? '');
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
  const bizCategory = real ? catLabel(real.category_id) : L(ci.es, ci.en); // etiqueta del rubro (legítima), nunca un nombre inventado
  const bizArea = real ? (real.address || real.city || '') : '';
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

  // A real business shows its REAL rating + reviews (and '—' for untracked stats
  // like weekly views) — never the demo showcase numbers. Demo keeps the sample.
  const stats = real
    ? {
        rating: (real.reviews_count ?? 0) > 0 ? Number(real.rating).toFixed(1) : '—',
        s1v: '—', s1l: L('Vistas/sem', 'Views/wk'),
        s2v: String(real.reviews_count ?? 0), s2l: L('Reseñas', 'Reviews'),
      }
    : {
        rating: isFree ? '—' : '4.8',
        s1v: isFree ? '108' : '1,420', s1l: L('Vistas/sem', 'Views/wk'),
        s2v: isFree ? '12' : '284', s2l: isFree ? L('Visitas', 'Visits') : L('Seguidores', 'Followers'),
      };

  const nav = buildNav(ctx);
  const head = pageHead(tab, ctx);
  const am = activeMods(ctx);

  // Bottom nav (mobile) — v2 adapts to whether the business sells: a seller gets
  // the operational pair (Pedidos + its catalog); a listing-only business gets
  // the engagement set (Reseñas · Mensajes · Novedades). Legacy stays otherwise.
  const primaryCommerce: [TabKey, LucideIcon, string] | null =
    am.menu ? ['menu', Utensils, L('Menú', 'Menu')]
      : am.products ? ['products', Package, L('Productos', 'Products')]
        : am.services ? ['services', ci.svc, L('Servicios', 'Services')]
          : am.rental ? ['rental', Bike, L('Renta', 'Rental')]
            : am.events ? ['events', Ticket, L('Eventos', 'Events')] : null;
  const sells = !!primaryCommerce;
  const bottomItems: readonly (readonly [TabKey, LucideIcon, string, string | null])[] = sells
    ? [
        ['insights', BarChart3, L('Inicio', 'Home'), null],
        ['orders', ShoppingBag, L('Pedidos', 'Orders'), real || isFree ? null : '12'],
        [primaryCommerce![0], primaryCommerce![1], primaryCommerce![2], null],
        ['messages', MessageCircle, L('Mensajes', 'Messages'), null],
      ]
    : [
        ['insights', BarChart3, L('Inicio', 'Home'), null],
        ['reviews', Star, L('Reseñas', 'Reviews'), real || isFree ? null : '3'],
        ['messages', MessageCircle, L('Mensajes', 'Messages'), null],
        ['updates', Megaphone, L('Novedades', 'Updates'), null],
      ];

  // If the current tab's module got turned off, fall back to insights.
  if (tab in am && !(am as Record<string, boolean>)[tab] && !['insights'].includes(tab)) {
    // handled implicitly: nav locks it; keep simple.
  }

  // header "jump to" — flatten the nav into navigable destinations (skip locked)
  const jumpItems = (() => {
    const seen = new Set<TabKey>();
    const out: { id: TabKey; label: string }[] = [];
    for (const g of nav) for (const n of g.items) { if (n.locked || seen.has(n.id)) continue; seen.add(n.id); out.push({ id: n.id, label: n.label }); }
    return out;
  })();
  const jq = jumpQ.trim().toLowerCase();
  const jumpMatches = jq ? jumpItems.filter((x) => x.label.toLowerCase().includes(jq)).slice(0, 7) : [];

  // header bell — REAL notifications (demo shows a small sample so it's explorable)
  const bellRows: { tab: TabKey; label: string }[] = real
    ? [
        ...(sells && avisos.orders > 0 ? [{ tab: 'orders' as TabKey, label: L(`${avisos.orders} ${avisos.orders === 1 ? 'pedido nuevo' : 'pedidos nuevos'}`, `${avisos.orders} new order${avisos.orders === 1 ? '' : 's'}`) }] : []),
        ...(avisos.reviews > 0 ? [{ tab: 'reviews' as TabKey, label: L(`${avisos.reviews} ${avisos.reviews === 1 ? 'reseña sin responder' : 'reseñas sin responder'}`, `${avisos.reviews} review${avisos.reviews === 1 ? '' : 's'} to answer`) }] : []),
        ...(avisos.messages > 0 ? [{ tab: 'messages' as TabKey, label: L(`${avisos.messages} ${avisos.messages === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}`, `${avisos.messages} unread message${avisos.messages === 1 ? '' : 's'}`) }] : []),
      ]
    : admin.demo
      ? [{ tab: 'reviews' as TabKey, label: L('2 reseñas sin responder', '2 reviews to answer') }, { tab: 'orders' as TabKey, label: L('3 pedidos nuevos', '3 new orders') }]
      : [];
  const bellTotal = real ? (sells ? avisos.orders : 0) + avisos.reviews + avisos.messages : admin.demo ? 5 : 0;
  const ownPage = real?.slug ? `/negocios?b=${real.slug}` : '/negocios';

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
                          {on && <Check size={15} stroke={2.6} className="flex-none text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => { setSwitcherOpen(false); router.push('/negocio/publicar'); }}
                    className="flex w-full cursor-pointer items-center gap-2 border-t border-hair px-3 py-2.5 text-left text-[12px] font-extrabold text-primary-dark hover:bg-app"
                  >
                    <Plus size={14} stroke={2.6} /> {L('Publicar otro negocio', 'Publish another business')}
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
              <div className="flex items-center justify-between px-2 pb-1 pt-3.5">
                <span className="text-[10px] font-extrabold uppercase tracking-[.06em] text-muted-2">{gp.label}</span>
                {gp.add && (
                  <button onClick={gp.add.onAdd} className="cursor-pointer text-[9px] font-extrabold uppercase tracking-[.05em]" style={{ color: gp.add.color }}>
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
                  {n.sub && <Check size={12} stroke={3} className="text-green" />}
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

  // ── COMPUERTA (2026-07-29): sin negocio real NO se dibuja el tablero ──────
  // Antes el panel se renderizaba siempre y los módulos rellenaban con datos
  // fabricados (DashboardHome: 'Taquería La Esperanza', 4.8★, 128 reseñas). El
  // fundador se registró, quedó sin sesión por confirmar el correo, abrió
  // /negocio y creyó tener un negocio VERIFICADO asignado. Regla #8: nada
  // fabricado presentado como real. Ahora se dice la verdad y se ofrece la
  // acción correcta según el caso.
  if (!admin.loading && !real) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-dash px-6 py-12">
        <div className="w-full max-w-[380px] rounded-card border border-hair bg-white p-6 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
            <Store size={26} stroke={2.2} className="text-primary" />
          </span>
          {user ? (
            <>
              <h1 className="mt-4 text-[19px] font-extrabold tracking-[-.02em] text-ink">
                {L('Aún no tienes un negocio', "You don't have a business yet")}
              </h1>
              <p className="mt-1.5 text-[13px] font-medium leading-snug text-muted">
                {L('Publica tu negocio o actividad para que los vecinos te encuentren. Es gratis y toma unos minutos.',
                   'Publish your business or activity so neighbors can find you. It’s free and takes a few minutes.')}
              </p>
              <button
                onClick={() => router.push('/negocio/publicar')}
                className="mt-5 w-full cursor-pointer rounded-field bg-primary px-5 py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm"
              >
                {L('Publicar mi negocio', 'Publish my business')}
              </button>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-[19px] font-extrabold tracking-[-.02em] text-ink">
                {L('Inicia sesión para administrar tu negocio', 'Sign in to manage your business')}
              </h1>
              <p className="mt-1.5 text-[13px] font-medium leading-snug text-muted">
                {L('Entra con tu cuenta para ver tu panel: pedidos, reseñas, menú y estadísticas.',
                   'Sign in to see your dashboard: orders, reviews, menu and stats.')}
              </p>
              <button
                onClick={() => router.push('/entrar/?entrar=1')}
                className="mt-5 w-full cursor-pointer rounded-field bg-primary px-5 py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm"
              >
                {L('Iniciar sesión', 'Sign in')}
              </button>
              <button
                onClick={() => router.push('/negocio/publicar')}
                className="mt-2.5 w-full cursor-pointer rounded-field bg-lilac-2 px-5 py-3 text-[13.5px] font-extrabold text-primary-dark"
              >
                {L('Publicar un negocio nuevo', 'Publish a new business')}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-dash">
      {/* topbar */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-[8px] ${isInicio ? 'border-transparent bg-ink lg:border-hair lg:bg-[rgba(255,255,255,.95)]' : 'border-hair bg-[rgba(255,255,255,.95)]'}`}>
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 md:px-5">
          <button
            onClick={() => setDrawer(true)}
            className={`tap flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full lg:hidden ${isInicio ? 'bg-[rgba(255,255,255,.12)]' : 'bg-lilac-2'}`}
            aria-label={L('Menú', 'Menu')}
          >
            <Menu size={17} stroke={2.2} className={isInicio ? 'text-white' : 'text-ink'} />
          </button>
          <button onClick={() => router.push('/comunidad')} className="tap-y flex cursor-pointer items-baseline">
            <span className={`text-[18px] font-extrabold tracking-[-.03em] ${isInicio ? 'text-white lg:text-ink' : 'text-ink'}`}>To&rsquo;</span>
            <span className={`text-[18px] font-extrabold tracking-[-.03em] ${isInicio ? 'text-amber lg:text-primary' : 'text-primary'}`}>Latino</span>
            {/* En la pantalla de Inicio la cabecera es oscura en móvil y clara en
                escritorio, así que el logotipo cambia de tono con ella. */}
            <LogoMark size={16} color={isInicio ? '#F4B740' : '#7B61FF'} className="ml-1 self-center lg:hidden" />
            <LogoMark size={16} className="ml-1 hidden self-center lg:block" />
            <span className={`ml-1.5 text-[10.5px] font-bold md:hidden ${isInicio ? 'text-[rgba(255,255,255,.55)]' : 'text-muted'}`}>{L('Negocios', 'Business')}</span>
          </button>
          <span className="hidden rounded-full bg-lilac px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.04em] text-primary-dark md:inline">
            {L('Negocios', 'Business')}
          </span>
          <div className="relative mx-2 hidden min-w-0 max-w-[380px] flex-1 md:block">
            <div className="flex items-center gap-2 rounded-btn bg-app px-3 py-2">
              <Search size={14} className="flex-none text-muted" stroke={2.2} />
              <input
                value={jumpQ}
                onChange={(e) => { setJumpQ(e.target.value); setJumpOpen(true); }}
                onFocus={() => setJumpOpen(true)}
                onBlur={() => window.setTimeout(() => setJumpOpen(false), 160)}
                placeholder={L('Ir a pedidos, reseñas, menú…', 'Jump to orders, reviews, menu…')}
                className="min-w-0 flex-1 bg-transparent text-[12.5px] font-medium outline-none placeholder:text-muted"
              />
            </div>
            {jumpOpen && jumpMatches.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-card-sm border border-hair bg-white p-1.5 shadow-modal">
                {jumpMatches.map((m) => (
                  <button key={m.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { ctx.go(m.id); setJumpQ(''); setJumpOpen(false); }} className="flex w-full cursor-pointer items-center rounded-btn px-2.5 py-2 text-left hover:bg-app">
                    <span className="text-[12.5px] font-bold text-ink-soft">{m.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ml-auto flex flex-none items-center gap-2">
            <button onClick={() => router.push(ownPage)} className="hidden cursor-pointer items-center gap-1.5 rounded-[10px] border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[11.5px] font-extrabold text-ink-soft md:flex">
              <ExternalLink size={12} stroke={2.4} />
              {L('Ver mi página', 'View my page')}
            </button>
            <LangToggle mini />
            <div className="relative flex-none">
              <button
                onClick={() => setBellOpen((o) => !o)}
                className={`tap relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full ${isInicio ? 'bg-[rgba(255,255,255,.12)] lg:bg-lilac-2' : 'bg-lilac-2'}`}
                aria-label={L('Notificaciones', 'Notifications')}
                aria-expanded={bellOpen}
              >
                <Bell size={16} stroke={2.2} className={isInicio ? 'text-white lg:text-ink' : 'text-ink'} />
                {bellTotal > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-[9px] border-2 border-white bg-pink px-[3px] text-[8.5px] font-extrabold text-white">
                    {bellTotal}
                  </span>
                )}
              </button>
              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                  <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[262px] overflow-hidden rounded-card-sm border border-hair bg-white shadow-modal">
                    <div className="border-b border-hair px-3.5 py-2.5 text-[12px] font-extrabold text-ink">{L('Avisos', 'Alerts')}</div>
                    {bellRows.length > 0 ? (
                      <div className="p-1.5">
                        {bellRows.map((b, i) => (
                          <button key={i} onClick={() => { ctx.go(b.tab); setBellOpen(false); }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-btn px-2.5 py-2.5 text-left hover:bg-app">
                            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-lilac"><Bell size={13} stroke={2.4} className="text-primary-dark" /></span>
                            <span className="min-w-0 flex-1 text-[12px] font-bold text-ink-soft">{b.label}</span>
                            <span className="flex-none text-[11px] font-extrabold text-primary-dark">›</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3.5 py-5 text-center text-[12px] font-semibold text-muted">{L('Sin avisos nuevos', 'No new alerts')}</div>
                    )}
                  </div>
                </>
              )}
            </div>
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
            <button onClick={() => setDrawer(false)} className="tap absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white shadow-card" aria-label={L('Cerrar', 'Close')}>
              <X size={16} stroke={2.6} className="text-ink" />
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
          {/* page header row — the home (Inicio) owns its own header (DashboardHome) */}
          {!isInicio && (
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
          )}

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

          {tab === 'insights' && <DashboardHome ctx={ctx} />}
          {tab === 'stats' && <Estadisticas ctx={ctx} />}
          {tab === 'promos' && <Promociones ctx={ctx} />}
          {tab === 'modules' && <ModulesSetup ctx={ctx} onToggle={toggleMod} />}
          {tab === 'updates' && <UpdatesModule ctx={ctx} />}
          {tab === 'billing' && <BillingModule ctx={ctx} tab={tab} />}
          {(tab === 'customers' || tab === 'orders' || tab === 'reviews') && <CustomersModule ctx={ctx} tab={tab} />}
          {(tab === 'staff' || tab === 'jobs') && <StaffModule ctx={ctx} tab={tab} />}
          {tab === 'rental' && <RentalModule ctx={ctx} tab={tab} />}
          {tab === 'events' && <EventsModule ctx={ctx} tab={tab} />}
          {tab === 'inmuebles' && <RealEstateModule ctx={ctx} tab={tab} />}
          {tab === 'vehiculos' && <AutosModule ctx={ctx} tab={tab} />}
          {tab === 'products' && <ProductsModule ctx={ctx} tab={tab} />}
          {(tab === 'fulfillment' || tab === 'shipping' || tab === 'drivers') && <FulfillmentModule ctx={ctx} tab={tab} />}
          {(tab === 'services' || tab === 'bookings') && <ServicesModule ctx={ctx} tab={tab} />}
          {tab === 'menu' && <FoodModule ctx={ctx} tab={tab} />}
          {tab === 'listing' && <ListingModule ctx={ctx} />}
          {tab === 'hours' && <HoursModule ctx={ctx} />}
          {tab === 'photos' && <PhotosModule ctx={ctx} />}
          {tab === 'related' && <RelatedModule ctx={ctx} />}
          {tab === 'settings' && <SettingsModule ctx={ctx} />}
          {tab === 'messages' && <MessagesModule ctx={ctx} />}
          {tab === 'payments' && <PaymentsModule ctx={ctx} />}
        </main>
      </div>

      {/* mobile bottom tabs — adaptive (see bottomItems): seller vs listing-only */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-hair bg-white pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 lg:hidden">
        {bottomItems.map(([k, Icon, label, badge]) => {
          const active = tab === k;
          return (
            <button key={k} onClick={() => (isFree && k === 'orders' ? ctx.go('billing') : ctx.go(k))} className="relative flex min-h-[46px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5">
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
          <Menu size={19} stroke={2.2} className={drawer ? 'text-primary' : 'text-muted-2'} />
          <span className={`text-[9px] font-extrabold ${drawer ? 'text-primary' : 'text-muted-2'}`}>{L('Más', 'More')}</span>
        </button>
      </nav>
    </div>
  );
}
