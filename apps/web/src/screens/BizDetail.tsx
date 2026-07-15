'use client';

// Business detail (Handoff v2 → Cliente/Negocios): hero, meta, tabs
// (Overview · Updates · Menú · Tienda · Servicios · Eventos · Equipo ·
// Relacionados · Reseñas), cart + checkout, service booking, contact sheet.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IconCheck as Check, IconChevronDown as ChevronDown, IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight, IconClock as Clock, IconFlame as Flame, IconGlobe as Globe, IconHeart as Heart, IconHeartFilled as HeartFilled, IconMapPin as MapPin, IconMenu2 as Menu, IconMessageCircle as MessageCircle, IconMinus as Minus, IconDots as MoreHorizontal, IconNavigation as Navigation, IconPhone as Phone, IconPlus as Plus, IconSearch as Search, IconSend as Send, IconShare as Share, IconBuildingStore as Store, IconTrash as Trash2, IconX as X, IconHome2 as Home, IconHandStop as HandStop, IconBuildingCommunity as Building } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { useScrollLock } from '@/lib/scrollLock';
import { uploadPostImages } from '@/lib/image';
import { startConversation, fetchChatMessages, sendChatMessage, markConversationRead, subscribeChat, type ChatMsg } from '@/lib/chat';
import { useMyActivity, useOrderPoll } from '@/lib/myActivity';
import { Avatar, Card, Overlay, OverlayTitle, PrimaryBtn, Stars, VerifiedBadge } from '@/components/ui';
import { orderStageIdx, OrderStepsVertical } from '@/components/OrderSteps';
import { useUrlTab } from '@/lib/urlView';
import { bizTile, FEATURES_COMMON, FEATURES_BY_CAT, type Business } from '@/data/fixtures';
import { useSavedBiz } from '@/lib/savedBiz';
import { useAddresses } from '@/lib/addresses';
import { loadCart, saveCart, loadSaved, saveSaved } from '@/lib/cartStore';
import { startMarketplaceCheckout, startMarketplacePayment } from '@/lib/stripe';
import { CheckoutSheet } from '@/components/CheckoutSheet';
import { fetchBusinessPhotos, fetchBusinessBySlug, fetchBusinessMenu, fetchBusinessServices, fetchBusinessProducts, fetchBusinessRentals, fetchRentalBusy, fetchBookingLoad, fetchBookingBusy, fetchBusinessReviews, postReview, checkDeliveryRange, checkPromo, trackListingView, type PublicMenu, type PublicServices, type PubSvc, type PubProvider, type BookingBusy, type PublicShop, type PublicRentals, type PubRental, type PubReview } from '@/lib/live';
import { fetchBusinessRelations, type PublicRelation } from '@/lib/relations';
import { useNow } from '@/lib/useNow';
import { activeException, bizStatus, bookingSlots, fmtDayHours, fmtLong, fmtShort, statusLabel } from '@/lib/hours';
import { CAT, AVATAR_PALETTE } from '@/lib/tiles';

// es → en lookup for feature labels ("Lo que ofrece"), so the owner-selected
// `features` render bilingually; custom (approved) labels fall back to es.
const FEAT_EN: Record<string, string> = {};
for (const [es, en] of FEATURES_COMMON) FEAT_EN[es] = en;
for (const arr of Object.values(FEATURES_BY_CAT)) for (const [es, en] of arr) FEAT_EN[es] = en;
import { DETAIL_EVENTS, DETAIL_PHOTOS, MENU, OPTION_GROUPS, RENTAL, SEED_REVIEWS, SERVICES, SHOP, STAFF, UPDATE_POSTS, WEEK, type Bi, type MenuCat, type MenuItem, type OptionGroup } from '@/data/bizdetail';

type TabKey = 'overview' | 'updates' | 'menu' | 'shop' | 'services' | 'rentals' | 'events' | 'staff' | 'related' | 'reviews';
const TAB_KEYS = new Set<string>(['overview', 'updates', 'menu', 'shop', 'services', 'rentals', 'events', 'staff', 'related', 'reviews']);
type RentMode = 'day' | 'hour';

// Delivery-instruction presets (DoorDash-style): one dropoff preference + common
// detail toggles. Keys are stable; labels bilingual. The cart composes the
// selection + a free-text note into ONE `fulfillment.instructions` string.
const DROPOFF_OPTS = [
  { key: 'door', es: 'En la puerta', en: 'At the door', Icon: Home },
  { key: 'hand', es: 'En mano', en: 'Hand it to me', Icon: HandStop },
  { key: 'desk', es: 'En recepción', en: 'Front desk', Icon: Building },
] as const;
const INS_DETAILS = [
  { key: 'ring', es: 'Toca el timbre', en: 'Ring the bell' },
  { key: 'noring', es: 'No toques el timbre', en: "Don't ring the bell" },
  { key: 'call', es: 'Llámame al llegar', en: 'Call on arrival' },
  { key: 'dog', es: 'Cuidado con el perro', en: 'Beware of dog' },
] as const;
// Rental-calendar date helpers (local-day math on yyyy-mm-dd strings).
const isoDay = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const parseISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const spanDaysInc = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000) + 1;
const MO_LONG_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MO_LONG_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MO_SH_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MO_SH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AVAIL_EN: Record<string, string> = { 'Entre semana': 'Weekdays', 'Fines de semana': 'Weekends', '48h aviso': '48h notice', 'Siempre': 'Always' };
// Max seats-per-session from a capacity range string ('8–16'→16, '20+'→unlimited).
const capMaxOf = (cap: string): number => {
  if (cap.includes('+')) return 9999;
  const nums = (cap.match(/\d+/g) || []).map(Number);
  return nums.length ? Math.max(...nums) : 0; // 0 = untracked (no gating)
};
// Service duration string → minutes ("30 min", "1 h", "1 h 30 min", bare "45").
// Drives the length of each bookable slot; 30 min default when unparseable.
const parseDurMin = (dur: string | undefined): number => {
  if (!dur) return 30;
  const h = dur.match(/(\d+)\s*h/i);
  const m = dur.match(/(\d+)\s*m/i);
  let mins = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  if (!mins) { const n = dur.match(/\d+/); mins = n ? Number(n[0]) : 30; }
  return Math.max(15, mins || 30);
};
// Slots when the business has no weekly hours configured (booking on but hours
// unset): keep the old fixed offering so booking still works. 9am/12pm/3pm/6pm.
const FALLBACK_SLOTS = [540, 720, 900, 1080];
const WD_MON1: [string, string][] = [['L', 'M'], ['M', 'T'], ['X', 'W'], ['J', 'T'], ['V', 'F'], ['S', 'S'], ['D', 'S']];
const reviewWhen = (iso: string): Bi => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return ['hoy', 'today'];
  if (d === 1) return ['ayer', '1d'];
  if (d < 7) return [`hace ${d} d`, `${d}d`];
  const w = Math.floor(d / 7);
  return [`hace ${w} sem`, `${w}w`];
};

// `id` = business_items.id and `sel` = the structured add-on picks
// (group id + choice index) so the server can RE-PRICE the order from DB prices
// (never trust `unit`). Undefined only for offline fixture items (no real checkout).
type CartLine = { qty: number; name: string; unit: number; optsLabel: string; bg: string; note?: string; id?: string; sel?: { g: string; o: number }[]; img?: string; orig?: number };

// A normalized booking target for the service sheet (real service or fixture).
type SvcTarget = {
  name: string;
  descEs: string;
  descEn: string;
  price: number | null; // numeric → total math; null → quote/fixture
  priceType: 'fijo' | 'persona' | 'cotiza';
  priceLabel: Bi | null; // fixture's non-numeric price ("Desde $180")
  dur: string;
  bookable: boolean; // false → inquiry (no time slot, collects a lead)
  deposit: boolean;
  addons: PubSvc['addons'];
  id: string | null; // real service item id (null → fixture; no capacity gating)
  capMax: number; // seats per session (0 = untracked)
  tile: string; // striped tile for the detail-sheet header
  img?: string; // real photo (overrides the tile)
  days: string[]; // weekdays offered ('Lun'…'Dom'; empty = every open day)
  variant: PubSvc['variant']; // optional single-choice price variant (vehicle type…)
};

const initials = (name: string) =>
  name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function BizDetail({ b: bProp, all, onClose, onOpenOther }: { b: Business; all: Business[]; onClose: () => void; onOpenOther: (b: Business) => void }) {
  // The feed RPCs (businesses_near / search_businesses) don't carry the detail-
  // only fields (acceptsPayments, delivery offer, modules, contact…) — only
  // business_by_slug does. Hydrate on open so a listing opened FROM THE LIST
  // behaves exactly like a deep link: online payment, delivery, tabs, everything.
  const [hydrated, setHydrated] = useState<Business | null>(null);
  useEffect(() => {
    let cancelled = false;
    setHydrated(null);
    // demo fixtures (no live row) skip the fetch; live rows always re-fetch
    void fetchBusinessBySlug(bProp.slug).then((fresh) => {
      if (cancelled || !fresh) return;
      // keep the feed's identity + computed distance; take everything else fresh
      setHydrated({ ...bProp, ...fresh, id: bProp.id, dist: bProp.dist });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bProp.slug]);
  const b = hydrated ?? bProp;

  const { L } = useLang();
  const B = (pair: Bi) => L(pair[0], pair[1]);
  const app = useApp();
  const savedBiz = useSavedBiz();
  const act = useMyActivity();
  const { user, profile } = useAuth();
  const router = useRouter();
  const id = b.id;

  // Local confirmation toast (mirrors the customer Cuenta screen). Width-capped
  // + centered so it can never cause horizontal overflow on mobile.
  const [toast, setToast] = useState('');
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 1800);
  };

  // The active tab lives in the URL (?bt=) — refresh keeps you on the tab and
  // deep links work (Volver a pedir → ?b=<slug>&bt=menu).
  const [tab, setTab] = useUrlTab<TabKey>('bt', 'overview', (v) => TAB_KEYS.has(v));
  const [contactOpen, setContactOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatConvId, setChatConvId] = useState<string | null>(null);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [weekOpen, setWeekOpen] = useState(false);
  const [photoTile, setPhotoTile] = useState<string | null>(null);
  useScrollLock(!!photoTile); // full-screen photo viewer is a bespoke overlay (not <Overlay>)

  // Record a page view — every open counts (0077). Fire-and-forget, once per slug.
  useEffect(() => { trackListingView(b.slug); }, [b.slug]);

  // Real gallery photos for this listing (by slug). Empty → placeholder tiles.
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    setPhotos([]);
    fetchBusinessPhotos(b.slug).then((urls) => { if (!cancelled) setPhotos(urls); });
    return () => { cancelled = true; };
  }, [b.slug]);

  // Real menu (business_items + menu_config, migration 0045). Null → the Menú
  // tab keeps the sample fixtures so the prototype stays populated.
  const [realMenu, setRealMenu] = useState<PublicMenu | null>(null);
  const [menuFetched, setMenuFetched] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setRealMenu(null); setMenuFetched(false);
    fetchBusinessMenu(b.slug).then((m) => { if (!cancelled) { setRealMenu(m); setMenuFetched(true); } });
    return () => { cancelled = true; };
  }, [b.slug]);
  const menuCats = realMenu?.cats ?? MENU;
  // Owner-tagged "Popular" dishes across categories → the top section + purple chip.
  const menuPopular = menuCats.flatMap((c) => c.items.filter((it) => it.tag && it.tag[0] === 'Popular').map((item) => ({ catKey: c.key, item }))).slice(0, 8);
  // "Ordenar de nuevo" — DoorDash/Uber Eats' "Order it again": items THIS
  // customer has ordered before from THIS business, still on the current menu.
  // Matched by display name (either language — a past order may have been
  // placed in ES or EN) against order history, most-recent order first, deduped.
  const reorderItems: { catKey: string; item: MenuItem }[] = [];
  if (user) {
    const allMenuItems = menuCats.flatMap((c) => c.items.map((item) => ({ catKey: c.key, item })));
    const seen = new Set<string>();
    outer: for (const o of act.orders) {
      // Business.id is just the feed's array index, not the real Supabase id —
      // match by slug (stable + real on both the order's join and this business).
      // Skip cancelled orders — they never actually reached the customer.
      if (o.businesses?.slug !== b.slug || o.status === 'cancelled') continue;
      for (const oi of o.items) {
        const nm = oi.name.trim().toLowerCase();
        const match = allMenuItems.find((m) => m.item.n[0].toLowerCase() === nm || m.item.n[1].toLowerCase() === nm);
        if (!match || seen.has(match.item.n[0])) continue;
        seen.add(match.item.n[0]);
        reorderItems.push(match);
        if (reorderItems.length >= 8) break outer;
      }
    }
  }
  // Online card payment needs a connected Stripe account (`payOnline`, defined below).
  // WITHOUT it the seller still sells — orders are placed and paid CASH on delivery /
  // at pickup (no online charge, no fees). WITH it the buyer pays by card online. The
  // owner's own toggle (`ordering`/`selling`/…) is what makes a module catalog-only.
  // Display-only menu: ordering off → showcase (no cart). Cash orders still work.
  const menuDisplayOnly = realMenu != null && !realMenu.ordering;

  // Real services (business_items kind='service' + service_config, migration 0046).
  // Null → the Servicios tab keeps the sample fixtures so the prototype stays
  // populated. booking off → display-only (services + prices, no online Reservar).
  const [realServices, setRealServices] = useState<PublicServices | null>(null);
  const [svcFetched, setSvcFetched] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setRealServices(null); setSvcFetched(false);
    fetchBusinessServices(b.slug).then((s) => { if (!cancelled) { setRealServices(s); setSvcFetched(true); } });
    return () => { cancelled = true; };
  }, [b.slug]);
  const svcBooking = realServices?.booking ?? false;
  // Display-only services: booking off → showcase (no Reservar). Cash bookings still work.
  const svcDisplayOnly = realServices != null && !realServices.booking;
  // "Reagendar" deep link from Mi cuenta (?resched=<bookingId>): once services +
  // the user's bookings are in, open the booking sheet in reschedule mode for that
  // appointment's service, with its professional pre-selected. Consumed once —
  // the param is stripped so closing the sheet doesn't re-open it.
  const reschedDone = useRef(false);
  useEffect(() => {
    if (reschedDone.current || !realServices || act.loading) return;
    let id: string | null = null;
    try { id = new URLSearchParams(window.location.search).get('resched'); } catch { /* SSR */ }
    if (!id) return;
    reschedDone.current = true;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('resched');
      window.history.replaceState(window.history.state, '', url.toString());
    } catch { /* ignore */ }
    const bk = act.bookings.find((x) => x.id === id);
    if (!bk || !['pending', 'confirmed'].includes(bk.status)) return;
    const svc = realServices.cats.flatMap((c) => c.items).find((s) => s.id === bk.service_id);
    if (!svc || !svc.bookable) { flash(L('Este servicio ya no está disponible', 'This service is no longer available')); return; }
    openSvc(pubToTarget(svc), { staff: bk.staff_id ?? 'any', resched: bk.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realServices, act.loading, act.bookings]);

  // Real shop (business_items kind='product' + product_config, migration 0048).
  // Null → the Tienda tab keeps the sample fixtures. selling off → display-only
  // (products + prices, no cart). Cat keys are prefixed `sh:` (from the RPC).
  const [realShop, setRealShop] = useState<PublicShop | null>(null);
  const [shopFetched, setShopFetched] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setRealShop(null); setShopFetched(false);
    fetchBusinessProducts(b.slug).then((s) => { if (!cancelled) { setRealShop(s); setShopFetched(true); } });
    return () => { cancelled = true; };
  }, [b.slug]);
  const shopCats = realShop?.cats ?? SHOP;
  // Display-only shop: selling off → catalog (no cart). Cash orders still work.
  const shopDisplayOnly = realShop != null && !realShop.selling;

  // Real rentals (business_items kind='rental' + rental_config, migration 0050).
  // Null → the Renta tab keeps the sample fixtures. renting off → display-only
  // (items + rates, no online Rentar).
  const [realRentals, setRealRentals] = useState<PublicRentals | null>(null);
  const [rentFetched, setRentFetched] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setRealRentals(null); setRentFetched(false);
    fetchBusinessRentals(b.slug).then((s) => { if (!cancelled) { setRealRentals(s); setRentFetched(true); } });
    return () => { cancelled = true; };
  }, [b.slug]);
  const rentalItems: PubRental[] = realRentals?.items
    ?? RENTAL.map((r, i) => ({ id: `fx${i}`, n: r.n, d: r.d, tile: r.tile, hour: r.hour, day: r.day, week: r.week, dep: r.dep, addons: [], avail: '', stock: 1, unit: ['unidad', 'unit'] as Bi, catKey: '_', catName: ['Renta', 'Rentals'] as Bi }));
  // Display-only rentals: renting off → catalog (no Rentar). Cash rentals still work.
  const rentDisplayOnly = realRentals != null && !realRentals.renting;

  // Option groups for an item: per-item groups on a real menu / real shop (`sh:`
  // keys route to the shop); the per-category fixture groups otherwise.
  const groupsFor = (catKey: string, item: MenuItem) => {
    const key = `${catKey}::${item.n[0]}`;
    if (catKey.startsWith('sh:')) return realShop?.groups[key] ?? [];
    return realMenu ? realMenu.groups[key] ?? [] : OPTION_GROUPS[catKey] ?? [];
  };

  // Approved related listings (migration 0044). Empty offline / when none linked →
  // the tab falls back to nearby fixtures so the prototype stays populated.
  const [related, setRelated] = useState<PublicRelation[]>([]);
  useEffect(() => {
    let cancelled = false;
    setRelated([]);
    fetchBusinessRelations(b.slug).then((rows) => { if (!cancelled) setRelated(rows); });
    return () => { cancelled = true; };
  }, [b.slug]);
  // Open a related listing by slug — reuse the loaded list, else fetch by slug.
  const openRelated = async (slug: string) => {
    const inList = all.find((x) => x.slug === slug);
    if (inList) { onOpenOther(inList); onTab('overview'); return; }
    const fetched = await fetchBusinessBySlug(slug);
    if (fetched) { onOpenOther(fetched); onTab('overview'); }
  };
  const cover = photos[0] ?? null;
  // Lightbox holds either a real photo URL (http) or a placeholder gradient.
  const isUrl = (s: string) => /^https?:\/\//.test(s);

  // cart
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  // Cash order placed → the confirmation sheet tracks THIS order live (id from
  // placeOrder). '' = placed but id unknown (still shows the waiting state).
  const [doneOrderId, setDoneOrderId] = useState<string | null>(null);

  // ── Storefront (Tienda) browse state — Instacart/Walmart-grade shopping over
  // the real catalog: in-store search, category rail, Ofertas, sort, pagination.
  const [shopQ, setShopQ] = useState('');
  const [shopCat, setShopCat] = useState<string>('all'); // 'all' | 'sale' | sh:<catId>
  const [shopSort, setShopSort] = useState<'featured' | 'price_asc' | 'price_desc' | 'discount'>('featured');
  const [shopShown, setShopShown] = useState(24);
  useEffect(() => { setShopShown(24); }, [shopQ, shopCat, shopSort]);
  useEffect(() => { setShopQ(''); setShopCat('all'); setShopSort('featured'); setShopShown(24); }, [b.slug]);
  useOrderPoll(doneOrderId || null); // sheet advances even without the websocket
  const [itemModal, setItemModal] = useState<{ catKey: string; item: MenuItem } | null>(null);
  // Add-to-cart on a customizable item that's already in the cart is ambiguous —
  // ask instead of silently repeating/dropping a customization. addPrompt =
  // "+ tapped, item has ≥1 existing line" → same vs. customize fresh; removePrompt
  // = "trash/− tapped, 2+ DIFFERENT variants exist" → which one. `key` targets a
  // SPECIFIC cart line (the cart's per-line stepper); absent → the menu card's
  // stepper, which acts on the item's most-recent line.
  const [addPrompt, setAddPrompt] = useState<{ catKey: string; item: MenuItem; key?: string } | null>(null);
  const [removePrompt, setRemovePrompt] = useState<{ catKey: string; item: MenuItem } | null>(null);
  const [sheetAsk, setSheetAsk] = useState(false); // customize-sheet stepper: "+" on an addon item → igual/cambiar
  const [modalNote, setModalNote] = useState(''); // per-item special instructions (design: Item Detail)
  const [single, setSingle] = useState<Record<string, number>>({});
  const [multi, setMulti] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState(1);

  // services / events / updates / reviews
  // The booking sheet targets a normalized service (a real one, or a fixture) so
  // one modal serves both. `price` numeric → total math; `priceLabel` carries a
  // fixture's non-numeric price ("Desde $180"). bookable=false → inquiry (lead).
  const [svcSel, setSvcSel] = useState<SvcTarget | null>(null);
  const [svcSlotBusy, setSvcSlotBusy] = useState<Record<number, number>>({}); // slot epoch(ms) → seats already booked
  const [svcDate, setSvcDate] = useState(0);
  const [svcTime, setSvcTime] = useState(-1); // selected slot: minute-of-day (-1 = none yet)
  const [svcPersons, setSvcPersons] = useState(1);
  const [svcAddOns, setSvcAddOns] = useState<Record<string, boolean>>({});
  // Booking promo code — the business's own service_config promo, redeemed here
  // (server re-validates at checkout). Reset when the selected service changes.
  const [svcPromo, setSvcPromo] = useState<{ code: string; percent: number; label: string } | null>(null);
  const [svcDone, setSvcDone] = useState(false);
  // Booksy-grade booking state: the pre-booking service DETAIL sheet, the chosen
  // professional ('any' = first available), the price-variant index, a note to the
  // pro, the 14-day occupancy feed (per-staff, duration-aware), and — when arriving
  // via "Reagendar" from Mi cuenta — the booking id being MOVED instead of created.
  const [svcInfo, setSvcInfo] = useState<PubSvc | null>(null);
  const [svcStaff, setSvcStaff] = useState<string>('any');
  const [svcVar, setSvcVar] = useState(0);
  const [svcNote, setSvcNote] = useState('');
  const [svcBusy, setSvcBusy] = useState<BookingBusy[]>([]);
  const [svcResched, setSvcResched] = useState<string | null>(null);
  // Snapshot for the "¡Cita agendada!" confirmation card (survives sheet reset).
  const [svcDoneInfo, setSvcDoneInfo] = useState<{ name: string; when: string; staff: string; total: number; startISO: string; durMin: number; resched: boolean } | null>(null);
  const [rentIdx, setRentIdx] = useState<number | null>(null);
  const [rentMode, setRentMode] = useState<RentMode>('day');
  const [rentStart, setRentStart] = useState<string | null>(null); // yyyy-mm-dd
  const [rentEnd, setRentEnd] = useState<string | null>(null);
  const [rentHours, setRentHours] = useState(2);
  const [rentUnits, setRentUnits] = useState(1); // how many units to rent (≤ stock)
  const [rentAddons, setRentAddons] = useState<string[]>([]); // selected add-on ids
  // Rental promo code — the business's own rental_config promo (server re-validates).
  const [rentPromo, setRentPromo] = useState<{ code: string; percent: number; label: string } | null>(null);
  const [rentBusy, setRentBusy] = useState<Record<string, number>>({}); // yyyy-mm-dd → units already booked
  const [rentCal, setRentCal] = useState<{ y: number; m: number }>(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [rentDone, setRentDone] = useState(false);
  const [evIdx, setEvIdx] = useState<number | null>(null);
  const [evGoing, setEvGoing] = useState<Record<number, boolean>>({});
  const [updLikes, setUpdLikes] = useState<Record<number, boolean>>({});
  const [updOpen, setUpdOpen] = useState<Record<number, boolean>>({});
  const [reviewHelpful, setReviewHelpful] = useState<Record<string, boolean>>({});
  const [reviewFilter, setReviewFilter] = useState<'all' | '5' | '4' | '3'>('all');
  const [writeOpen, setWriteOpen] = useState(false);
  const [myStars, setMyStars] = useState(5);
  const [myText, setMyText] = useState('');
  const [myPhotos, setMyPhotos] = useState<{ file: File; url: string }[]>([]);
  const [revBusy, setRevBusy] = useState(false); // uploading + posting
  const reviewFileInput = useRef<HTMLInputElement>(null);
  const [myReviews, setMyReviews] = useState<{ id: string; stars: number; text: string; photos: string[] }[]>([]);
  // Real persisted reviews (migration 0056). Empty → the tab keeps the fixtures.
  const [realReviews, setRealReviews] = useState<PubReview[]>([]);
  const loadReviews = () => { void fetchBusinessReviews(b.slug).then(setRealReviews); };
  useEffect(() => { setRealReviews([]); setMyReviews([]); loadReviews(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [b.slug]);
  const MAX_REVIEW_PHOTOS = 6;
  const onPickReviewPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    setMyPhotos((list) => [...list, ...picked.slice(0, MAX_REVIEW_PHOTOS - list.length).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    e.target.value = ''; // allow re-picking the same file
  };
  const removeReviewPhoto = (i: number) =>
    setMyPhotos((list) => { URL.revokeObjectURL(list[i].url); return list.filter((_, j) => j !== i); });
  const clearReviewPhotos = () => setMyPhotos((list) => (list.forEach((p) => URL.revokeObjectURL(p.url)), []));

  const submitReview = async () => {
    const text = myText.trim();
    if (!text || revBusy) return;
    if (!user) { setWriteOpen(false); router.push('/entrar'); return; }
    setRevBusy(true);
    // compress + upload photos first (client-side WebP, own uid folder — lib/image)
    let urls: string[] = [];
    if (myPhotos.length) {
      try { urls = await uploadPostImages(myPhotos.map((p) => p.file), user.id); }
      catch { setRevBusy(false); flash(L('No se pudieron subir las fotos', "Couldn't upload photos")); return; }
    }
    const id = await postReview(b.slug, myStars, text, urls);
    setRevBusy(false);
    if (id) {
      clearReviewPhotos();
      setWriteOpen(false);
      setMyReviews([]);
      loadReviews();
      flash(L('¡Gracias por tu reseña!', 'Thanks for your review!'));
    } else flash(L('No se pudo publicar', "Couldn't post"));
  };

  const saved = savedBiz.isSaved(b.slug);
  // Saving is a discovery signal ("Guardados" in the owner's dashboard, 0077/0078)
  // — record it on SAVE only, never on un-save. Fire-and-forget; never blocks the tap.
  const toggleSave = () => { if (!saved) trackListingView(b.slug, 'save'); savedBiz.toggle(b.slug); };
  const now = useNow();
  const status = statusLabel(bizStatus(b.hours, now, b.open, b.hoursExceptions), L);
  const statusTone = status.tone === 'open' ? 'text-green' : status.tone === 'soon' ? 'text-amber-ink' : 'text-muted';
  // A date-specific override active today (holiday / vacation / weather) — shown
  // on the "Hoy" line so the special hours (or closure + reason) are explicit.
  const todayEx = now ? activeException(b.hoursExceptions, now) : null;
  const todayExText = todayEx
    ? todayEx.closed || todayEx.open == null || todayEx.close == null
      ? L('Cerrado', 'Closed')
      : `${fmtLong(todayEx.open)} – ${fmtLong(todayEx.close)}`
    : null;
  const catLabel = L(CAT[b.cat].es, CAT[b.cat].en);
  const revRaw = L(b.revEs, b.revEn);
  const [quote, rvName] = revRaw.includes('—') ? [revRaw.split('—')[0].trim(), revRaw.split('—').slice(1).join('—').trim()] : [revRaw, ''];
  // Real owner-entered contact (from the dashboard); demo fixtures fall back to
  // sample values so the prototype stays populated.
  const phone = b.phone || '(832) 555-4521';
  const address = b.address || '5821 Bellaire Blvd, Houston, TX';
  // "Cómo llegar" deep link: opens the visitor's own maps app (no API key / no
  // billing — the no-Google-Maps rule is about our tile/geocoding API calls, not
  // a free universal directions link). Destination = the owner's address + city.
  const mapsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([b.address, b.city].filter(Boolean).join(', ') || address)}`;

  // Message channel (opt-in from the dashboard). Uses a separate messaging number
  // when the owner set one, else the main phone. Build a functional link: WhatsApp
  // needs an international number (assume US when 10 digits), SMS opens the native
  // texting app. Only enabled when the owner opted in + a number exists.
  const msgDigits = (b.messagePhone || b.phone || '').replace(/\D/g, '');
  const intlDigits = msgDigits.length === 10 ? `1${msgDigits}` : msgDigits;
  const msgOn = !!b.acceptsMessages && msgDigits.length > 0;
  const msgIsSms = b.messageChannel === 'sms';
  const msgHref = msgIsSms ? `sms:+${intlDigits}` : `https://wa.me/${intlDigits}`;

  // In-app chat (buyer ↔ seller, migration 0053).
  const custName = profile?.display_name ?? (user?.email ? user.email.split('@')[0] : 'Cliente');
  const custInitials = custName.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'TÚ';
  const openChat = async () => {
    setContactOpen(false);
    if (!user) { router.push('/entrar'); return; }
    setChatOpen(true); setChatBusy(true); setChatMsgs([]);
    const id = await startConversation(b.slug, custName, custInitials, '#7B61FF');
    setChatConvId(id);
    if (id) { const m = await fetchChatMessages(id); setChatMsgs(m); markConversationRead(id, 'customer'); }
    setChatBusy(false);
  };
  const sendChat = async () => {
    const body = chatDraft.trim();
    if (!body || !chatConvId || chatBusy) return;
    setChatDraft('');
    const m = await sendChatMessage(chatConvId, false, body);
    if (m) setChatMsgs((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]));
    else { setChatDraft(body); flash(L('No se pudo enviar', "Couldn't send")); }
  };
  useEffect(() => {
    if (!chatOpen || !chatConvId) return;
    return subscribeChat(chatConvId, (m) => setChatMsgs((l) => (l.some((x) => x.id === m.id) ? l : [...l, m])));
  }, [chatOpen, chatConvId]);
  useEffect(() => { if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs, chatOpen]);

  const cartCount = Object.values(cart).reduce((n, l) => n + l.qty, 0);
  const cartTotal = Object.values(cart).reduce((n, l) => n + l.qty * l.unit, 0);
  // Store cart (Amazon-style) when every line comes from the Tienda tab; a food
  // (or mixed) cart keeps the DoorDash layout that already works great for it.
  const storeCart = cartCount > 0 && Object.keys(cart).every((k) => k.startsWith('sh:'));
  // Total sale savings across lines bought at a compare-at discount.
  const cartSavings = +Object.values(cart).reduce((n, l) => n + (l.orig && l.orig > l.unit ? (l.orig - l.unit) * l.qty : 0), 0).toFixed(2);
  // ---- DoorDash-grade checkout ------------------------------------------------
  // When the seller has connected Stripe (acceptsPayments) the buyer pays online by
  // card and the displayed Total EXACTLY matches the Stripe charge: subtotal + 5%
  // service fee (+ the business's own delivery fee + tip on delivery orders).
  // WITHOUT Stripe the seller still sells — the buyer pays CASH on delivery or at
  // pickup (subtotal + the delivery fee, no service fee, no online tip).
  const payOnline = !!b.acceptsPayments;
  const del = b.delivery; // the business's real delivery offer (fee / min / prep)
  // Delivery is offered whenever the business turned it on — cash-on-delivery works
  // without Stripe (the customer pays the driver in cash).
  const deliveryAvailable = !!del?.on;
  const [orderChannel, setOrderChannel] = useState<'pickup' | 'delivery'>('pickup');
  const isDelivery = deliveryAvailable && orderChannel === 'delivery';
  const [cartView, setCartView] = useState<'cart' | 'address'>('cart');
  const [addrId, setAddrId] = useState<string | null>(null);
  // Delivery instructions — DoorDash-style: a dropoff preference (single) + common
  // detail chips (multi) + a free-text note. All three compose into ONE readable
  // string sent as `fulfillment.instructions` (no backend change). `instructions`
  // holds only the custom note.
  const [dropoff, setDropoff] = useState<'door' | 'hand' | 'desk'>('door');
  const [insDetails, setInsDetails] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const toggleDetail = (k: string) => setInsDetails((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
  // Driver-tip policy is the BUSINESS's own (del.tips) — opt-in, presets + mode set
  // by the owner. tipSel holds the selected preset VALUE (a % or a $ per the mode).
  const tipCfg = del?.tips;
  const [tipSel, setTipSel] = useState<number>(0);    // 0 = no tip
  const [tipCustom, setTipCustom] = useState('');     // dollars when "Otra"
  const [customTipOn, setCustomTipOn] = useState(false);
  // Business's own promo code (server-validated via check_promo). We keep the %
  // and recompute the discount off the live subtotal; the server re-validates.
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; percent: number; label: string } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoErr, setPromoErr] = useState('');
  const [paying, setPaying] = useState(false);
  // On-site checkout (Stripe Payment Element) — set when a PaymentIntent is ready.
  const [checkout, setCheckout] = useState<{ clientSecret: string; pendingId: string; amount: number; returnPath: string } | null>(null);
  const addressStore = useAddresses();
  const chosenAddr = addressStore.addresses.find((a) => a.id === addrId)
    ?? addressStore.addresses.find((a) => a.is_default)
    ?? addressStore.addresses[0];

  // When the delivery-only address modal returns a picked/added address, select
  // it for THIS cart (local `addrId` only) — it never touched the global city.
  useEffect(() => {
    if (!app.deliveryAddrId) return;
    setAddrId(app.deliveryAddrId);
    setCartView('cart');
    app.setDeliveryAddr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.deliveryAddrId]);

  const deliveryFee = isDelivery ? (del?.fee ?? 0) : 0;
  const serviceFee = payOnline && cartCount > 0 ? +(cartTotal * 0.05).toFixed(2) : 0;
  // The tip option shows only when: paying by card (cash tips go to the driver in
  // hand), it's a delivery order, the OWNER enabled tips, and the order meets the
  // owner's minimum. Preset value → dollars depends on the owner's mode (%/fixed).
  const tipsEnabled = isDelivery && payOnline && !!tipCfg?.on && cartTotal >= (tipCfg?.minOrder ?? 0);
  const presetTip = tipCfg?.mode === 'amount' ? tipSel : +(cartTotal * tipSel / 100).toFixed(2);
  const tip = tipsEnabled ? (customTipOn ? Math.max(0, Math.min(500, parseFloat(tipCustom) || 0)) : presetTip) : 0;
  // The business's promo discount (its % off the goods) — recomputed off the live
  // subtotal; the server re-validates the code at checkout. The business funds it.
  const discount = promo ? Math.min(cartTotal, +(cartTotal * promo.percent / 100).toFixed(2)) : 0;
  const grandTotal = +(cartTotal + serviceFee + deliveryFee + tip - discount).toFixed(2);
  const belowMin = isDelivery && cartTotal < (del?.min ?? 0);

  // Delivery-radius gate: when the owner set a radius (del.radius, miles) and a
  // delivery address is chosen, ask PostGIS (delivery_range_check, 0076) whether
  // it's inside. Out of range → warning card + Pagar disabled; switching address
  // or to Recoger clears it. Fail-open on RPC errors / no radius / no geocode —
  // "can't verify" must never block a paying customer.
  const [rangeCheck, setRangeCheck] = useState<{ addrId: string; inRange: boolean; distanceMi: number | null; radiusMi: number | null } | null>(null);
  useEffect(() => {
    if (!isDelivery || !chosenAddr || !del?.radius) { setRangeCheck(null); return; }
    let cancelled = false;
    const addrId = chosenAddr.id;
    checkDeliveryRange(b.slug, chosenAddr.lat, chosenAddr.lng).then((r) => {
      if (cancelled || !r) return;
      setRangeCheck({ addrId, inRange: r.inRange, distanceMi: r.distanceMi, radiusMi: r.radiusMi });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDelivery, chosenAddr?.id, b.slug, del?.radius]);
  const outOfRange = isDelivery && rangeCheck != null && rangeCheck.addrId === chosenAddr?.id && !rangeCheck.inRange;

  const money = (n: number) => `$${n.toFixed(2)}`;

  // Default to delivery when the business offers it (DoorDash's default).
  useEffect(() => {
    if (deliveryAvailable) setOrderChannel('delivery');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryAvailable, b.slug]);
  // Preselect the owner's suggested tip when the business (its tip policy) loads.
  useEffect(() => {
    setTipSel(tipCfg?.def ?? 0);
    setCustomTipOn(false);
    setTipCustom('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.slug, tipCfg?.def, tipCfg?.mode]);
  // Clear any applied promo when switching businesses.
  useEffect(() => { setPromo(null); setPromoInput(''); setPromoErr(''); }, [b.slug]);
  // Reset the booking/rental promo when the selected service/rental item changes.
  useEffect(() => { setSvcPromo(null); }, [svcSel?.id, svcSel?.name]);
  useEffect(() => { setRentPromo(null); }, [rentIdx]);

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code || promoBusy) return;
    setPromoBusy(true); setPromoErr('');
    const r = await checkPromo(b.slug, code, cartTotal);
    setPromoBusy(false);
    if (r.ok) { setPromo({ code: code.toUpperCase(), percent: r.percent, label: r.label }); setPromoErr(''); }
    else { setPromo(null); setPromoErr(L('Código no válido para este pedido', 'Code not valid for this order')); }
  };
  const clearPromo = () => { setPromo(null); setPromoInput(''); setPromoErr(''); };

  // Compose the delivery-instruction picks into ONE readable string for the driver
  // (dropoff preference · detail chips · free note), in the customer's language.
  // Always carries the dropoff preference (default "En la puerta"), like DoorDash.
  const composeInstructions = () => {
    const d = DROPOFF_OPTS.find((o) => o.key === dropoff);
    return [
      d ? L(d.es, d.en) : '',
      ...INS_DETAILS.filter((x) => insDetails.includes(x.key)).map((x) => L(x.es, x.en)),
      instructions.trim(),
    ].filter(Boolean).join(' · ').slice(0, 300);
  };

  // Route the current cart to Stripe (destination charge → seller's account minus
  // the To'Latino fee). The order is created by the webhook once payment lands.
  const payCart = async () => {
    if (!user) { router.push('/entrar'); return; }
    if (cartCount === 0 || paying || belowMin || outOfRange) return;
    if (isDelivery && !chosenAddr) { setCartView('address'); return; }
    setPaying(true);
    const items = Object.values(cart).map((l) => ({
      // id + sel let the server RE-PRICE from DB prices; name/price/opts are for
      // the order record + display only (the server recomputes what's charged).
      id: l.id, sel: l.sel ?? [],
      name: l.name, qty: l.qty, price: l.unit,
      opts: [l.optsLabel, l.note ? `📝 ${l.note}` : ''].filter(Boolean).join(' · ') || undefined,
    }));
    // On-site payment: get a PaymentIntent and open our own branded checkout sheet
    // (Stripe Payment Element) instead of redirecting to Stripe's hosted page.
    const { clientSecret, pendingId, amount, error } = await startMarketplacePayment({
      kind: 'order', slug: b.slug, items,
      channel: isDelivery ? 'delivery' : 'pickup',
      ...(isDelivery && chosenAddr ? { address: { formatted: chosenAddr.formatted, label: chosenAddr.label ?? undefined } } : {}),
      ...(isDelivery ? { instructions: composeInstructions() } : {}),
      ...(tip > 0 ? { tip } : {}),
      ...(promo ? { promo: promo.code } : {}),
    });
    setPaying(false);
    if (clientSecret && pendingId) {
      setCartOpen(false);
      setCheckout({ clientSecret, pendingId, amount: amount ?? Math.round(grandTotal * 100), returnPath: typeof window !== 'undefined' ? window.location.pathname : '/negocios/' });
      return;
    }
    // The caller now surfaces the function's REAL reason (invoke() used to hide
    // 4xx bodies, so every rejection looked like the same generic failure).
    const PAY_ERR: Record<string, [string, string]> = {
      seller_not_payable: ['Este negocio aún no acepta pagos en línea', 'This business does not accept online payments yet'],
      below_minimum: ['No llegas al mínimo para entrega', "You haven't reached the delivery minimum"],
      address_required: ['Agrega tu dirección de entrega', 'Add your delivery address'],
      no_delivery: ['Este negocio no está haciendo entregas ahora', 'This business is not delivering right now'],
      item_unavailable: ['Un artículo de tu carrito ya no está disponible', 'An item in your cart is no longer available'],
      auth: ['Tu sesión expiró — inicia sesión de nuevo', 'Your session expired — sign in again'],
      network: ['Sin conexión. Revisa tu internet e intenta de nuevo', 'No connection. Check your internet and try again'],
    };
    const msg = PAY_ERR[error ?? ''];
    flash(msg ? L(msg[0], msg[1]) : L('No se pudo iniciar el pago — intenta de nuevo', 'Could not start payment — try again'));
  };

  // Pay-on-pickup order (seller without online payments): persist a real order.
  const placeCart = async () => {
    if (!user) { router.push('/entrar'); return; }
    if (cartCount === 0 || paying || belowMin || outOfRange) return;
    if (isDelivery && !chosenAddr) { setCartView('address'); return; }
    setPaying(true);
    const items = Object.values(cart).map((l) => ({ name: l.name, qty: l.qty, price: l.unit, opts: [l.optsLabel, l.note ? `📝 ${l.note}` : ''].filter(Boolean).join(' · ') || undefined }));
    // Cash order — same fulfillment shape a paid delivery order gets, so the seller's
    // Cocina shows the address + amount-to-collect. `payment:'cash'` flags it so the
    // seller knows to collect on delivery/pickup (not prepaid). No online fees/tip.
    const fulfillment: Record<string, unknown> = {
      payment: 'cash', subtotal: +cartTotal.toFixed(2), service_fee: 0, tip: 0,
      delivery_fee: isDelivery ? deliveryFee : 0, collect_total: grandTotal,
      ...(discount > 0 && promo ? { promo: promo.code, discount: +discount.toFixed(2) } : {}),
      ...(isDelivery && chosenAddr
        ? { address: chosenAddr.formatted, address_label: chosenAddr.label ?? undefined, dispatch: 'unassigned', eta_range: del?.prep ? `${del.prep}–${del.prep + 15} min` : '30–45 min' }
        : {}),
      ...(isDelivery ? { instructions: composeInstructions() } : {}),
    };
    const { error, id } = await act.placeOrder(b.slug, items, grandTotal, isDelivery ? 'delivery' : 'pickup', fulfillment);
    setPaying(false);
    if (error) { flash(L('No se pudo enviar el pedido', 'Could not place order')); return; }
    setCart({}); // order placed → empty the cart (clears its saved copy too)
    setDoneOrderId(id ?? '');
  };

  // Default single-option selections for a customize sheet: first in-stock value
  // per single group (index 0 when not per-variant tracked). Shared by openItem
  // (first open) and the sheet's "Cambiar algo" reset (build another variant).
  const freshSingles = (catKey: string, item: MenuItem) => {
    const groups = groupsFor(catKey, item);
    const s: Record<string, number> = {};
    groups.forEach((g) => {
      if (g.type !== 'single') return;
      let idx = 0;
      if (item.variantStock) {
        const found = g.choices.findIndex((_, i) => { const st = variantStockAt(item, groups, s, g.id, i); return st == null || st > 0; });
        idx = found >= 0 ? found : 0;
      }
      s[g.id] = idx;
    });
    return s;
  };

  const openItem = (catKey: string, item: MenuItem) => {
    if (shopStock(catKey, item) === 0) { flash(L('Agotado', 'Sold out')); return; }
    setSingle(freshSingles(catKey, item));
    setMulti({});
    setQty(1);
    setModalNote('');
    setItemModal({ catKey, item });
  };

  // Shop products track inventory; menu items don't. Returns units left, or null
  // (untracked → no gating).
  const shopStock = (catKey: string, it: MenuItem) => (catKey.startsWith('sh:') && typeof it.stock === 'number' ? it.stock : null);

  // Per-variant stock (attrs.variantStock, keyed `setId:idx|…`). The key is built
  // from the SINGLE option groups' selected indices — the same string the owner's
  // editor writes. Returns units left for a selection, or null when this product
  // doesn't track per-variant (fall back to product-level shopStock). `override`
  // swaps one axis' value so we can ask "what if they pick this instead?".
  const variantKeyWith = (groups: OptionGroup[], sel: Record<string, number>, overrideId?: string, overrideIdx?: number) =>
    groups.filter((g) => g.type === 'single').map((g) => `${g.id}:${g.id === overrideId ? overrideIdx : (sel[g.id] ?? 0)}`).join('|');
  const variantStockAt = (it: MenuItem, groups: OptionGroup[], sel: Record<string, number>, overrideId?: string, overrideIdx?: number): number | null => {
    if (!it.variantStock) return null;
    const k = variantKeyWith(groups, sel, overrideId, overrideIdx);
    return k in it.variantStock ? it.variantStock[k] : null;
  };

  const addSimple = (catKey: string, item: MenuItem) => {
    const key = `${catKey}:${B(item.n)}`;
    const stk = shopStock(catKey, item);
    if (stk != null) {
      if (stk <= 0) { flash(L('Agotado', 'Sold out')); return; }
      if ((cart[key]?.qty ?? 0) >= stk) { flash(L('No hay más unidades', 'No more units available')); return; }
    }
    setCart((c) => ({ ...c, [key]: { qty: (c[key]?.qty ?? 0) + 1, name: B(item.n), unit: item.price, optsLabel: '', bg: item.bg, id: item.id, sel: [], img: item.img, orig: item.orig && item.orig > item.price ? item.orig : undefined } }));
  };

  // `keepOpen`: after adding, don't close the sheet — reset it to fresh defaults
  // so the customer can build ANOTHER, different variant without leaving (the
  // sheet stepper's "Cambiar algo"). Default closes the sheet as before.
  const addFromModal = (keepOpen = false) => {
    if (!itemModal) return;
    const groups = groupsFor(itemModal.catKey, itemModal.item);
    let add = 0;
    const chosen: string[] = [];
    const sel: { g: string; o: number }[] = [];
    groups.forEach((g) =>
      g.choices.forEach((ch, i) => {
        const on = g.type === 'single' ? single[g.id] === i : !!multi[`${g.id}:${i}`];
        if (on) {
          add += ch.price;
          chosen.push(B(ch.label));
          sel.push({ g: g.id, o: i }); // structured pick → server re-prices from DB
        }
      }),
    );
    const unit = itemModal.item.price + add;
    const note = modalNote.trim().slice(0, 200);
    const key = `${itemModal.catKey}:${B(itemModal.item.n)}|${chosen.join(',')}${note ? `|${note}` : ''}`;
    const inCart = cart[key]?.qty ?? 0;
    const vstk = variantStockAt(itemModal.item, groups, single);
    if (vstk != null) {
      if (vstk <= 0) { flash(L('Esa variante está agotada', 'That variant is sold out')); return; }
      if (inCart + qty > vstk) { flash(L('No hay suficientes unidades de esa variante', 'Not enough of that variant in stock')); return; }
    } else {
      const stk = shopStock(itemModal.catKey, itemModal.item);
      if (stk != null && inCart + qty > stk) { flash(L('No hay suficientes unidades', 'Not enough units in stock')); return; }
    }
    setCart((c) => ({ ...c, [key]: { qty: (c[key]?.qty ?? 0) + qty, name: B(itemModal.item.n), unit, optsLabel: chosen.join(', '), bg: itemModal.item.bg, note: note || undefined, id: itemModal.item.id, sel, img: itemModal.item.img, orig: itemModal.item.orig && itemModal.item.orig > unit ? itemModal.item.orig : undefined } }));
    if (keepOpen) {
      // stay in the sheet, reset to defaults for the next (different) variant
      setSingle(freshSingles(itemModal.catKey, itemModal.item));
      setMulti({});
      setQty(1);
      setModalNote('');
    } else {
      setItemModal(null);
    }
  };

  const incLine = (k: string) => setCart((c) => ({ ...c, [k]: { ...c[k], qty: c[k].qty + 1 } }));
  const decLine = (k: string) =>
    setCart((c) => {
      const q = c[k].qty - 1;
      const n = { ...c };
      if (q <= 0) delete n[k];
      else n[k] = { ...n[k], qty: q };
      return n;
    });

  // Map a cart-line key back to the (catKey, MenuItem) that owns it. Line keys are
  // `${catKey}:${name}` or `${catKey}:${name}|opts…`, so an item owns the line
  // when its simpleKey is the whole key or its `|`-prefixed head. Used by the
  // cart's per-line stepper to know if a line is customizable (has addons) and,
  // for "Cambiar algo", to reopen the sheet for a different variant.
  const lineOwner = (k: string): { catKey: string; item: MenuItem } | null => {
    for (const c of [...menuCats, ...shopCats]) {
      for (const it of c.items) {
        const simpleKey = `${c.key}:${B(it.n)}`;
        if (k === simpleKey || k.startsWith(`${simpleKey}|`)) return { catKey: c.key, item: it };
      }
    }
    return null;
  };
  // Cart per-line "+": on a customizable line (item has addon groups), ask
  // igual/cambiar just like the menu card; simple lines increment directly.
  const incCartLine = (k: string) => {
    const owner = lineOwner(k);
    if (owner && groupsFor(owner.catKey, owner.item).length > 0) {
      setAddPrompt({ catKey: owner.catKey, item: owner.item, key: k });
      return;
    }
    incLine(k);
  };

  // --- Cart persistence (localStorage, 24h TTL) ---------------------------
  // Keep the in-progress cart across leaving/returning to the listing (like
  // DoorDash/Uber Eats). On return we REVALIDATE against the live menu/shop so a
  // sold-out or removed item can't linger: an item that's gone from the menu is
  // dropped, an out-of-stock product is dropped, and a qty above what's left is
  // capped. Expires 24h after the last edit.
  const restoredRef = useRef<string | null>(null);
  const revalidateCart = (saved: Record<string, CartLine>): { cart: Record<string, CartLine>; changed: boolean } => {
    const out: Record<string, CartLine> = {};
    let changed = false;
    for (const [k, line] of Object.entries(saved)) {
      const owner = lineOwner(k);
      if (!owner) { changed = true; continue; }                       // item no longer on the menu → drop
      const groups = groupsFor(owner.catKey, owner.item);
      // Per-variant (SKU) stock if tracked, else product-level stock; menu items
      // that don't track stock return null → always available (86'd items are
      // already excluded from the fetched menu, so lineOwner drops them above).
      let avail: number | null = null;
      if (owner.item.variantStock) {
        const singleSel: Record<string, number> = {};
        for (const s of line.sel ?? []) { const g = groups.find((gg) => gg.id === s.g); if (g?.type === 'single') singleSel[s.g] = s.o; }
        avail = variantStockAt(owner.item, groups, singleSel);
      }
      if (avail == null) avail = shopStock(owner.catKey, owner.item);
      if (avail != null) {
        if (avail <= 0) { changed = true; continue; }                 // sold out → drop
        if (line.qty > avail) { out[k] = { ...line, qty: avail }; changed = true; continue; } // cap to what's left
      }
      out[k] = line;
    }
    return { cart: out, changed };
  };
  // Restore ONCE per business, after the menu + shop fetches settle (so we
  // revalidate against real data, not the fixture fallback).
  useEffect(() => {
    if (!menuFetched || !shopFetched || restoredRef.current === b.slug) return;
    restoredRef.current = b.slug;
    const saved = loadCart<CartLine>(b.slug);
    if (!saved) return;
    const { cart: fresh, changed } = revalidateCart(saved);
    if (Object.keys(fresh).length > 0) setCart(fresh);
    if (changed) flash(L('Actualizamos tu carrito: algunos artículos ya no están disponibles', 'We updated your cart: some items are no longer available'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.slug, menuFetched, shopFetched]);
  // Persist on every change (re-stamps the 24h TTL). Guarded so we never clobber a
  // saved cart with the empty initial state before the restore above has run.
  useEffect(() => {
    if (restoredRef.current !== b.slug) return;
    saveCart(b.slug, cart);
  }, [cart, b.slug]);

  // ── "Guardado para después" (Amazon-style save-for-later, store cart) ──
  // Longer-lived than the cart (30 days): parked items the buyer is still
  // deciding on. Moving back to the cart re-checks stock.
  const [savedLines, setSavedLines] = useState<{ key: string; line: CartLine }[]>([]);
  const savedLoadedRef = useRef<string | null>(null);
  useEffect(() => {
    savedLoadedRef.current = b.slug;
    setSavedLines(loadSaved<CartLine>(b.slug));
  }, [b.slug]);
  useEffect(() => {
    if (savedLoadedRef.current !== b.slug) return;
    saveSaved(b.slug, savedLines);
  }, [savedLines, b.slug]);
  const removeLine = (k: string) => setCart((c) => { const n = { ...c }; delete n[k]; return n; });
  const saveForLater = (k: string) => {
    const line = cart[k];
    if (!line) return;
    setSavedLines((s) => [{ key: k, line }, ...s.filter((x) => x.key !== k)]);
    removeLine(k);
  };
  // Resolve a cart key back to its live shop item (stock lives there).
  const shopItemForKey = (k: string): { catKey: string; item: MenuItem } | null => {
    for (const c of shopCats) {
      if (!k.startsWith(`${c.key}:`)) continue;
      const rest = k.slice(c.key.length + 1);
      const nm = rest.split('|')[0];
      const item = c.items.find((it) => B(it.n) === nm);
      if (item) return { catKey: c.key, item };
    }
    return null;
  };
  const moveSavedToCart = (i: number) => {
    const entry = savedLines[i];
    if (!entry) return;
    const found = shopItemForKey(entry.key);
    const stk = found ? shopStock(found.catKey, found.item) : null;
    if (stk != null && stk <= 0) { flash(L('Ese producto está agotado ahora', 'That item is sold out right now')); return; }
    const inCart = cart[entry.key]?.qty ?? 0;
    const qty = stk != null ? Math.max(1, Math.min(entry.line.qty, stk - inCart)) : entry.line.qty;
    if (stk != null && stk - inCart <= 0) { flash(L('Ya tienes todas las unidades disponibles en el carrito', 'All available units are already in your cart')); return; }
    // Refresh display price/photo from the live item (simple lines only — addon
    // lines keep their stored unit; the SERVER re-prices every line at checkout
    // regardless, so a stale display price can never change what's charged).
    const refresh = found
      ? { img: found.item.img, orig: found.item.orig && found.item.orig > found.item.price ? found.item.orig : undefined, ...(!entry.line.sel?.length ? { unit: found.item.price } : {}) }
      : {};
    setCart((c) => ({ ...c, [entry.key]: { ...entry.line, ...refresh, qty: inCart + qty } }));
    setSavedLines((s) => s.filter((_, j) => j !== i));
  };
  const removeSaved = (i: number) => setSavedLines((s) => s.filter((_, j) => j !== i));

  // --- Real customer create-actions (myActivity) -------------------------
  // Every create inserts as the signed-in customer; guests are routed to
  // /entrar instead (never insert as a guest). Item NAMES + the business slug
  // are stored; the creators resolve slug → uuid internally.

  // Build a real ISO from the picker: svcDate → the chosen date chip, svcTime → the
  // selected slot's minute-of-day. Falls back to now/noon if nothing valid.
  const svcStartISO = () => {
    const iso = dateChips[svcDate]?.iso;
    const d = iso ? parseISO(iso) : new Date();
    const min = svcTime >= 0 ? svcTime : 720;
    d.setHours(Math.floor(min / 60), min % 60, 0, 0);
    return d.toISOString();
  };

  // Open the booking sheet for any target (real service or fixture), fresh.
  // `keepExtras` carries the add-ons the user already picked in the detail sheet.
  const openSvc = (t: SvcTarget, opts?: { keepExtras?: boolean; staff?: string; resched?: string }) => {
    setSvcSel(t);
    setSvcDate(0);
    setSvcTime(-1); // resolved to the first real slot by the effect below
    setSvcPersons(1);
    if (!opts?.keepExtras) setSvcAddOns({});
    setSvcVar(0);
    setSvcNote('');
    setSvcStaff(opts?.staff ?? 'any');
    setSvcResched(opts?.resched ?? null);
    setSvcDone(false);
    setSvcInfo(null);
  };
  // The professionals able to perform the selected service (empty serviceIds = all).
  // No eligible pros → the service books by capacity (car wash bays, venues).
  const svcProviders = useMemo<PubProvider[]>(() => {
    if (!svcSel?.id || !realServices) return [];
    return realServices.providers.filter((p) => p.serviceIds.length === 0 || p.serviceIds.includes(svcSel.id!));
  }, [svcSel?.id, realServices]);
  // 14-day occupancy feed (migration 0092) — duration-aware, per professional.
  useEffect(() => {
    if (!svcSel || !svcSel.id || !svcSel.bookable) { setSvcBusy([]); return; }
    let cancelled = false;
    setSvcBusy([]);
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from.getTime() + 15 * 86400000);
    fetchBookingBusy(b.slug, from.toISOString(), to.toISOString()).then((rows) => { if (!cancelled) setSvcBusy(rows); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcSel?.id, svcSel?.bookable, svcDone]);
  // Does [start, start+durMin) collide with an active appointment of professional
  // `staffId`? With 'any', a slot only closes when EVERY eligible pro is busy.
  const staffBusyAt = (staffId: string, start: number, durMin: number) =>
    svcBusy.some((x) => x.staffId === staffId && x.start < start + durMin * 60000 && start < x.start + x.durMin * 60000);
  const slotStaffFull = (dayISO: string, minute: number): boolean => {
    if (svcProviders.length === 0) return false;
    const start = slotEpoch(dayISO, minute);
    const durMin = parseDurMin(svcSel?.dur);
    if (svcStaff !== 'any') return staffBusyAt(svcStaff, start, durMin);
    return svcProviders.every((p) => staffBusyAt(p.id, start, durMin));
  };
  // When a real bookable service opens, load its per-SLOT seat load (migration
  // 0059) so a specific time can't be over-booked. Keyed by the slot's epoch(ms)
  // because a timestamptz round-trips as a different string than toISOString().
  useEffect(() => {
    if (!svcSel || !svcSel.id || !svcSel.bookable || svcSel.capMax <= 0) { setSvcSlotBusy({}); return; }
    let cancelled = false;
    setSvcSlotBusy({});
    fetchBookingLoad(svcSel.id).then((rows) => {
      if (cancelled) return;
      const map: Record<number, number> = {};
      for (const r of rows) { const t = new Date(r.slot).getTime(); if (!Number.isNaN(t)) map[t] = (map[t] || 0) + r.seats; }
      setSvcSlotBusy(map);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcSel?.id, svcSel?.bookable, svcSel?.capMax]);
  // A generated slot's canonical instant (local date + minute → epoch), matching
  // how a booking's starts_at was created (svcStartISO). Seats booked at that slot.
  const slotEpoch = (dayISO: string, minute: number) => { const d = parseISO(dayISO); d.setHours(Math.floor(minute / 60), minute % 60, 0, 0); return d.getTime(); };
  const slotSeats = (dayISO: string, minute: number) => svcSlotBusy[slotEpoch(dayISO, minute)] ?? 0;
  const slotFull = (dayISO: string, minute: number) => svcSel != null && svcSel.capMax > 0 && slotSeats(dayISO, minute) >= svcSel.capMax;
  const pubToTarget = (s: PubSvc): SvcTarget => ({
    name: s.name, descEs: s.desc[0], descEn: s.desc[1], price: s.price, priceType: s.priceType,
    priceLabel: null, dur: s.dur, bookable: s.bookable, deposit: s.deposit, addons: s.addons,
    id: s.id, capMax: capMaxOf(s.capacity), tile: s.tile, img: s.img, days: s.days, variant: s.variant,
  });
  const fixtureToTarget = (f: (typeof SERVICES)[number]): SvcTarget => ({
    name: B(f.n), descEs: f.d[0], descEn: f.d[1], price: null, priceType: 'cotiza',
    priceLabel: f.price, dur: '', bookable: true, deposit: false, addons: [], id: null, capMax: 0,
    tile: '#EFE3D0 0 8px,#E2CFB2 8px 16px', days: [], variant: null,
  });
  // Consumer price label for a real service card.
  const svcPriceLabel = (s: PubSvc): string =>
    s.priceType === 'cotiza' ? L('Cotización', 'Quote') : s.price ? `$${s.price}${s.priceType === 'persona' ? L('/persona', '/person') : ''}` : L('Gratis', 'Free');

  // Booking sheet math: selected add-ons, base (× persons when per-person) + the
  // chosen price-variant delta (vehicle type…), total.
  const svcChosenAddons = () => (svcSel ? svcSel.addons.filter((a) => svcAddOns[a.id]) : []);
  const svcVarDelta = () => (svcSel?.variant ? Math.max(0, svcSel.variant.options[svcVar]?.delta ?? 0) : 0);
  const svcTotal = () => {
    if (!svcSel || svcSel.price == null) return 0;
    const base = svcSel.priceType === 'persona' ? svcSel.price * Math.max(1, svcPersons) : svcSel.price;
    return base + svcVarDelta() + svcChosenAddons().reduce((n, a) => n + a.price, 0);
  };
  // The chosen professional (null = "Cualquiera"/none) + the chosen variant label.
  const svcStaffSel = (): PubProvider | null => (svcStaff === 'any' ? null : svcProviders.find((p) => p.id === svcStaff) ?? null);
  const svcVarLabel = (): string => (svcSel?.variant ? B(svcSel.variant.options[svcVar]?.name ?? ['', '']) : '');

  const confirmBooking = async () => {
    if (!svcSel) return;
    // must pick a real slot (bookable services only)
    if (svcSel.bookable) {
      if (svcSlots.length === 0) { flash(L('Cerrado ese día — elige otra fecha', 'Closed that day — pick another date')); return; }
      if (svcTime < 0) { flash(L('Elige una hora', 'Pick a time')); return; }
    }
    const iso = dateChips[svcDate]?.iso;
    // block a full slot: per-session capacity (0059) OR every eligible pro busy (0092)
    if (svcSel.bookable && iso && svcTime >= 0) {
      if (svcSel.capMax > 0 && svcProviders.length === 0 && slotFull(iso, svcTime)) { flash(L('Ese horario está lleno — elige otro', 'That time is full — pick another')); return; }
      if (slotStaffFull(iso, svcTime)) { flash(L('Ese horario ya está ocupado — elige otro', 'That time is already taken — pick another')); return; }
    }
    if (!user) { router.push('/entrar'); return; }
    const total = svcTotal();
    const dep = svcSel.deposit && total > 0 ? total : null;
    const persons = svcSel.priceType === 'persona' ? Math.max(1, svcPersons) : null;
    const staff = svcStaffSel();
    const durMin = parseDurMin(svcSel.dur);
    const whenLabel = `${B(dateChips[svcDate]?.lab ?? ['', ''])} ${B(dateChips[svcDate]?.sub ?? ['', ''])}${svcTime >= 0 ? ` · ${fmtShort(svcTime)}` : ''}`;
    // ── Reschedule mode (arrived via "Reagendar" in Mi cuenta): MOVE the booking —
    // status resets to 'pending' so the business re-confirms. No new charge.
    if (svcResched) {
      const { error } = await act.rescheduleBooking(svcResched, svcStartISO(), staff ? { id: staff.id, name: staff.name } : null);
      if (error) {
        flash(/staff_slot_taken/.test(error) ? L('Ese horario se acaba de ocupar — elige otro', 'That time was just taken — pick another') : L('No se pudo reagendar', 'Could not reschedule'));
        return;
      }
      setSvcDoneInfo({ name: svcSel.name, when: whenLabel, staff: staff?.name ?? '', total, startISO: svcStartISO(), durMin, resched: true });
      setSvcDone(true);
      return;
    }
    // Booking with a deposit/price + seller takes cards → charge the deposit online
    // via Stripe; the confirmed booking is created by the webhook once paid.
    if (payOnline && svcSel.deposit && total > 0) {
      const { url } = await startMarketplaceCheckout({
        kind: 'booking', slug: b.slug, subtotal: total,
        // structured inputs → server re-prices from DB (ignores subtotal)
        party_size: svcSel.priceType === 'persona' ? Math.max(1, svcPersons) : 1,
        addon_ids: svcChosenAddons().map((a) => a.id),
        ...(svcSel.variant ? { variant_i: svcVar } : {}),
        ...(staff ? { staff_id: staff.id } : {}),
        ...(svcNote.trim() ? { note: svcNote.trim() } : {}),
        ...(svcPromo ? { promo: svcPromo.code } : {}),
        payload: { service_name: svcSel.name, service_id: svcSel.id ?? null, starts_at: svcStartISO(), party_size: persons, deposit: total },
      });
      if (url) { window.location.href = url; return; }
      flash(L('No se pudo iniciar el pago', 'Could not start payment'));
      return;
    }
    // Cash / pay-at-venue / inquiry path — insert with the full appointment shape.
    const { error } = await act.book(b.slug, svcSel.name, svcSel.id, svcStartISO(), persons, dep, {
      duration_min: durMin,
      ...(staff ? { staff_id: staff.id, staff_name: staff.name } : {}),
      ...(svcChosenAddons().length ? { addons: svcChosenAddons().map((a) => ({ n: B(a.name), p: a.price })) } : {}),
      ...(svcSel.variant ? { variant: svcVarLabel() } : {}),
      ...(total > 0 ? { total } : {}),
      ...(svcNote.trim() ? { notes: svcNote.trim() } : {}),
    });
    if (error) {
      flash(/staff_slot_taken/.test(error) ? L('Ese horario se acaba de ocupar — elige otro', 'That time was just taken — pick another') : L('No se pudo enviar la reserva', 'Could not send the booking'));
      return;
    }
    setSvcDoneInfo({ name: svcSel.name, when: whenLabel, staff: staff?.name ?? '', total, startISO: svcStartISO(), durMin, resched: false });
    setSvcDone(true);
  };

  // Rental: the customer picks a start day (or a start→end range) on a real
  // calendar, gated by the item's availability config. Fee = day-rate × days
  // (weekly rate auto-applied for 7+ day spans) or hour-rate × hours, plus a
  // refundable deposit.
  const rentSpan = () => (rentStart ? (rentMode === 'hour' ? 1 : rentEnd ? spanDaysInc(rentStart, rentEnd) : 1) : 0);
  // fee for ONE unit over the chosen duration (weekly rate auto-applied for 7+ days).
  const rentUnitFee = (it: PubRental) => {
    if (rentMode === 'hour') return (it.hour ?? it.day) * rentHours;
    const n = rentSpan();
    if (it.week > 0 && n >= 7) { const w = Math.floor(n / 7), r = n % 7; return w * it.week + r * it.day; }
    return n * it.day;
  };
  const rentAddonsTotal = (it: PubRental) => it.addons.filter((a) => rentAddons.includes(a.id)).reduce((s, a) => s + a.price, 0);
  const rentDepositTotal = (it: PubRental) => it.dep * rentUnits;
  const rentSubtotal = (it: PubRental) => rentUnitFee(it) * rentUnits + rentAddonsTotal(it);
  const rentGrand = (it: PubRental) => rentSubtotal(it) + rentDepositTotal(it);
  const rentStartISO = () => { const d = rentStart ? parseISO(rentStart) : new Date(); d.setHours(9, 0, 0, 0); return d.toISOString(); };
  const rentEndISO = () => {
    if (rentMode === 'hour') { const d = rentStart ? parseISO(rentStart) : new Date(); d.setHours(9 + rentHours, 0, 0, 0); return d.toISOString(); }
    const base = rentEnd ?? rentStart;
    const d = base ? parseISO(base) : new Date(); d.setHours(18, 0, 0, 0); return d.toISOString();
  };
  // Is a calendar day selectable, per the item's availability rule + not past?
  const rentDayEnabled = (rule: string, dt: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (dt < today) return false;
    if (rule === '48h aviso') { const min = new Date(today); min.setDate(min.getDate() + 2); if (dt < min) return false; }
    const dow = dt.getDay();
    if (rule === 'Entre semana' && (dow === 0 || dow === 6)) return false;
    if (rule === 'Fines de semana' && dow !== 0 && dow !== 6) return false;
    return true;
  };
  // Tap a day: single-select (hour) or start→end range (day).
  const rentPick = (dISO: string) => {
    if (rentMode === 'hour') { setRentStart(dISO); setRentEnd(null); return; }
    if (!rentStart || rentEnd || dISO < rentStart) { setRentStart(dISO); setRentEnd(null); return; }
    if (dISO === rentStart) { setRentEnd(null); return; }
    setRentEnd(dISO);
  };
  // When the Rentar sheet opens for a real item, load its busy dates (migration
  // 0051) so the calendar can grey out days already booked to capacity.
  useEffect(() => {
    if (rentIdx === null) return;
    const it = rentalItems[rentIdx];
    if (!it || it.id.startsWith('fx')) { setRentBusy({}); return; }
    let cancelled = false;
    setRentBusy({});
    fetchRentalBusy(it.id).then((ranges) => {
      if (cancelled) return;
      const map: Record<string, number> = {};
      for (const r of ranges) {
        let d = parseISO(r.start);
        const end = parseISO(r.end);
        for (let guard = 0; d <= end && guard < 400; guard++) {
          const k = isoDay(d.getFullYear(), d.getMonth(), d.getDate());
          map[k] = (map[k] || 0) + r.qty;
          d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        }
      }
      setRentBusy(map);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentIdx]);
  // Real start-date chips (today + next 4 days). Replaces the stale SVC_DATES
  // fixture so "Hoy" is actually today; rentDate/svcDate index into this. Computed
  // in the browser, so it reflects the user's real current date.
  // 14 days out (Booksy-style horizon). `dow` carries the Spanish weekday key so a
  // service offered only on certain days (attrs.days) can grey the rest out.
  const dateChips = useMemo<{ lab: Bi; sub: Bi; iso: string; dow: string }[]>(() => {
    const wdEs = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const wdEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const moEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const moEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const base = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const dow = d.getDay(), day = d.getDate();
      const lab: Bi = i === 0 ? ['Hoy', 'Today'] : i === 1 ? ['Mañana', 'Tomorrow'] : [wdEs[dow], wdEn[dow]];
      const sub: Bi = [`${moEs[d.getMonth()]} ${day}`, `${moEn[d.getMonth()]} ${day}`];
      return { lab, sub, iso: isoDay(d.getFullYear(), d.getMonth(), day), dow: wdEs[dow] };
    });
  }, []);
  // A service offered only on some weekdays (attrs.days) greys out the others.
  const svcDayOff = (i: number): boolean => !!svcSel && svcSel.days.length > 0 && !svcSel.days.includes(dateChips[i]?.dow ?? '');
  // Real bookable time slots for the selected service + date: derived from the
  // business's open hours × the service duration (migration-free, all client-side).
  // No weekly hours configured → keep the old fixed offering so booking still works.
  const svcHasHours = Array.isArray(b.hours) && b.hours.length === 7;
  const svcSlots = useMemo<number[]>(() => {
    if (!svcSel?.bookable) return [];
    if (!svcHasHours) return FALLBACK_SLOTS;
    const iso = dateChips[svcDate]?.iso;
    if (!iso) return [];
    return bookingSlots(b.hours, b.hoursExceptions, parseISO(iso), parseDurMin(svcSel.dur), now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcSel?.bookable, svcSel?.dur, svcHasHours, svcDate, dateChips, b.hours, b.hoursExceptions, now]);
  // Snap the selected DAY off a weekday the service doesn't offer (first eligible).
  useEffect(() => {
    if (!svcSel || svcSel.days.length === 0) return;
    if (svcDayOff(svcDate)) {
      const first = dateChips.findIndex((_, i) => !svcDayOff(i));
      if (first >= 0) setSvcDate(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcSel?.id, svcSel?.days?.length]);
  // Keep the selected slot valid: when the day/slot set (or its load / the chosen
  // professional) changes, snap to the first slot that isn't full — or clear it.
  useEffect(() => {
    if (!svcSel?.bookable) return;
    const iso = dateChips[svcDate]?.iso;
    const open = iso ? svcSlots.filter((t) => !(svcProviders.length === 0 && slotFull(iso, t)) && !slotStaffFull(iso, t)) : svcSlots;
    if (svcTime < 0 || !open.includes(svcTime)) setSvcTime(open[0] ?? -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcSlots, svcSlotBusy, svcBusy, svcStaff]);
  // Per date chip: is EVERY slot that day already full? (grey the day out). Full =
  // capacity-full (0059) for capacity businesses, or every eligible professional
  // busy (0092) when a team exists.
  const svcDayFull = useMemo<boolean[]>(() => {
    if (!svcSel?.bookable || !svcHasHours || (svcSel.capMax <= 0 && svcProviders.length === 0)) return dateChips.map(() => false);
    return dateChips.map((c) => {
      const slots = bookingSlots(b.hours, b.hoursExceptions, parseISO(c.iso), parseDurMin(svcSel!.dur), now);
      return slots.length > 0 && slots.every((t) =>
        (svcProviders.length === 0 ? slotFull(c.iso, t) : slotStaffFull(c.iso, t)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcSel?.bookable, svcSel?.dur, svcSel?.capMax, svcHasHours, dateChips, b.hours, b.hoursExceptions, now, svcSlotBusy, svcBusy, svcStaff, svcProviders]);

  const confirmRental = async () => {
    if (rentIdx === null) return;
    const it = rentalItems[rentIdx];
    if (!rentStart) { flash(L('Elige la fecha de renta', 'Pick a rental date')); return; }
    if (!user) { router.push('/entrar'); return; }
    const itemId = it.id.startsWith('fx') ? null : it.id;
    const fee = rentSubtotal(it);
    // Payable rental (seller takes cards + a real fee) → charge the rental fee online
    // via Stripe; the refundable security deposit is collected at pickup.
    if (payOnline && fee > 0) {
      const { url } = await startMarketplaceCheckout({
        kind: 'rental', slug: b.slug, subtotal: fee,
        // structured inputs → server re-prices the fee from DB rates + span (ignores subtotal)
        mode: rentMode, hours: rentHours, units: rentUnits,
        addon_ids: it.addons.filter((a) => rentAddons.includes(a.id)).map((a) => a.id),
        ...(rentPromo ? { promo: rentPromo.code } : {}),
        payload: { item_name: B(it.n), item_id: itemId, start_at: rentStartISO(), end_at: rentEndISO(), qty: rentUnits, total: rentGrand(it), deposit: rentDepositTotal(it) },
      });
      if (url) { window.location.href = url; return; }
      flash(L('No se pudo iniciar el pago', 'Could not start payment'));
      return;
    }
    setRentDone(true); // optimistic success screen (pay-later / inquiry)
    const { error } = await act.rent(b.slug, B(it.n), itemId, rentStartISO(), rentEndISO(), rentUnits, rentGrand(it), rentDepositTotal(it));
    if (!error) flash(L('Renta solicitada · míralo en Mi cuenta', 'Rental requested · see it in My account'));
  };

  // Events: real RSVP when the fixture has a public slug; otherwise fall back to
  // the existing optimistic local toggle (the detail fixtures carry no slug yet).
  const evSlug = (i: number) => (DETAIL_EVENTS[i] as { slug?: string }).slug;
  const evOn = (i: number) => {
    const s = evSlug(i);
    return s ? act.goingSlugs.has(s) : !!evGoing[i];
  };
  const toggleEv = (i: number) => {
    const s = evSlug(i);
    if (s) {
      if (!user) { router.push('/entrar'); return; }
      act.rsvp(s, !act.goingSlugs.has(s));
      return;
    }
    setEvGoing((m) => ({ ...m, [i]: !m[i] }));
  };

  const modalUnit = useMemo(() => {
    if (!itemModal) return 0;
    let add = 0;
    groupsFor(itemModal.catKey, itemModal.item).forEach((g) =>
      g.choices.forEach((ch, i) => {
        const sel = g.type === 'single' ? single[g.id] === i : !!multi[`${g.id}:${i}`];
        if (sel) add += ch.price;
      }),
    );
    return itemModal.item.price + add;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemModal, single, multi, realMenu]);
  // clamp qty when the picked variant (or item) has fewer units than the current qty
  useEffect(() => {
    if (!itemModal) return;
    const g = groupsFor(itemModal.catKey, itemModal.item);
    const v = variantStockAt(itemModal.item, g, single);
    const cap = v != null ? v : shopStock(itemModal.catKey, itemModal.item);
    if (cap != null && cap > 0 && qty > cap) setQty(cap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single, itemModal]);

  // Which surfaces this listing actually offers, so a real business never shows a
  // tab full of fixtures it never configured (e.g. a remittance shop rendering a
  // taco menu). Catalog tabs appear only when the owner published REAL data;
  // fixture-only tabs (updates/events/staff) appear only when the owner explicitly
  // enabled that module (businesses.modules). Overview/related/reviews are always on.
  const modOn = (k: string) => b.modules?.[k] === true;
  const tabShown: Record<TabKey, boolean> = {
    overview: true,
    related: true,
    reviews: true,
    menu: realMenu != null,
    shop: realShop != null,
    services: realServices != null,
    rentals: realRentals != null,
    updates: modOn('updates'),
    events: modOn('events'),
    staff: modOn('staff'),
  };
  const allTabs: [TabKey, string][] = [
    ['overview', 'Overview'],
    ['updates', 'Updates'],
    ['menu', L('Menú', 'Menu')],
    ['shop', L('Tienda', 'Shop')],
    ['services', L('Servicios', 'Services')],
    ['rentals', L('Renta', 'Rentals')],
    ['events', L('Eventos', 'Events')],
    ['staff', L('Equipo', 'Staff')],
    ['related', L('Relacionados', 'Related')],
    ['reviews', L('Reseñas', 'Reviews')],
  ];
  const tabs = allTabs.filter(([k]) => tabShown[k]);
  // If the active tab becomes hidden (real data RESOLVED to none), fall back.
  // Each tab waits for ITS data source to finish loading first — demoting while a
  // fetch is still in flight clobbered ?bt= deep links (Volver a pedir → menu).
  const tabResolved: Record<TabKey, boolean> = {
    overview: true, related: true, reviews: true,
    menu: menuFetched, shop: shopFetched, services: svcFetched, rentals: rentFetched,
    updates: hydrated != null, events: hydrated != null, staff: hydrated != null,
  };
  useEffect(() => {
    if (tabResolved[tab] && !tabShown[tab]) setTab('overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, hydrated, menuFetched, shopFetched, svcFetched, rentFetched, realMenu, realShop, realServices, realRentals, b.slug]);

  // Overview = the full, browse-y view (hero + meta). Any other tab switches to a
  // focused mode: the hero collapses into a compact pinned header (title + tabs
  // stuck to the top) for a distraction-free read. Jump to the top on every
  // switch so each tab opens from its start.
  const focused = tab !== 'overview';
  const barRef = useRef<HTMLDivElement>(null);
  // Pinned state — only drives OPACITY (never layout), so flipping it can't jump.
  const [stuck, setStuck] = useState(false);
  // Suppress the title fade for the one render caused by a tab switch, so the
  // swap is a clean single-frame cut instead of a ghosted cross-fade mid-page.
  const noFadeRef = useRef(false);
  // Same-tab taps must not set noFade: setTab bails out on identical state, no
  // render commits, and the reset effect below would never clear it — leaving the
  // NEXT legitimate pin fade stripped of its transition.
  const onTab = (k: TabKey) => { if (k === tab) return; noFadeRef.current = true; setTab(k); };
  useEffect(() => { noFadeRef.current = false; });

  // Pin the bar to the REAL app-header height (measured live) so it tucks flush —
  // no gap, no overlap — on any breakpoint. Fallbacks are only for first paint.
  const [headerH, setHeaderH] = useState<number | null>(null);
  const headerHRef = useRef<number | null>(null);
  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const measure = () => {
      const h = Math.round(header.getBoundingClientRect().height);
      headerHRef.current = h;
      setHeaderH(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // On every tab change reset to the top BEFORE paint. On Overview this shows the
  // full hero; on any other tab the hero is display:none, so scroll 0 lands the
  // bar flush at the top — and since nothing is above it, it stays locked there
  // (you can't scroll up to reveal the hero). Doing it pre-paint keeps switching
  // seamless: the bar never visibly moves, only the content below swaps.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    // At scroll 0 the Overview bar sits mid-page (below the hero), i.e. unpinned;
    // reset pre-paint so re-entering Overview never paints a stale stuck title.
    setStuck(false);
    // Entering the Menú tab: snap the category rail highlight + horizontal
    // position to the FIRST category BEFORE paint, so it doesn't briefly show the
    // previously-active (or empty) chip and then slide back when the spy catches
    // up — the flash you'd otherwise see coming from Overview.
    if (tab === 'menu') {
      spyLock.current = false; // fresh entry — let the spy track from the top immediately
      if (spySettle.current) window.clearTimeout(spySettle.current);
      setActiveCat(reorderItems.length > 0 ? '_reorder' : menuPopular.length >= 3 ? '_pop' : (menuCats[0]?.key ?? ''));
      if (menuChipRailRef.current) menuChipRailRef.current.scrollLeft = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Track the pinned state with a rAF-throttled boolean. Because the title row's
  // SPACE is always reserved in the bar (see the bar's JSX), flipping this only
  // fades opacity on the compositor — zero layout writes on scroll, so slow
  // scrolling across the pin point can't flicker or jump.
  useEffect(() => {
    if (focused) return; // focused tabs always show the title; nothing to track
    const el = barRef.current;
    if (!el) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const pin = headerHRef.current ?? (window.matchMedia('(min-width: 768px)').matches ? 108 : 150);
      setStuck(el.getBoundingClientRect().top <= pin + 1);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [focused, headerH]);
  const showTitle = focused || stuck;

  // DoorDash-style Menú tab: a category rail that pins right under the tab bar and
  // an active chip that tracks the section in view (scroll-spy) + auto-centers in
  // the rail. We measure the tab bar height (barH) so the rail stacks flush below
  // it, and the rail height (chipH) so "jump to category" lands under both bars.
  const menuChipRailRef = useRef<HTMLDivElement>(null);
  const [barH, setBarH] = useState(94);
  const [chipH, setChipH] = useState(50);
  const barHRef = useRef(94);
  const chipHRef = useRef(50);
  // Pre-paint measures (the bar height is CONSTANT now — title space is always
  // reserved — so these only matter on breakpoint/resize, never on scroll).
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => { const h = Math.round(el.getBoundingClientRect().height); barHRef.current = h; setBarH(h); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab]);
  useLayoutEffect(() => {
    const el = menuChipRailRef.current;
    if (!el) return;
    const measure = () => { const h = Math.round(el.getBoundingClientRect().height); chipHRef.current = h; setChipH(h); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab, realMenu]);
  const menuStickyTop = (headerH ?? 150) + barH;        // where the rail pins
  const menuScrollMargin = menuStickyTop + chipH + 8;   // section jump offset

  // Active category (scroll-spy). Recomputed on every scroll frame while on the
  // Menú tab: the last section whose header has passed under the sticky rail wins.
  const [activeCat, setActiveCat] = useState('');
  const spyLock = useRef(false);            // freeze scroll-spy during a click-driven jump
  const spySettle = useRef<number | null>(null);
  useEffect(() => {
    if (tab !== 'menu') return;
    const keys: string[] = [];
    if (reorderItems.length > 0) keys.push('_reorder');
    if (menuPopular.length >= 3) keys.push('_pop');
    menuCats.forEach((c) => keys.push(c.key));
    if (keys.length < 2) return;
    let raf = 0;
    const spy = () => {
      raf = 0;
      if (spyLock.current) return; // a chip was tapped — hold the highlight steady until the scroll settles
      // While a sheet/modal is open, useScrollLock pins <body> with
      // position:fixed — the document's scrollHeight collapses to the
      // viewport height and window.scrollY reads 0, which the bottom-of-page
      // clamp below misreads as "scrolled to the end", snapping the rail to
      // the LAST category. Skip recomputing until the lock releases; the
      // already-correct activeCat just holds steady while the sheet is open.
      if (document.body.style.position === 'fixed') return;
      // The line sits just BELOW where a jumped-to section lands (its
      // scrollMarginTop = sticky bars + 8), so clicking a category marks THAT
      // category active — not its left neighbor. Must stay > menuScrollMargin.
      const line = (headerHRef.current ?? 150) + barHRef.current + chipHRef.current + 14;
      let cur = keys[0];
      for (const k of keys) {
        const el = document.getElementById(`menu-cat-${k}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) cur = k;
        else break;
      }
      // Near the page bottom the last short sections can't reach the line, so the
      // last category would never light up — force it once we've hit the bottom.
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) cur = keys[keys.length - 1];
      setActiveCat((p) => (p === cur ? p : cur));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(spy);
      // While a click-driven jump animates, release the freeze only once the
      // scroll has settled (no scroll events for a beat) — so the highlight
      // doesn't flicker through the categories it flies past.
      if (spyLock.current) {
        if (spySettle.current) window.clearTimeout(spySettle.current);
        spySettle.current = window.setTimeout(() => { spyLock.current = false; }, 140);
      }
    };
    spy();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); if (spySettle.current) window.clearTimeout(spySettle.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, menuCats, menuPopular.length, reorderItems.length]);
  // Keep the active chip centered in the horizontal rail.
  useEffect(() => {
    if (tab !== 'menu' || !activeCat) return;
    const rail = menuChipRailRef.current;
    if (!rail) return;
    const chip = rail.querySelector(`[data-cat="${CSS.escape(activeCat)}"]`) as HTMLElement | null;
    if (!chip) return;
    rail.scrollTo({ left: Math.max(0, chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2), behavior: 'smooth' });
  }, [activeCat, tab]);
  const scrollToCat = (key: string) => {
    setActiveCat(key);
    // Freeze the spy for the animated jump so the highlight stays on the tapped
    // chip instead of flashing through every category it scrolls past. The
    // scroll-settle handler clears it; this timeout is a fallback if no scroll
    // fires (e.g. tapping the already-active category).
    spyLock.current = true;
    if (spySettle.current) window.clearTimeout(spySettle.current);
    spySettle.current = window.setTimeout(() => { spyLock.current = false; }, 800);
    document.getElementById(`menu-cat-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  // Desktop can't swipe a horizontal rail, so show hover arrows — but only for the
  // direction that can still scroll. Track the rail's scroll position.
  const [railNav, setRailNav] = useState({ left: false, right: false });
  useEffect(() => {
    const el = menuChipRailRef.current;
    if (!el) return;
    const update = () => setRailNav({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, [tab, realMenu, menuCats.length]);
  const railBy = (dx: number) => menuChipRailRef.current?.scrollBy({ left: dx, behavior: 'smooth' });

  const tabButtons = tabs.map(([k, label]) => (
    <button
      key={k}
      onClick={() => onTab(k)}
      className={`-mb-px flex-none cursor-pointer border-b-[2.5px] pb-[11px] text-[14px] ${
        tab === k ? 'border-primary font-extrabold text-ink' : 'border-transparent font-bold text-muted-2'
      }`}
    >
      {label}
    </button>
  ));

  const divider = <div className="my-5 h-px bg-hairline" style={{ background: 'rgba(30,27,46,.06)' }} />;
  const secTitle = (t: string) => <div className="mb-3 text-[15.5px] font-extrabold text-ink">{t}</div>;

  const chip = (on: boolean) =>
    `flex-none cursor-pointer whitespace-nowrap rounded-full px-[15px] py-2 text-[12.5px] ${
      on ? 'bg-ink font-extrabold text-white' : 'bg-lilac-2 font-bold text-ink-soft'
    }`;

  // `displayOnly` = a showcase menu (dishes + prices, no online orders): the card
  // is a plain, non-interactive row with no +/Pedir actions and no cart.
  const itemBody = (it: MenuItem) => (
    <>
      <span className="relative h-[64px] w-[64px] flex-none overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${it.bg})` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {it.img && <img src={it.img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-extrabold text-ink">{B(it.n)}</span>
          {it.tag && (
            <span className="rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[.04em]" style={{ background: it.tagBg, color: it.tagC }}>
              {B(it.tag)}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] font-semibold text-muted">{B(it.d)}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[13px] font-extrabold">
          <span className={it.orig ? 'text-[#E0568F]' : 'text-ink'}>{money(it.price)}</span>
          {it.orig && <span className="text-[11px] font-bold text-muted line-through">{money(it.orig)}</span>}
          {it.orig && (
            <span className="rounded-md bg-pink-bg px-1.5 py-0.5 text-[9.5px] font-extrabold text-pink-dark">
              −{Math.round((1 - it.price / it.orig) * 100)}%
            </span>
          )}
        </span>
      </span>
    </>
  );

  // Catalog (display-only) card: restaurant-menu layout — name … price on one
  // line (price pinned right, so no empty gutter), description below, sale line
  // last. Fills the width on mobile and tiles into a grid on wider screens.
  const catalogCard = (it: MenuItem) => (
    <div key={B(it.n)} className="flex items-start gap-3 rounded-card-sm border border-hair bg-white p-3 shadow-card">
      <span className="relative h-[60px] w-[60px] flex-none overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${it.bg})` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {it.img && <img src={it.img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[13.5px] font-extrabold text-ink">{B(it.n)}</span>
            {it.tag && (
              <span className="flex-none rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[.04em]" style={{ background: it.tagBg, color: it.tagC }}>
                {B(it.tag)}
              </span>
            )}
          </span>
          <span className={`flex-none text-[14px] font-extrabold ${it.orig ? 'text-[#E0568F]' : 'text-ink'}`}>{money(it.price)}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-[11.5px] font-semibold leading-snug text-muted">{B(it.d)}</span>
        {it.orig && (
          <span className="mt-1 flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted line-through">{money(it.orig)}</span>
            <span className="rounded-md bg-pink-bg px-1.5 py-0.5 text-[9.5px] font-extrabold text-pink-dark">
              −{Math.round((1 - it.price / it.orig) * 100)}%
            </span>
          </span>
        )}
      </span>
    </div>
  );

  // Add-to-cart controls shared by the list card (menu) and the shop grid card:
  // qty = this item summed across its cart lines (simple + customized variants).
  // Items with option groups open the sheet on first add; the stepper then
  // inc/decs the most recent line; ambiguous +/− asks instead of guessing.
  const cartControls = (catKey: string, it: MenuItem) => {
    const stk = shopStock(catKey, it);
    const soldOut = stk === 0;
    const low = stk != null && stk > 0 && stk <= 5;
    const groups = groupsFor(catKey, it);
    const hasOpts = groups.length > 0;
    const simpleKey = `${catKey}:${B(it.n)}`;
    const lineKeys = Object.keys(cart).filter((k) => k === simpleKey || k.startsWith(`${simpleKey}|`));
    const qty = lineKeys.reduce((n, k) => n + cart[k].qty, 0);
    const firstAdd = () => { if (hasOpts) openItem(catKey, it); else addSimple(catKey, it); };
    const incOne = () => {
      if (stk != null && qty >= stk) { flash(L('No hay más unidades', 'No more units available')); return; }
      if (!hasOpts) { addSimple(catKey, it); return; }
      if (lineKeys.length === 0) { openItem(catKey, it); return; }
      setAddPrompt({ catKey, item: it });
    };
    const decOne = () => {
      if (qty <= 1 || lineKeys.length <= 1) { const k = lineKeys[lineKeys.length - 1]; if (k) decLine(k); return; }
      setRemovePrompt({ catKey, item: it });
    };
    return { stk, soldOut, low, qty, firstAdd, incOne, decOne };
  };

  const itemCard = (catKey: string, it: MenuItem, displayOnly = false) => {
    if (displayOnly) return catalogCard(it);
    const { stk, soldOut, low, qty, firstAdd, incOne, decOne } = cartControls(catKey, it);
    return (
      <button
        key={B(it.n)}
        onClick={() => { if (!soldOut) openItem(catKey, it); }}
        className={`flex w-full items-center gap-3 rounded-card-sm border border-hair bg-white p-3 text-left shadow-card ${soldOut ? 'cursor-default opacity-75' : 'cursor-pointer'}`}
      >
        {itemBody(it)}
        <span className="flex flex-none flex-col items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {soldOut ? (
            <span className="whitespace-nowrap rounded-full bg-lilac-2 px-2.5 py-1.5 text-[10px] font-extrabold text-muted-2">{L('Agotado', 'Sold out')}</span>
          ) : (
            <>
              {low && <span className="whitespace-nowrap rounded-md bg-amber-bg px-1.5 py-0.5 text-[8.5px] font-extrabold text-amber-ink">{L('Quedan', 'Left')} {stk}</span>}
              {qty === 0 ? (
                <span
                  role="button"
                  aria-label={L('Agregar', 'Add')}
                  onClick={(e) => { e.stopPropagation(); firstAdd(); }}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-lilac text-primary-dark shadow-card transition-transform active:scale-90"
                >
                  <Plus size={16} stroke={2.8} />
                </span>
              ) : (
                <span className="flex items-center gap-0.5 rounded-full border border-lilac-line bg-white p-0.5 shadow-card">
                  <span
                    role="button"
                    aria-label={qty === 1 ? L('Eliminar', 'Remove') : L('Quitar uno', 'Remove one')}
                    onClick={(e) => { e.stopPropagation(); decOne(); }}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-primary-dark transition-transform active:scale-90"
                  >
                    {qty === 1 ? <Trash2 size={14} stroke={2.2} /> : <Minus size={16} stroke={2.8} />}
                  </span>
                  <span className="min-w-[20px] text-center text-[13.5px] font-extrabold tabular-nums text-ink">{qty}</span>
                  <span
                    role="button"
                    aria-label={L('Agregar uno', 'Add one')}
                    onClick={(e) => { e.stopPropagation(); incOne(); }}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-cta-sm transition-transform active:scale-90"
                  >
                    <Plus size={16} stroke={2.8} />
                  </span>
                </span>
              )}
            </>
          )}
        </span>
      </button>
    );
  };

  // Instacart-style grid product card (Tienda): tile with %-off badge + floating
  // add/stepper, then price (sale strikethrough), 2-line name, stock chips.
  // displayOnly (catalog mode) renders the same card without purchase controls.
  const gridCard = (catKey: string, it: MenuItem, displayOnly = false) => {
    const { stk, soldOut, low, qty, firstAdd, incOne, decOne } = cartControls(catKey, it);
    const off = it.orig && it.orig > it.price ? Math.round((1 - it.price / it.orig) * 100) : 0;
    return (
      <div
        key={`${catKey}:${B(it.n)}`}
        onClick={() => { if (!soldOut) openItem(catKey, it); }}
        className={`flex flex-col overflow-hidden rounded-card-sm border border-hair bg-white shadow-card transition-shadow hover:shadow-card-lg ${soldOut ? 'opacity-75' : 'cursor-pointer'}`}
      >
        <div className="relative aspect-[4/3] w-full" style={{ background: `repeating-linear-gradient(135deg,${it.bg})` }}>
          {it.img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.img} alt={B(it.n)} className="absolute inset-0 h-full w-full object-cover" />
          )}
          {off > 0 && !soldOut && (
            <span className="absolute left-2 top-2 rounded-md bg-pink px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-card">−{off}%</span>
          )}
          {!displayOnly && (soldOut ? (
            <span className="absolute bottom-2 right-2 rounded-full bg-white/95 px-2.5 py-1.5 text-[9.5px] font-extrabold text-muted-2 shadow-card">{L('Agotado', 'Sold out')}</span>
          ) : qty === 0 ? (
            <span
              role="button"
              aria-label={L('Agregar', 'Add')}
              onClick={(e) => { e.stopPropagation(); firstAdd(); }}
              className="absolute bottom-2 right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-lilac-line bg-white text-primary-dark shadow-pop transition-transform active:scale-90"
            >
              <Plus size={16} stroke={2.8} />
            </span>
          ) : (
            <span onClick={(e) => e.stopPropagation()} className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full border border-lilac-line bg-white p-0.5 shadow-pop">
              <span role="button" aria-label={qty === 1 ? L('Eliminar', 'Remove') : L('Quitar uno', 'Remove one')} onClick={(e) => { e.stopPropagation(); decOne(); }} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-primary-dark transition-transform active:scale-90">
                {qty === 1 ? <Trash2 size={14} stroke={2.2} /> : <Minus size={15} stroke={2.8} />}
              </span>
              <span className="min-w-[18px] text-center text-[13px] font-extrabold tabular-nums text-ink">{qty}</span>
              <span role="button" aria-label={L('Agregar uno', 'Add one')} onClick={(e) => { e.stopPropagation(); incOne(); }} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-cta-sm transition-transform active:scale-90">
                <Plus size={15} stroke={2.8} />
              </span>
            </span>
          ))}
        </div>
        <div className="flex flex-1 flex-col p-2.5 pb-3">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-[14.5px] font-extrabold text-ink">{money(it.price)}</span>
            {off > 0 && <span className="text-[11px] font-bold text-muted line-through">{money(it.orig!)}</span>}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-snug text-ink-3">{B(it.n)}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {low && <span className="rounded-md bg-amber-bg px-1.5 py-0.5 text-[8.5px] font-extrabold text-amber-ink">{L('Quedan', 'Left')} {stk}</span>}
            {it.tag && off === 0 && <span className="rounded-md px-1.5 py-0.5 text-[8.5px] font-extrabold" style={{ background: it.tagBg, color: it.tagC }}>{B(it.tag)}</span>}
          </div>
        </div>
      </div>
    );
  };

  // Real service card (Servicios tab). Tapping the card opens the DETAIL sheet
  // (description + extras — Booksy pattern); the button is the fast path straight
  // to booking. booking on + bookable → Reservar; inquiry-only → Consultar;
  // booking off (display-only) → no action button, detail still opens.
  const svcCard = (s: PubSvc) => {
    const canBook = svcBooking && s.bookable;
    const canInquire = svcBooking && !s.bookable;
    return (
      <div key={s.id} onClick={() => { setSvcAddOns({}); setSvcInfo(s); }} className="flex cursor-pointer items-start gap-3 rounded-card-sm border border-hair bg-white p-3 shadow-card">
        <span className="relative h-[62px] w-[62px] flex-none overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${s.tile})` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {s.img && <img src={s.img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          {s.badge && (
            <span className={`absolute left-1 top-1 rounded-md px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide ${s.badge === 'popular' ? 'bg-amber-bg text-amber-ink' : 'bg-lilac text-primary-dark'}`}>
              {s.badge === 'popular' ? 'Popular' : L('Nuevo', 'New')}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="truncate text-[14px] font-extrabold text-ink">{s.name}</span>
            <span className="flex-none text-[13.5px] font-extrabold text-primary-dark">{svcPriceLabel(s)}</span>
          </div>
          <div className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-snug text-muted">{B(s.desc)}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[10.5px] font-bold text-muted-2"><Clock size={11} stroke={2.4} />{s.dur}</span>
            {s.deposit && <span className="rounded-md bg-green-bg px-1.5 py-0.5 text-[9px] font-extrabold text-green-dark">{L('Depósito', 'Deposit')}</span>}
            {s.addons.length > 0 && <span className="rounded-md bg-lilac px-1.5 py-0.5 text-[9px] font-extrabold text-primary-dark">{s.addons.length} extras</span>}
          </div>
          {(canBook || canInquire) && (
            <button onClick={(e) => { e.stopPropagation(); openSvc(pubToTarget(s)); }} className="mt-2.5 w-full cursor-pointer rounded-field bg-primary py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm sm:w-auto sm:px-5">
              {canBook ? L('Reservar', 'Book') : L('Consultar', 'Ask')}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[680px]">
      {/* Full header (hero + title + meta + endorsement). Kept mounted but
          display:none on non-Overview tabs, so those tabs have nothing scrollable
          above the bar → the bar is locked at the very top and the hero can't be
          revealed. Only Overview shows it. */}
      <div className={focused ? 'hidden' : ''}>
      {/* hero */}
      <div className="relative mb-4 h-[200px] overflow-hidden rounded-card" style={{ background: bizTile(b) }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={b.name} onClick={() => setPhotoTile(cover)} className="absolute inset-0 h-full w-full cursor-pointer object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] tracking-[.1em] text-[#9A8FC4]">[ foto ]</div>
        )}
        <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
          <button onClick={onClose} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-card" aria-label={L('Volver', 'Back')}>
            <ChevronLeft size={18} stroke={2.4} className="text-ink" />
          </button>
          <div className="flex gap-2.5">
            <button onClick={() => setContactOpen(true)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-card" aria-label={L('Compartir', 'Share')}>
              <Share size={16} stroke={2.2} className="text-ink" />
            </button>
            <button onClick={toggleSave} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-card" aria-label={L('Guardar', 'Save')}>
              {saved ? <HeartFilled size={16} className="text-pink" /> : <Heart size={16} stroke={2.2} className="text-pink" />}
            </button>
          </div>
        </div>
        {/* hero promo badge: the first ACTIVE real promo; the fixture only when
            no real menu is loaded (a real business never shows a fake promo). */}
        {realMenu ? (
          realMenu.promo && (
            <span className="absolute bottom-3 left-3.5 max-w-[70%] truncate rounded-[10px] bg-[#F6E05E] px-[11px] py-[5px] text-[11.5px] font-extrabold text-ink">
              {L(realMenu.promo[0], realMenu.promo[1])}
            </span>
          )
        ) : b.cat === 'FoodDrinks' && (
          <span className="absolute bottom-3 left-3.5 rounded-[10px] bg-[#F6E05E] px-[11px] py-[5px] text-[11.5px] font-extrabold text-ink">
            {L('Martes 2x1', 'Taco Tue 2x1')}
          </span>
        )}
        {photos.length > 0 && (
          <span className="absolute bottom-3 right-3.5 rounded-[10px] bg-[rgba(30,27,46,.6)] px-[11px] py-[5px] text-[11.5px] font-bold text-white">1 / {photos.length}</span>
        )}
      </div>

      {/* title + meta */}
      <div className="flex items-center gap-[7px]">
        <span className="text-[22px] font-extrabold tracking-[-.02em] text-ink">{b.name}</span>
        {b.verified && <VerifiedBadge />}
        <button onClick={() => setContactOpen(true)} className="ml-auto flex h-[38px] w-[38px] flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2" aria-label={L('Contacto y opciones', 'Contact & options')}>
          <MoreHorizontal size={20} className="text-primary-dark" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-muted">
        <span className="rounded-lg bg-lilac px-2 py-1 text-[11px] text-primary-dark">{catLabel}</span>
        <span>· {b.price}</span>
        <span>· {b.dist}</span>
        <span className={`font-extrabold ${statusTone}`}>· {status.text}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Stars className="text-[14px]" />
        <span className="text-[15px] font-extrabold text-ink">{b.rating}</span>
        <span className="text-[13px] font-semibold text-muted-2">({b.reviews})</span>
      </div>
      {b.verified && (
        <div className="mt-4 flex items-center gap-2.5 rounded-btn-lg bg-lilac-2 px-[13px] py-[11px]">
          <span className="flex flex-none">
            {['CR', 'DL', 'JP'].map((ini, i) => (
              <Avatar key={ini} initials={ini} color={AVATAR_PALETTE[i]} size={24} className={`border-2 border-lilac-2 text-[8.5px] ${i > 0 ? '-ml-2' : ''}`} />
            ))}
          </span>
          <span className="text-[12px] font-bold text-ink-3">
            {L('Recomendado por', 'Recommended by')} <span className="text-primary-dark">{b.endorse} {L('vecinos de tu zona', 'neighbors nearby')}</span>
          </span>
        </div>
      )}
      </div>

      {/* One sticky header for every tab. On a non-Overview tab the negative top
          margin cancels the page's top padding so the bar sits flush at the top.
          The compact title row ALWAYS occupies its 50px inside the sticky bar.
          On Overview a -46px top margin lays that space, invisible, over the tail
          of the content above — so the resting layout matches the design exactly
          — and pinning only FADES the title in (opacity/transform on the
          compositor). Nothing here ever changes layout, so the pin transition
          cannot jump or flicker, no matter how slowly you scroll. On focused
          tabs the title simply stays visible. */}
      <div
        ref={barRef}
        style={{ ...(headerH != null ? { top: headerH } : undefined), pointerEvents: !focused && !stuck ? 'none' : undefined }}
        className={`sticky top-[150px] z-20 -mx-3.5 md:top-[108px] md:-mx-5 ${
          focused ? 'bg-app -mt-4 md:-mt-5 lg:-mt-[26px]' : '-mt-[46px]'
        }`}
      >
        <div className="relative h-[50px] px-3.5 md:px-5" aria-hidden={!showTitle} style={{ pointerEvents: showTitle ? undefined : 'none' }}>
          {/* the title's own backdrop — fades in with the pin so, before it, the
              content above stays visible through the reserved (overlapped) space */}
          {!focused && <div className={`absolute inset-0 bg-app ${noFadeRef.current ? '' : 'transition-opacity duration-200'} ${stuck ? 'opacity-100' : 'opacity-0'}`} />}
          <div className={`relative flex h-full items-center gap-2 ${noFadeRef.current ? '' : 'transition-[opacity,transform] duration-200'} ${showTitle ? 'translate-y-0 opacity-100' : 'translate-y-[5px] opacity-0'}`}>
            <button onClick={() => onTab('overview')} tabIndex={showTitle ? 0 : -1} className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2" aria-label={L('Volver a Overview', 'Back to Overview')}>
              <ChevronLeft size={16} stroke={2.6} className="text-ink" />
            </button>
            <span className="truncate text-[15.5px] font-extrabold text-ink">{b.name}</span>
            {b.verified && <VerifiedBadge size={16} />}
            <div className="ml-auto flex flex-none items-center gap-1.5">
              <button onClick={toggleSave} tabIndex={showTitle ? 0 : -1} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-lilac-2" aria-label={L('Guardar', 'Save')}>
                {saved ? <HeartFilled size={15} className="text-pink" /> : <Heart size={15} stroke={2.2} className="text-pink" />}
              </button>
              <button onClick={() => setContactOpen(true)} tabIndex={showTitle ? 0 : -1} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-lilac-2" aria-label={L('Contacto y opciones', 'Contact & options')}>
                <MoreHorizontal size={18} className="text-primary-dark" />
              </button>
            </div>
          </div>
        </div>
        {/* tabs row: pointer-events-auto re-enables input under the container's
            unpinned pass-through; the hairline lives HERE (over this row's opaque
            bg-app) so no 1px see-through slit exists while content scrolls under */}
        <div className="no-scrollbar pointer-events-auto flex touch-pan-x gap-5 overflow-x-auto overscroll-x-contain border-b border-hair bg-app px-3.5 pt-2.5 md:px-5">{tabButtons}</div>
      </div>

      {/* ============ OVERVIEW ============ */}
      {tab === 'overview' && (
        <div className="pt-5">
          {/* "Lo que ofrece" = the owner-selected features (bilingual); falls back
              to the legacy amenities. Hidden when there's nothing to show. */}
          {(() => {
            const offers = b.features && b.features.length
              ? b.features.map((es) => L(es, FEAT_EN[es] ?? es))
              : L(b.amEs.join('|'), b.amEn.join('|')).split('|').map((s) => s.trim()).filter(Boolean);
            if (offers.length === 0) return null;
            return (
              <>
                {secTitle(L('Lo que ofrece', 'What it offers'))}
                <div className="flex flex-wrap gap-2">
                  {offers.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-lilac-2 px-3 py-[7px] text-[12px] font-bold text-ink-soft">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {a}
                    </span>
                  ))}
                </div>
                {divider}
              </>
            );
          })()}
          {secTitle(L('Acerca de', 'About'))}
          <div className="whitespace-pre-line text-[14px] font-medium leading-[1.6] text-ink-soft">
            {/* real owner description when present; otherwise a friendly template
                using the business's own city (falls back to the app city). */}
            {L(b.descEs || '', b.descEn || '').trim()
              || L(
                `Negocio latino de confianza en ${b.city || app.cityShort}. ${b.specEs.replace('Especialidad · ', '')}, hecho con dedicación. Atendido con orgullo por su familia — de la comunidad para la comunidad.`,
                `Trusted Latino-owned business in ${b.city || app.cityShort}. ${b.specEn.replace('Specialty · ', '')}, made with care. Proudly family-run — from the community for the community.`,
              )}
          </div>
          {divider}
          <div className="flex items-center justify-between">
            <span className="text-[15.5px] font-extrabold text-ink">{L('Horario', 'Hours')}</span>
            <span className={`text-[12.5px] font-extrabold ${statusTone}`}>{status.text}</span>
          </div>
          {/* today's hours — a date override (holiday/vacation) wins over the
              weekly schedule, with the owner's reason as an amber badge. */}
          <div className="mt-[11px] flex items-center justify-between gap-2 text-[13.5px] font-semibold text-ink-soft">
            <span className="font-extrabold text-ink">{L('Hoy', 'Today')}</span>
            {todayExText != null ? (
              <span className="flex min-w-0 items-center justify-end gap-1.5">
                {todayEx?.label && (
                  <span className="truncate rounded-md bg-amber-bg px-1.5 py-0.5 text-[10px] font-extrabold text-amber-ink">{todayEx.label}</span>
                )}
                <span className="flex-none">{todayExText}</span>
              </span>
            ) : (
              <span>{b.hours && now ? fmtDayHours(b.hours[now.getDay()], L('Cerrado', 'Closed')) : '9:00 am – 10:00 pm'}</span>
            )}
          </div>
          <button onClick={() => setWeekOpen(!weekOpen)} className="mt-2 flex cursor-pointer items-center gap-1.5 text-[12.5px] font-extrabold text-primary-dark">
            {L('Ver toda la semana', 'See full week')}
            <ChevronDown size={13} stroke={2.6} className={`transition-transform ${weekOpen ? 'rotate-180' : ''}`} />
          </button>
          {weekOpen && (
            <div className="mt-3 flex flex-col gap-2 rounded-[13px] bg-[#F7F6FC] px-3.5 py-3">
              {WEEK.map((d, i) => {
                // WEEK is Monday-first; our hours are Sunday-first (0=Sun..6=Sat).
                const hoursIdx = i === 6 ? 0 : i + 1;
                const isToday = now != null && now.getDay() === hoursIdx;
                const label = isToday && todayExText != null
                  ? todayExText
                  : b.hours ? fmtDayHours(b.hours[hoursIdx], L('Cerrado', 'Closed')) : i === 6 ? '10:00 am – 6:00 pm' : '9:00 am – 10:00 pm';
                return (
                  <div key={d[0]} className="flex items-center justify-between text-[12.5px] font-semibold">
                    <span className={isToday ? 'font-extrabold text-ink' : 'text-ink-soft'}>{B(d)}</span>
                    <span className={isToday ? 'font-extrabold text-ink-2' : 'text-ink-2'}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
          {divider}
          {secTitle(L('Fotos', 'Photos'))}
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {photos.length > 0
              ? photos.map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" onClick={() => setPhotoTile(u)} className="h-[90px] w-[120px] flex-none cursor-pointer rounded-[13px] border border-hair object-cover" />
                ))
              : DETAIL_PHOTOS.map((t) => (
                  <button key={t} onClick={() => setPhotoTile(t)} className="h-[90px] w-[120px] flex-none cursor-pointer rounded-[13px]" style={{ background: t }} />
                ))}
          </div>
          {divider}
          {secTitle(L('Ubicación', 'Location'))}
          <div className="relative h-[130px] overflow-hidden rounded-[15px]" style={{ background: 'repeating-linear-gradient(135deg,#E7ECF3 0 14px,#DCE3EC 14px 28px)' }}>
            <MapPin size={30} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full fill-primary text-white" stroke={1.5} />
          </div>
          <div className="mt-[11px] flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink-soft">{address}</span>
            <button onClick={() => setContactOpen(true)} className="cursor-pointer text-[12.5px] font-extrabold text-primary-dark">
              {L('Cómo llegar →', 'Directions →')}
            </button>
          </div>
          {divider}
          {secTitle(L('Reseñas', 'Reviews'))}
          <div className="flex items-center gap-4">
            <div className="flex-none text-center">
              <div className="text-[34px] font-extrabold leading-none text-ink">{b.rating}</div>
              <Stars className="mt-1 block text-[11px]" />
              <div className="mt-1 text-[11px] font-semibold text-muted-2">{b.reviews}</div>
            </div>
            <div className="flex flex-1 flex-col gap-[5px]">
              {[
                [5, 90],
                [4, 7],
                [3, 2],
              ].map(([n, pct]) => (
                <div key={n} className="flex items-center gap-2">
                  <span className="w-2 text-[10px] font-bold text-muted-2">{n}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-lilac-line">
                    <div className="h-full bg-amber" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {revRaw && (
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <Avatar initials={initials(rvName || 'V')} color={AVATAR_PALETTE[id % AVATAR_PALETTE.length]} size={32} />
                <div>
                  <div className="text-[13px] font-extrabold text-ink">{rvName || L('Vecino', 'Neighbor')}</div>
                  <Stars className="text-[10px]" />
                </div>
              </div>
              <div className="mt-2 text-[13px] font-medium leading-[1.55] text-ink-soft">{quote}</div>
            </div>
          )}
          <button onClick={() => onTab('reviews')} className="mt-4 w-full cursor-pointer rounded-[13px] border-[1.5px] border-lilac-line bg-white p-[13px] text-[13.5px] font-extrabold text-primary-dark">
            {L('Ver todas las reseñas', 'See all reviews')}
          </button>
        </div>
      )}

      {/* ============ UPDATES ============ */}
      {tab === 'updates' && (
        <div className="flex flex-col gap-3.5 pt-4">
          {UPDATE_POSTS.map((p, i) => {
            const liked = !!updLikes[i];
            return (
              <Card key={i} className="p-[15px]">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={initials(b.name)} color="#7B61FF" size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-extrabold text-ink">{b.name}</div>
                    <div className="text-[11.5px] font-semibold text-muted-2">{B(p.when)}</div>
                  </div>
                  {p.tag && (
                    <span className="rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase tracking-[.04em]" style={{ background: p.tagBg, color: p.tagC }}>
                      {B(p.tag)}
                    </span>
                  )}
                </div>
                <div className="mt-[11px] text-[14px] font-medium leading-normal text-ink-body">{L(p.textEs(b.name), p.textEn(b.name))}</div>
                {p.tile && <div className="mt-[11px] h-[150px] rounded-[13px]" style={{ background: p.tile }} />}
                <div className="mt-3 flex items-center gap-5 border-t border-hair pt-[11px]">
                  <button onClick={() => setUpdLikes((m) => ({ ...m, [i]: !m[i] }))} className={`flex cursor-pointer items-center gap-1.5 text-[12.5px] font-bold ${liked ? 'text-pink' : 'text-muted-2'}`}>
                    <span className="text-[16px] leading-none">{liked ? '♥' : '♡'}</span>
                    {p.base + (liked ? 1 : 0)}
                  </button>
                  <button onClick={() => setUpdOpen((m) => ({ ...m, [i]: !m[i] }))} className="flex cursor-pointer items-center gap-1.5 text-[12.5px] font-bold text-muted-2">
                    <MessageCircle size={16} stroke={2} />
                    {L('Comentar', 'Comment')}
                  </button>
                  <button className="ml-auto cursor-pointer text-muted-2">
                    <Share size={16} stroke={2} />
                  </button>
                </div>
                {updOpen[i] && (
                  <div className="mt-3 flex items-center gap-2 border-t border-hair pt-3">
                    <input placeholder={L('Escribe un comentario…', 'Write a comment…')} className="min-w-0 flex-1 rounded-full bg-app px-4 py-2.5 text-[13px] font-medium outline-none placeholder:text-muted" />
                    <button className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-primary text-white">
                      <Send size={14} stroke={2.4} />
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ============ MENU / SHOP ============ */}
      {tab === 'menu' && (
        <div className="pt-4">
          {/* display-only menu → a clear "this is a menu to view; call to order" note */}
          {menuDisplayOnly && (
            <div className="mb-4 flex items-center gap-3 rounded-card-sm border border-lilac-line bg-lilac-2 p-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-white text-primary-dark">
                <Menu size={16} stroke={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-extrabold text-ink">{L('Menú informativo', 'Menu for viewing')}</span>
                <span className="block text-[11px] font-semibold leading-snug text-muted">{L('Este negocio muestra su menú y precios. Para ordenar, llámalo o visítalo.', 'This business shows its menu & prices. To order, call or visit.')}</span>
              </span>
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="flex flex-none cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-3 py-2 text-[11.5px] font-extrabold text-white shadow-cta-sm">
                <Phone size={13} stroke={2.4} />{L('Llamar', 'Call')}
              </a>
            </div>
          )}
          {/* delivery / pickup offer badges (design: Store Menu header chips) */}
          {!menuDisplayOnly && payOnline && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {deliveryAvailable && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-bg px-2.5 py-1 text-[10.5px] font-extrabold text-green-dark">
                  🛵 {L('Entrega', 'Delivery')} {money(del?.fee ?? 0)} · {del?.prep ? `${del.prep + 10}–${del.prep + 25} min` : '30–45 min'}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-lilac-2 px-2.5 py-1 text-[10.5px] font-extrabold text-primary-dark">
                🥡 {L('Recoger', 'Pickup')} · {del?.prep ? `${del.prep} min` : '15–25 min'}
              </span>
              {deliveryAvailable && (del?.min ?? 0) > 0 && (
                <span className="inline-flex items-center rounded-full bg-lilac-2 px-2.5 py-1 text-[10.5px] font-extrabold text-ink-soft">
                  {L('Mínimo', 'Min.')} {money(del?.min ?? 0)} {L('en entrega', 'for delivery')}
                </span>
              )}
            </div>
          )}

          {/* horizontal category rail — pins under the tab bar and the active chip
              tracks the section in view (DoorDash-style scroll-spy). */}
          {menuCats.length > 1 && (
            <div style={{ top: menuStickyTop }} className="group sticky z-[15] -mx-3.5 mb-4 border-b border-hair bg-app md:-mx-5">
              <div ref={menuChipRailRef} className="no-scrollbar flex gap-1.5 overflow-x-auto px-3.5 py-2.5 md:px-5">
                {reorderItems.length > 0 && (
                  <button data-cat="_reorder" onClick={() => scrollToCat('_reorder')} className={`flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] font-extrabold transition-colors ${activeCat === '_reorder' ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>
                    🔁 {L('Ordenar de nuevo', 'Order again')}
                  </button>
                )}
                {menuPopular.length >= 3 && (
                  <button data-cat="_pop" onClick={() => scrollToCat('_pop')} className={`flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] font-extrabold transition-colors ${activeCat === '_pop' ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>
                    ⭐ {L('Populares', 'Popular')}
                  </button>
                )}
                {menuCats.map((c) => (
                  <button key={c.key} data-cat={c.key} onClick={() => scrollToCat(c.key)} className={`flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] font-extrabold transition-colors ${activeCat === c.key ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>
                    {B(c.name)}
                  </button>
                ))}
              </div>
              {/* desktop-only hover arrows (a mouse can't swipe a horizontal rail);
                  each shows only while that direction can still scroll. */}
              {railNav.left && (
                <>
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-14 bg-gradient-to-r from-app to-transparent opacity-0 transition-opacity group-hover:opacity-100 md:block" />
                  <button type="button" aria-label={L('Categorías anteriores', 'Previous categories')} onClick={() => railBy(-240)} className="absolute left-1.5 top-1/2 hidden h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-hair bg-white text-ink opacity-0 shadow-card transition-opacity hover:bg-lilac-2 group-hover:opacity-100 md:flex">
                    <ChevronLeft size={17} stroke={2.4} />
                  </button>
                </>
              )}
              {railNav.right && (
                <>
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-app to-transparent opacity-0 transition-opacity group-hover:opacity-100 md:block" />
                  <button type="button" aria-label={L('Más categorías', 'More categories')} onClick={() => railBy(240)} className="absolute right-1.5 top-1/2 hidden h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-hair bg-white text-ink opacity-0 shadow-card transition-opacity hover:bg-lilac-2 group-hover:opacity-100 md:flex">
                    <ChevronRight size={17} stroke={2.4} />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Ordenar de nuevo — this customer's past orders from THIS business,
              first (like DoorDash/Uber Eats "Order it again") so a repeat
              customer can reorder their usual in one tap. */}
          {reorderItems.length > 0 && (
            <div id="menu-cat-_reorder" style={{ scrollMarginTop: menuScrollMargin }} className="mb-5">
              <div className="mb-2.5 flex items-baseline gap-2">
                <span className="text-[15.5px] font-extrabold text-ink">{L('Ordenar de nuevo', 'Order again')}</span>
                <span className="text-[11.5px] font-bold text-muted">{reorderItems.length} {L('platillos', 'items')}</span>
              </div>
              <div className={menuDisplayOnly ? 'grid grid-cols-1 gap-2.5 sm:grid-cols-2' : 'flex flex-col gap-2.5'}>{reorderItems.map(({ catKey, item }) => itemCard(catKey, item, menuDisplayOnly))}</div>
            </div>
          )}

          {/* Populares — the dishes the owner marked popular, first (like DoorDash) */}
          {menuPopular.length >= 3 && (
            <div id="menu-cat-_pop" style={{ scrollMarginTop: menuScrollMargin }} className="mb-5">
              <div className="mb-2.5 flex items-baseline gap-2">
                <span className="text-[15.5px] font-extrabold text-ink">{L('Populares', 'Popular items')}</span>
                <span className="text-[11.5px] font-bold text-muted">{menuPopular.length} {L('platillos', 'items')}</span>
              </div>
              <div className={menuDisplayOnly ? 'grid grid-cols-1 gap-2.5 sm:grid-cols-2' : 'flex flex-col gap-2.5'}>{menuPopular.map(({ catKey, item }) => itemCard(catKey, item, menuDisplayOnly))}</div>
            </div>
          )}

          {menuCats.map((c) => (
            <div key={c.key} id={`menu-cat-${c.key}`} style={{ scrollMarginTop: menuScrollMargin }} className="mb-5">
              <div className="mb-2.5 flex items-baseline gap-2">
                <span className="text-[15.5px] font-extrabold text-ink">{B(c.name)}</span>
                <span className="text-[11.5px] font-bold text-muted">{c.items.length} {L('platillos', 'items')}</span>
              </div>
              <div className={menuDisplayOnly ? 'grid grid-cols-1 gap-2.5 sm:grid-cols-2' : 'flex flex-col gap-2.5'}>{c.items.map((it) => itemCard(c.key, it, menuDisplayOnly))}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'shop' && (() => {
        // ── Storefront: Instacart/Walmart-grade browse over the real catalog ──
        const all = shopCats.flatMap((c) => c.items.map((it) => ({ catKey: c.key, cat: c, it })));
        const nrm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const q = nrm(shopQ.trim());
        const saleItems = all.filter((x) => x.it.orig && x.it.orig > x.it.price);
        let list = all;
        if (q) list = list.filter((x) => nrm(B(x.it.n)).includes(q) || nrm(B(x.cat.name)).includes(q));
        if (shopCat === 'sale') list = list.filter((x) => x.it.orig && x.it.orig > x.it.price);
        else if (shopCat !== 'all') list = list.filter((x) => x.catKey === shopCat);
        const offOf = (x: { it: MenuItem }) => (x.it.orig && x.it.orig > x.it.price ? 1 - x.it.price / x.it.orig : 0);
        if (shopSort === 'price_asc') list = [...list].sort((a, b) => a.it.price - b.it.price);
        else if (shopSort === 'price_desc') list = [...list].sort((a, b) => b.it.price - a.it.price);
        else if (shopSort === 'discount') list = [...list].sort((a, b) => offOf(b) - offOf(a));
        const visible = list.slice(0, shopShown);
        const gridCls = 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4';
        const sorts: [typeof shopSort, string][] = [
          ['featured', L('Relevancia', 'Featured')],
          ['price_asc', L('Menor precio', 'Price: low to high')],
          ['price_desc', L('Mayor precio', 'Price: high to low')],
          ['discount', L('% descuento', '% off')],
        ];
        return (
          <div className="pt-4">
            {/* display-only shop → a clear "this is a catalog; call to buy" note */}
            {shopDisplayOnly && (
              <div className="mb-4 flex items-center gap-3 rounded-card-sm border border-lilac-line bg-lilac-2 p-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-white text-primary-dark">
                  <Menu size={16} stroke={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-extrabold text-ink">{L('Catálogo informativo', 'Catalog for viewing')}</span>
                  <span className="block text-[11px] font-semibold leading-snug text-muted">{L('Este negocio muestra sus productos y precios. Para comprar, llámalo o visítalo.', 'This business shows its products & prices. To buy, call or visit.')}</span>
                </span>
                <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="flex flex-none cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-3 py-2 text-[11.5px] font-extrabold text-white shadow-cta-sm">
                  <Phone size={13} stroke={2.4} />{L('Llamar', 'Call')}
                </a>
              </div>
            )}

            {/* in-store search */}
            <div className="relative mb-3">
              <Search size={15} stroke={2.4} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={shopQ}
                onChange={(e) => setShopQ(e.target.value)}
                placeholder={L(`Buscar entre ${all.length} productos…`, `Search ${all.length} products…`)}
                className="w-full rounded-field border-[1.5px] border-lilac-line bg-white py-3 pl-10 pr-9 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary"
              />
              {shopQ && (
                <button onClick={() => setShopQ('')} aria-label={L('Limpiar', 'Clear')} className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink-soft">
                  <X size={12} stroke={2.8} />
                </button>
              )}
            </div>

            {/* category rail — Todo · Ofertas · each aisle with its count */}
            <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
              <button onClick={() => setShopCat('all')} className={`flex flex-none cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] ${shopCat === 'all' ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`}>
                {L('Todo', 'All')}<span className={`font-extrabold ${shopCat === 'all' ? 'text-white/80' : 'text-muted-2'}`}>{all.length}</span>
              </button>
              {saleItems.length > 0 && (
                <button onClick={() => setShopCat('sale')} className={`flex flex-none cursor-pointer items-center gap-1 rounded-full px-3.5 py-2 text-[12px] ${shopCat === 'sale' ? 'bg-pink font-extrabold text-white shadow-cta-sm' : 'bg-pink-bg font-bold text-pink-dark'}`}>
                  <Flame size={13} stroke={2.6} />{L('Ofertas', 'Deals')}<span className="font-extrabold opacity-80">{saleItems.length}</span>
                </button>
              )}
              {shopCats.map((c) => (
                <button key={c.key} onClick={() => setShopCat(c.key)} className={`flex flex-none cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] ${shopCat === c.key ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`}>
                  {B(c.name)}<span className={`font-extrabold ${shopCat === c.key ? 'text-white/80' : 'text-muted-2'}`}>{c.items.length}</span>
                </button>
              ))}
            </div>

            {/* sort row */}
            <div className="no-scrollbar -mx-1 mb-4 flex items-center gap-2 overflow-x-auto px-1">
              <span className="flex-none text-[10.5px] font-extrabold uppercase tracking-wide text-muted">{L('Ordenar', 'Sort')}</span>
              {sorts.map(([k, label]) => (
                <button key={k} onClick={() => setShopSort(k)} className={`flex-none cursor-pointer rounded-full border-[1.5px] px-3 py-1.5 text-[11.5px] font-bold ${shopSort === k ? 'border-primary bg-lilac text-primary-dark' : 'border-lilac-line bg-white text-ink-soft'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* collections + Ofertas carousel — only on the unfiltered home view */}
            {shopCat === 'all' && !q && (
              <>
                {realShop && realShop.collections.length > 0 && (
                  <div className="no-scrollbar mb-4 flex gap-3 overflow-x-auto">
                    {realShop.collections.map((c) => (
                      <div key={c.es} className="w-[200px] flex-none rounded-card-sm p-3.5" style={{ background: `repeating-linear-gradient(135deg,${c.tile})` }}>
                        <div className="text-[9.5px] font-extrabold uppercase tracking-[.06em] text-ink-3">{L('Colección', 'Collection')}</div>
                        <div className="mt-0.5 text-[14px] font-extrabold text-ink">{L(c.es, c.en)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {saleItems.length > 0 && (
                  <div className="mb-5">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[15.5px] font-extrabold text-ink"><Flame size={17} stroke={2.4} className="text-pink" />{L('Ofertas de la semana', 'Deals of the week')}</span>
                      <button onClick={() => setShopCat('sale')} className="cursor-pointer text-[12px] font-extrabold text-primary-dark">{L('Ver todas', 'See all')} ›</button>
                    </div>
                    <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4">
                      {saleItems.slice(0, 10).map((x) => (
                        <div key={`${x.catKey}:${B(x.it.n)}`} className="w-[150px] flex-none">{gridCard(x.catKey, x.it, shopDisplayOnly)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* results header + grid */}
            <div className="mb-2.5 flex items-baseline justify-between">
              <span className="text-[15.5px] font-extrabold text-ink">
                {shopCat === 'sale' ? L('Ofertas', 'Deals') : shopCat === 'all' ? (q ? L('Resultados', 'Results') : L('Todos los productos', 'All products')) : B((shopCats.find((c) => c.key === shopCat)?.name ?? ['Productos', 'Products']) as Bi)}
              </span>
              <span className="text-[11.5px] font-bold text-muted">{list.length} {L('productos', 'products')}</span>
            </div>
            {list.length === 0 ? (
              <div className="rounded-card border border-hair bg-white p-8 text-center shadow-card">
                <div className="text-[13.5px] font-extrabold text-ink">{L('Sin resultados', 'No results')}</div>
                <div className="mx-auto mt-1 max-w-[280px] text-[12px] font-semibold text-muted">{L(`No encontramos "${shopQ}" en esta tienda. Prueba otra palabra o categoría.`, `We couldn't find "${shopQ}" in this store. Try another word or category.`)}</div>
              </div>
            ) : (
              <>
                <div className={gridCls}>{visible.map((x) => gridCard(x.catKey, x.it, shopDisplayOnly))}</div>
                {list.length > visible.length && (
                  <button onClick={() => setShopShown((n) => n + 24)} className="mt-4 w-full cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white py-3 text-[13px] font-extrabold text-primary-dark">
                    {L(`Ver más productos (${list.length - visible.length} restantes)`, `Show more products (${list.length - visible.length} left)`)}
                  </button>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* ============ SERVICES ============ */}
      {tab === 'services' && (
        realServices ? (
          <div className="pt-4">
            {/* display-only services → a clear "call to book" note (no Reservar) */}
            {svcDisplayOnly && (
              <div className="mb-4 flex items-center gap-3 rounded-card-sm border border-lilac-line bg-lilac-2 p-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-white text-primary-dark">
                  <Menu size={16} stroke={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-extrabold text-ink">{L('Servicios informativos', 'Services for viewing')}</span>
                  <span className="block text-[11px] font-semibold leading-snug text-muted">{L('Este negocio muestra sus servicios y precios. Para reservar, llámalo o visítalo.', 'This business shows its services & prices. To book, call or visit.')}</span>
                </span>
                <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="flex flex-none cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-3 py-2 text-[11.5px] font-extrabold text-white shadow-cta-sm">
                  <Phone size={13} stroke={2.4} />{L('Llamar', 'Call')}
                </a>
              </div>
            )}
            {realServices.cats.map((c) => (
              <div key={c.key} className="mb-5">
                <div className="mb-2.5 flex items-baseline gap-2">
                  <span className="text-[15.5px] font-extrabold text-ink">{B(c.name)}</span>
                  <span className="text-[11.5px] font-bold text-muted">{c.items.length} {c.items.length === 1 ? L('servicio', 'service') : L('servicios', 'services')}</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">{c.items.map((s) => svcCard(s))}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 pt-4">
            {SERVICES.map((s) => (
              <Card key={s.n[0]} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-extrabold text-ink">{B(s.n)}</div>
                  <div className="mt-0.5 text-[12px] font-semibold text-muted">{B(s.d)}</div>
                  <div className="mt-1 text-[12.5px] font-extrabold text-primary-dark">{B(s.price)}</div>
                </div>
                <button onClick={() => openSvc(fixtureToTarget(s))} className="flex-none cursor-pointer rounded-field bg-primary px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm">
                  {L('Reservar', 'Book')}
                </button>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ============ RENTALS ============ */}
      {tab === 'rentals' && (
        <div className="flex flex-col gap-2.5 pt-4">
          {rentDisplayOnly && (
            <div className="flex items-center gap-2.5 rounded-tile bg-lilac-2 px-3.5 py-2.5">
              <Store size={16} stroke={2.2} className="flex-none text-primary-dark" />
              <span className="text-[12px] font-semibold leading-snug text-ink-soft">{L('Consulta disponibilidad y tarifas — llama o visita para rentar.', 'Check availability & rates — call or visit to rent.')}</span>
            </div>
          )}
          {rentalItems.map((it, i) => (
            <Card key={it.id} className="flex items-center gap-3 p-3.5">
              <span className="relative h-[62px] w-[62px] flex-none overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${it.tile})` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {it.img && <img src={it.img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-extrabold text-ink">{B(it.n)}</div>
                <div className="mt-0.5 text-[12px] font-semibold text-muted">{B(it.d)}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] font-extrabold text-primary-dark">
                  <span>{money(it.day)}/{L('día', 'day')}</span>
                  {it.dep > 0 && <span className="text-[11px] font-bold text-muted-2">{L('Depósito', 'Deposit')} {money(it.dep)}</span>}
                </div>
              </div>
              {!rentDisplayOnly && (
                <button
                  onClick={() => { setRentIdx(i); setRentMode('day'); setRentStart(null); setRentEnd(null); setRentHours(2); setRentUnits(1); setRentAddons([]); const d = new Date(); setRentCal({ y: d.getFullYear(), m: d.getMonth() }); setRentDone(false); }}
                  className="flex-none cursor-pointer rounded-field bg-primary px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm"
                >
                  {L('Rentar', 'Rent')}
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ============ EVENTS ============ */}
      {tab === 'events' && (
        <div className="flex flex-col gap-2.5 pt-4">
          {DETAIL_EVENTS.map((e, i) => {
            const on = evOn(i);
            return (
              <Card key={e.title[0]} className="flex items-center gap-3.5 p-4" onClick={() => setEvIdx(i)}>
                <span className="flex h-[54px] w-[54px] flex-none flex-col items-center justify-center rounded-tile bg-lilac">
                  <span className="text-[10px] font-extrabold uppercase text-primary-dark">{B(e.d)}</span>
                  <span className="text-[19px] font-extrabold leading-none text-ink">{e.day}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-extrabold text-ink">{B(e.title)}</span>
                  <span className="mt-0.5 block text-[12px] font-semibold text-muted">{B(e.loc)}</span>
                  <span className="mt-0.5 block text-[11.5px] font-bold text-muted-2">{e.base + (on ? 1 : 0)} {L('asisten', 'going')}</span>
                </span>
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    toggleEv(i);
                  }}
                  className={`flex-none cursor-pointer rounded-field px-4 py-2.5 text-[12.5px] font-extrabold ${on ? 'bg-green-bg text-green-dark' : 'bg-primary text-white shadow-cta-sm'}`}
                >
                  {on ? L('Voy ✓', 'Going ✓') : L('Asistir', 'Attend')}
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* ============ STAFF ============ */}
      {tab === 'staff' && (
        <div className="grid grid-cols-2 gap-2.5 pt-4 md:grid-cols-4">
          {STAFF.map((m, i) => (
            <Card key={m.name} className="flex flex-col items-center p-4 text-center">
              <Avatar initials={initials(m.name)} color={AVATAR_PALETTE[i % AVATAR_PALETTE.length]} size={52} />
              <div className="mt-2.5 text-[13.5px] font-extrabold text-ink">{m.name}</div>
              <div className="mt-0.5 text-[11.5px] font-semibold text-muted">{B(m.role)}</div>
            </Card>
          ))}
        </div>
      )}

      {/* ============ RELATED ============ */}
      {tab === 'related' && (
        <div className="flex flex-col gap-2.5 pt-4">
          {related.length > 0
            ? // real approved links (migration 0044): sister listings, barbers, DJ…
              related.map((r) => {
                const role = r.otherIsTarget ? L(r.roleEs ?? '', r.roleEn ?? r.roleEs ?? '') : '';
                const catInfo = CAT[r.categoryId as keyof typeof CAT];
                return (
                  <Card key={r.slug} className="flex items-center gap-3 p-3.5" onClick={() => openRelated(r.slug)}>
                    <span className="h-[56px] w-[56px] flex-none rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${r.tileA ?? '#EFEBFF'} 0 11px,${r.tileB ?? '#E5DEF9'} 11px 22px)` }} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13.5px] font-extrabold text-ink">{r.name}</span>
                        {r.tier !== 'free' && <VerifiedBadge size={15} />}
                        {role && <span className="flex-none rounded bg-lilac-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-2">{role}</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] font-bold text-muted">{catInfo ? L(catInfo.es, catInfo.en) : r.categoryId}{r.city ? ` · ${r.city}` : ''}</span>
                    </span>
                    <span className="flex-none text-[12.5px] font-extrabold text-ink">★ {r.rating.toFixed(1)}</span>
                  </Card>
                );
              })
            : all.filter((x) => x.id !== id).slice(0, 4).map((x) => (
                <Card key={x.id} className="flex items-center gap-3 p-3.5" onClick={() => { onOpenOther(x); onTab('overview'); }}>
                  <span className="h-[56px] w-[56px] flex-none rounded-tile" style={{ background: bizTile(x) }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13.5px] font-extrabold text-ink">{x.name}</span>
                      {x.verified && <VerifiedBadge size={15} />}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] font-bold text-muted">{L(CAT[x.cat].es, CAT[x.cat].en)} · {x.dist}</span>
                  </span>
                  <span className="flex-none text-[12.5px] font-extrabold text-ink">★ {x.rating}</span>
                </Card>
              ))}
        </div>
      )}

      {/* ============ REVIEWS ============ */}
      {tab === 'reviews' && (
        <div className="pt-4">
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {(
              [
                ['all', L('Todas', 'All')],
                ['5', '5 ★'],
                ['4', '4 ★'],
                ['3', '3 ★'],
              ] as const
            ).map(([k, lab]) => (
              <button key={k} onClick={() => setReviewFilter(k)} className={chip(reviewFilter === k)}>
                {lab}
              </button>
            ))}
            <button onClick={() => { setWriteOpen(true); setMyStars(5); setMyText(''); clearReviewPhotos(); }} className="ml-auto flex-none cursor-pointer rounded-full bg-primary px-4 py-2 text-[12.5px] font-extrabold text-white shadow-cta-sm">
              {L('Escribir reseña', 'Write a review')}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {[
              ...myReviews.map((r) => ({ id: r.id, ini: 'TÚ', name: L('Tú', 'You'), color: '#7B61FF', stars: r.stars, when: [L('ahora', 'now'), 'now'] as Bi, text: [r.text, r.text] as Bi, base: 0, reply: null as Bi | null, repliedAt: null as string | null, photos: r.photos })),
              ...(realReviews.length > 0
                ? realReviews.map((r) => ({ id: r.id, ini: r.initials, name: r.mine ? L('Tú', 'You') : r.name, color: AVATAR_PALETTE[r.id.charCodeAt(0) % AVATAR_PALETTE.length], stars: r.rating, when: reviewWhen(r.createdAt), text: r.body, base: 0, reply: r.reply, repliedAt: r.repliedAt, photos: r.photos }))
                : [
                    ...(revRaw ? [{ id: 'r0', ini: initials(rvName || 'V'), name: rvName || L('Vecino', 'Neighbor'), color: AVATAR_PALETTE[id % AVATAR_PALETTE.length], stars: 5, when: ['hace 2 días', '2d'] as Bi, text: [quote, quote] as Bi, base: 12, reply: null as Bi | null, repliedAt: null as string | null, photos: [] as string[] }] : []),
                    ...SEED_REVIEWS.map((r) => ({ ...r, reply: null as Bi | null, repliedAt: null as string | null, photos: [] as string[] })),
                  ]),
            ]
              .filter((r) => reviewFilter === 'all' || r.stars === +reviewFilter)
              .map((r) => {
                const on = !!reviewHelpful[r.id];
                return (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={r.ini} color={r.color} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-extrabold text-ink">{r.name}</div>
                        <div className="text-[10.5px] font-bold tracking-[1px] text-amber">{'★'.repeat(r.stars)}</div>
                      </div>
                      <span className="text-[11px] font-semibold text-muted-2">{B(r.when)}</span>
                    </div>
                    <div className="mt-2.5 text-[13px] font-medium leading-[1.55] text-ink-soft">{B(r.text)}</div>
                    {r.photos.length > 0 && (
                      <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
                        {r.photos.map((src) => (
                          <button key={src} onClick={() => setPhotoTile(src)} className="flex-none cursor-pointer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" loading="lazy" className="h-20 w-20 rounded-field object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    {r.reply && (r.reply[0] || r.reply[1]) && (
                      <div className="mt-3 rounded-xl border-l-[3px] border-primary bg-lilac-3 px-3.5 py-2.5">
                        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                          <span className="text-[11.5px] font-extrabold text-primary-dark">
                            {L(`Respuesta de ${b.name}`, `Response from ${b.name}`)}
                          </span>
                          {r.repliedAt && (
                            <span className="whitespace-nowrap text-[10.5px] font-semibold text-muted-2">· {B(reviewWhen(r.repliedAt))}</span>
                          )}
                        </div>
                        <div className="mt-1 text-[12.5px] font-medium leading-[1.5] text-ink-soft">{B(r.reply)}</div>
                      </div>
                    )}
                    <button
                      onClick={() => setReviewHelpful((m) => ({ ...m, [r.id]: !m[r.id] }))}
                      className={`mt-2.5 cursor-pointer text-[11.5px] font-extrabold ${on ? 'text-primary' : 'text-muted-2'}`}
                    >
                      👍 {L('Útil', 'Helpful')} · {r.base + (on ? 1 : 0)}
                    </button>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* cart bar */}
      {cartCount > 0 && !(tab === 'menu' && menuDisplayOnly) && !(tab === 'shop' && shopDisplayOnly) && (
        <button
          onClick={() => { setCartOpen(true); setDoneOrderId(null); }}
          className="fixed bottom-[86px] left-1/2 z-40 flex w-[calc(100%-28px)] max-w-[640px] -translate-x-1/2 cursor-pointer items-center justify-between rounded-2xl bg-ink px-5 py-3.5 text-white shadow-modal md:bottom-6"
        >
          <span className="text-[13px] font-extrabold">
            {cartCount} {L('artículos', 'items')} · {money(cartTotal)}
          </span>
          <span className="text-[13px] font-extrabold text-amber">{L('Ver carrito →', 'View cart →')}</span>
        </button>
      )}

      {/* contact sheet */}
      <Overlay open={contactOpen} onClose={() => setContactOpen(false)} width={400}>
        <OverlayTitle title={L('Contacto y opciones', 'Contact & options')} onClose={() => setContactOpen(false)} />
        <div className="flex flex-col">
          {([
            // In-app chat — always available; the message lands in the owner's inbox.
            { Icon: MessageCircle, label: L('Enviar mensaje', 'Send a message'), sub: L('Chatea en la app', 'Chat in the app'), color: '#7B61FF', bg: '#EFEBFF', onClick: openChat },
            { Icon: Phone, label: L('Llamar', 'Call'), sub: phone, color: '#1F9D57', bg: '#E3F5EA', href: `tel:${phone.replace(/[^\d+]/g, '')}`, onClick: () => trackListingView(b.slug, 'call') },
            // WhatsApp/SMS only when the owner opted in.
            ...(msgOn ? [{ Icon: Send, label: msgIsSms ? L('Mensaje de texto', 'Text message') : 'WhatsApp', sub: phone, color: '#1F9D57', bg: '#E3F5EA', href: msgHref }] : []),
            // Sitio web only shows when the owner set one; opens the real site.
            ...(b.website ? [{ Icon: Globe, label: L('Sitio web', 'Website'), sub: b.website, color: '#2F6FED', bg: '#E5EFFB', href: `https://${b.website}` }] : []),
            { Icon: Navigation, label: L('Cómo llegar', 'Directions'), sub: address, color: '#E8954A', bg: '#FCEBD6', href: mapsHref, onClick: () => trackListingView(b.slug, 'direction') },
            { Icon: Share, label: L('Compartir', 'Share'), sub: '', color: '#8A86A0', bg: '#F1EFFA' },
          ] as { Icon: typeof Phone; label: string; sub: string; color: string; bg: string; href?: string; onClick?: () => void }[]).map(({ Icon, label, sub, color, bg, href, onClick }) => {
            const inner = (
              <>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]" style={{ background: bg }}>
                  <Icon size={16} strokeWidth={2.2} style={{ color }} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-bold text-ink">{label}</span>
                  {sub && <span className="block truncate text-[11.5px] font-semibold text-muted">{sub}</span>}
                </span>
              </>
            );
            const cls = 'flex w-full cursor-pointer items-center gap-3 rounded-btn px-2 py-2.5 text-left hover:bg-app';
            return href ? (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" onClick={() => { onClick?.(); setContactOpen(false); }} className={cls}>{inner}</a>
            ) : (
              <button key={label} onClick={() => (onClick ? onClick() : setContactOpen(false))} className={cls}>{inner}</button>
            );
          })}
          <button onClick={() => setContactOpen(false)} className="mt-1 w-full cursor-pointer rounded-btn px-2 py-2.5 text-left text-[12.5px] font-bold text-pink-dark hover:bg-pink-bg">
            {L('Reportar un problema', 'Report a problem')}
          </button>
        </div>
      </Overlay>

      {/* in-app chat (buyer ↔ seller) */}
      <Overlay open={chatOpen} onClose={() => setChatOpen(false)} width={440}>
        <OverlayTitle title={b.name} onClose={() => setChatOpen(false)} />
        <div className="flex h-[58vh] flex-col md:h-[440px]">
          <div className="flex-1 overflow-y-auto py-2">
            {chatBusy && chatMsgs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[12.5px] font-semibold text-muted">{L('Cargando…', 'Loading…')}</div>
            ) : chatMsgs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lilac-2 text-primary-dark"><MessageCircle size={22} stroke={2.2} /></span>
                <div className="text-[13px] font-extrabold text-ink">{L(`Escríbele a ${b.name}`, `Message ${b.name}`)}</div>
                <div className="text-[11.5px] font-semibold leading-snug text-muted">{L('Pregunta por disponibilidad, precios o tu pedido. Te responden aquí mismo.', 'Ask about availability, pricing or your order. They reply right here.')}</div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {chatMsgs.map((m) => (
                  <div key={m.id} className={`flex ${m.fromOwner ? 'justify-start' : 'justify-end'}`}>
                    <span className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[12.5px] font-semibold leading-snug ${m.fromOwner ? 'bg-lilac-2 text-ink' : 'bg-primary text-white'}`}>{m.body}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-hair pt-2.5">
            <input value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }} placeholder={L('Escribe un mensaje…', 'Type a message…')} className="min-w-0 flex-1 rounded-full border-[1.5px] border-lilac-line bg-white px-4 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary" />
            <button onClick={sendChat} disabled={!chatDraft.trim()} aria-label={L('Enviar', 'Send')} className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-white shadow-cta-sm disabled:opacity-40"><Send size={16} stroke={2.4} /></button>
          </div>
        </div>
      </Overlay>

      {/* photo lightbox — a real photo (URL) or a placeholder gradient */}
      {photoTile && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(20,16,34,.82)] p-6" onClick={() => setPhotoTile(null)}>
          {isUrl(photoTile) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoTile} alt="" className="max-h-[80%] w-auto max-w-full rounded-card object-contain" />
          ) : (
            <div className="h-[70%] w-full max-w-[640px] rounded-card" style={{ background: photoTile }} />
          )}
        </div>
      )}

      {/* item customization modal */}
      <Overlay open={!!itemModal} onClose={() => setItemModal(null)} width={440} zIndex={80}>
        {itemModal && (() => {
          const mGroups = groupsFor(itemModal.catKey, itemModal.item);
          const mVarStock = variantStockAt(itemModal.item, mGroups, single); // null = not per-variant
          const mProdStock = shopStock(itemModal.catKey, itemModal.item);
          const mMax = mVarStock != null ? mVarStock : mProdStock != null ? mProdStock : Infinity;
          const mSoldOut = mMax <= 0;
          // Rich PDP (Wayfair/Amazon-style) when the owner filled the OPTIONAL
          // "Detalles del producto": gallery + brand + long description + specs.
          // Food/simple products keep the compact header untouched.
          const mIt = itemModal.item;
          const isProduct = itemModal.catKey.startsWith('sh:');
          const rich = !!(mIt.brand || mIt.longD || (mIt.specs && mIt.specs.length) || (mIt.photos && mIt.photos.length));
          const gallery = mIt.photos && mIt.photos.length ? mIt.photos : mIt.img ? [mIt.img] : [];
          const mOff = mIt.orig && mIt.orig > mIt.price ? Math.round((1 - mIt.price / mIt.orig) * 100) : 0;
          return (
          <>
            <OverlayTitle title={isProduct ? L('Detalle del producto', 'Product details') : L('Personaliza tu platillo', 'Customize your item')} onClose={() => setItemModal(null)} />
            {rich ? (
              <>
                {/* photo gallery — swipeable when there are 2+ photos */}
                <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1">
                  {(gallery.length ? gallery : ['']).map((u, i) => (
                    <div key={i} className={`relative aspect-[4/3] flex-none snap-center overflow-hidden rounded-card ${gallery.length > 1 ? 'w-[86%]' : 'w-full'}`} style={{ background: `repeating-linear-gradient(135deg,${mIt.bg})` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {u && <img src={u} alt={`${B(mIt.n)} ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />}
                      {mOff > 0 && i === 0 && <span className="absolute left-2.5 top-2.5 rounded-md bg-pink px-2 py-0.5 text-[11px] font-extrabold text-white shadow-card">−{mOff}%</span>}
                      {gallery.length > 1 && <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-extrabold text-white">{i + 1}/{gallery.length}</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  {mIt.brand && <div className="text-[10.5px] font-extrabold uppercase tracking-[.06em] text-primary-dark">{mIt.brand}</div>}
                  <div className="mt-0.5 text-[17px] font-extrabold leading-snug text-ink">{B(mIt.n)}</div>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                    <span className="text-[20px] font-extrabold text-ink">{money(mIt.price)}</span>
                    {mOff > 0 && <span className="text-[13px] font-bold text-muted line-through">{money(mIt.orig!)}</span>}
                    {mOff > 0 && <span className="rounded-md bg-pink-bg px-1.5 py-0.5 text-[10.5px] font-extrabold text-pink-dark">{L('Ahorras', 'You save')} {money(mIt.orig! - mIt.price)}</span>}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="relative h-14 w-14 flex-none overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${mIt.bg})` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {mIt.img && <img src={mIt.img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                </span>
                <div className="min-w-0">
                  <div className="text-[15px] font-extrabold text-ink">{B(mIt.n)}</div>
                  <div className="text-[12px] font-semibold text-muted">{B(mIt.d)}</div>
                </div>
                <span className="ml-auto text-[14px] font-extrabold text-ink">{money(mIt.price)}</span>
              </div>
            )}
            {mGroups.map((g) => (
              <div key={g.id} className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-extrabold text-ink">{B(g.name)}</span>
                  <span className="text-[11px] font-bold text-muted">{g.type === 'multi' ? L('Opcional', 'Optional') : L('Elige 1', 'Choose 1')}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {g.choices.map((ch, i) => {
                    const sel = g.type === 'single' ? single[g.id] === i : !!multi[`${g.id}:${i}`];
                    // per-variant: this value is sold out if picking it (with the
                    // other axes as chosen) yields a 0-stock variant.
                    const vSoldOut = g.type === 'single' && variantStockAt(itemModal.item, mGroups, single, g.id, i) === 0;
                    return (
                      <button
                        key={ch.label[0]}
                        disabled={vSoldOut}
                        onClick={() =>
                          g.type === 'single'
                            ? setSingle((m) => ({ ...m, [g.id]: i }))
                            : setMulti((m) => ({ ...m, [`${g.id}:${i}`]: !m[`${g.id}:${i}`] }))
                        }
                        className={`flex w-full items-center gap-3 rounded-field border px-3 py-2.5 text-left ${vSoldOut ? 'cursor-not-allowed border-hair bg-lilac-2/50 opacity-60' : 'cursor-pointer border-hair bg-white'}`}
                      >
                        {g.type === 'multi' ? (
                          <span className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] ${sel ? 'bg-primary text-white' : 'border-2 border-[#D9D5E6]'}`}>
                            {sel && <Check size={13} stroke={3.4} />}
                          </span>
                        ) : (
                          <span className={`h-[22px] w-[22px] flex-none rounded-full ${sel && !vSoldOut ? 'border-[7px] border-primary' : 'border-2 border-[#D9D5E6]'}`} />
                        )}
                        <span className={`flex-1 text-[13px] font-bold ${vSoldOut ? 'text-muted-2 line-through' : 'text-ink'}`}>{B(ch.label)}</span>
                        {vSoldOut ? <span className="text-[10.5px] font-extrabold text-pink-dark">{L('Agotado', 'Sold out')}</span>
                          : ch.price > 0 ? <span className="text-[12px] font-extrabold text-muted">+{money(ch.price)}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {/* per-variant stock hint for the current selection */}
            {mVarStock != null && mVarStock > 0 && mVarStock <= 5 && (
              <div className="mt-3 text-[11.5px] font-bold text-amber-ink">{L(`Solo ${mVarStock} disponibles`, `Only ${mVarStock} left`)}</div>
            )}
            {/* rich PDP: long description + spec table (Wayfair/Amazon style) */}
            {rich && mIt.longD && (
              <div className="mt-4">
                <div className="mb-1.5 text-[13px] font-extrabold text-ink">{L('Descripción', 'Description')}</div>
                <p className="whitespace-pre-line text-[12.5px] font-medium leading-relaxed text-ink-body">{B(mIt.longD)}</p>
              </div>
            )}
            {rich && mIt.specs && mIt.specs.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 text-[13px] font-extrabold text-ink">{L('Especificaciones', 'Specifications')}</div>
                <div className="overflow-hidden rounded-card-sm border border-hair">
                  {mIt.specs.map((s, i) => (
                    <div key={i} className={`flex gap-3 px-3.5 py-2.5 text-[12px] ${i % 2 === 0 ? 'bg-app' : 'bg-white'}`}>
                      <span className="w-[38%] flex-none font-extrabold text-ink-soft">{B(s.k)}</span>
                      <span className="min-w-0 flex-1 font-semibold text-ink-3">{B(s.v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* special instructions (design: Item Detail) — travels with the order line */}
            <div className="mb-1.5 mt-4 text-[13px] font-extrabold text-ink">{isProduct ? L('Nota para el vendedor', 'Note for the seller') : L('Instrucciones especiales', 'Special instructions')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span></div>
            <input
              value={modalNote}
              onChange={(e) => setModalNote(e.target.value)}
              maxLength={200}
              placeholder={isProduct ? L('Ej. color preferido, referencia de entrega…', 'E.g. preferred color, delivery reference…') : L('Ej. sin cebolla, salsa aparte…', 'E.g. no onions, sauce on the side…')}
              className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[12.5px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary"
            />
            <div className="mt-5 flex items-center gap-3">
              <div className="flex flex-none items-center gap-3 rounded-full bg-lilac-2 px-2 py-1.5">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-ink">−</button>
                <span className="w-4 text-center text-[14px] font-extrabold">{qty}</span>
                <button onClick={() => { if (mGroups.length > 0 && qty === 1) { setSheetAsk(true); return; } setQty(Math.min(mMax, qty + 1)); }} disabled={qty >= mMax} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-ink disabled:opacity-40">+</button>
              </div>
              <PrimaryBtn className="mt-0" disabled={mSoldOut} onClick={() => addFromModal()}>
                {mSoldOut ? L('Agotado', 'Sold out') : `${L('Agregar', 'Add')} ${qty} · ${money(modalUnit * qty)}`}
              </PrimaryBtn>
            </div>
          </>
          );
        })()}
      </Overlay>

      {/* customize-sheet stepper "+": add another of THIS dish — the same, or a
          different variant without leaving the sheet ("Cambiar algo" adds the
          one you built and resets the sheet for the next). Stacks over the sheet. */}
      {sheetAsk && itemModal && (
        <Overlay open onClose={() => setSheetAsk(false)} width={380} zIndex={90}>
          <OverlayTitle title={L('Agregar otro', 'Add another')} onClose={() => setSheetAsk(false)} />
          <div className="text-[13.5px] font-extrabold text-ink">{B(itemModal.item.n)}</div>
          <div className="mt-4 text-[13px] font-bold text-ink-2">{L('¿Lo deseas igual o quieres cambiar algo?', 'Want it the same, or change something?')}</div>
          <div className="mt-4 flex flex-col gap-2.5">
            <button
              onClick={() => { setQty((q) => q + 1); setSheetAsk(false); }}
              className="w-full cursor-pointer rounded-field bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm"
            >
              {L('Sí, igual', 'Yes, the same')}
            </button>
            <button
              onClick={() => { addFromModal(true); setSheetAsk(false); }}
              className="w-full cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white py-2.5 text-[13px] font-extrabold text-ink"
            >
              {L('Cambiar algo', 'Change something')}
              <span className="mt-0.5 block text-[10.5px] font-semibold text-muted">{L('Agrega este y arma otro distinto', 'Adds this one, then build another')}</span>
            </button>
          </div>
        </Overlay>
      )}

      {/* "+"  on a customizable item already in the cart: same customization
          again, or build a different one? Drives BOTH the menu card's stepper
          (no `key` → the item's most-recent line) and the cart's per-line
          stepper (`key` → that exact line). */}
      {addPrompt && (() => {
        const base = `${addPrompt.catKey}:${B(addPrompt.item.n)}`;
        const keys = Object.keys(cart).filter((k) => k === base || k.startsWith(`${base}|`));
        const lastKey = addPrompt.key ?? keys[keys.length - 1];
        const last = lastKey ? cart[lastKey] : null;
        return (
          <Overlay open onClose={() => setAddPrompt(null)} width={380} zIndex={80}>
            <OverlayTitle title={L('Agregar otro', 'Add another')} onClose={() => setAddPrompt(null)} />
            <div className="text-[13.5px] font-extrabold text-ink">{B(addPrompt.item.n)}</div>
            {last && (last.optsLabel || last.note) && (
              <div className="mt-1 text-[11.5px] font-semibold leading-snug text-muted">
                {L('Última selección:', 'Last selection:')} {last.optsLabel}{last.note ? `${last.optsLabel ? ' · ' : ''}“${last.note}”` : ''}
              </div>
            )}
            <div className="mt-4 text-[13px] font-bold text-ink-2">{L('¿Lo deseas igual o quieres cambiar algo?', 'Want it the same, or change something?')}</div>
            <div className="mt-4 flex flex-col gap-2.5">
              <button
                onClick={() => { if (lastKey) incLine(lastKey); setAddPrompt(null); }}
                className="w-full cursor-pointer rounded-field bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm"
              >
                {L('Sí, igual', 'Yes, the same')}
              </button>
              <button
                onClick={() => { const p = addPrompt; setAddPrompt(null); openItem(p.catKey, p.item); }}
                className="w-full cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white py-3 text-[13px] font-extrabold text-ink"
              >
                {L('Cambiar algo', 'Change something')}
              </button>
            </div>
          </Overlay>
        );
      })()}

      {/* trash/− with 2+ different customized lines of the same item: which one? */}
      {removePrompt && (() => {
        const key = `${removePrompt.catKey}:${B(removePrompt.item.n)}`;
        const keys = Object.keys(cart).filter((k) => k === key || k.startsWith(`${key}|`));
        return (
          <Overlay open onClose={() => setRemovePrompt(null)} width={400} zIndex={80}>
            <OverlayTitle title={L('¿Cuál deseas eliminar?', 'Which one do you want to remove?')} onClose={() => setRemovePrompt(null)} />
            <div className="text-[11.5px] font-semibold leading-snug text-muted">
              {L('Tienes varias versiones de este platillo en tu carrito.', 'You have a few versions of this item in your cart.')}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {keys.map((k) => {
                const line = cart[k];
                if (!line) return null;
                return (
                  <button
                    key={k}
                    onClick={() => { decLine(k); setRemovePrompt(null); }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-left"
                  >
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-lilac text-[11px] font-extrabold text-primary-dark">{line.qty}×</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-extrabold text-ink">{line.optsLabel || L('Sin personalizar', 'No customization')}</span>
                      {line.note && <span className="block text-[10.5px] font-semibold text-muted-2">“{line.note}”</span>}
                    </span>
                    <Trash2 size={15} stroke={2.2} className="flex-none text-pink-dark" />
                  </button>
                );
              })}
            </div>
          </Overlay>
        );
      })()}

      {/* cart sheet / checkout (DoorDash-grade: canal, dirección, propina, desglose) */}
      <Overlay open={cartOpen} onClose={() => { setCartOpen(false); setCartView('cart'); setDoneOrderId(null); }} width={440}>
        {doneOrderId !== null ? (() => {
          // Cash confirmation — SAME live experience as the paid one: starts at
          // "Esperando confirmación" and advances when the business accepts
          // (the order row is live via useMyActivity's realtime channel).
          const o = act.orders.find((x) => x.id === doneOrderId);
          const stageIdx = orderStageIdx(o);
          const oDelivery = (o?.channel ?? (isDelivery ? 'delivery' : 'pickup')) === 'delivery';
          const of = o?.fulfillment ?? null;
          const collect = of?.collect_total ?? o?.total ?? null;
          const closeDone = () => { setCartOpen(false); setDoneOrderId(null); setCartView('cart'); };
          return (
            <div className="flex flex-col">
              <div className="flex flex-col items-center pt-2 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
                  <Check size={30} stroke={3.2} className="text-green" />
                </span>
                <div className="mt-3.5 text-[20px] font-extrabold text-ink">{L('¡Pedido recibido!', 'Order placed!')}</div>
                <div className="mt-1 max-w-[320px] text-[12.5px] font-semibold leading-relaxed text-muted">
                  {stageIdx > 0
                    ? L(`${b.name} confirmó tu pedido y lo está preparando.`, `${b.name} confirmed your order and is preparing it.`)
                    : L(`Enviamos tu pedido a ${b.name}. Te avisamos apenas lo confirme.`, `We sent your order to ${b.name}. We'll let you know as soon as they confirm it.`)}
                </div>
                {o?.code && <span className="mt-2 rounded-full bg-lilac-2 px-3 py-1 text-[11px] font-extrabold text-primary-dark">{L('Pedido', 'Order')} {o.code}</span>}
              </div>

              {of?.eta_range && (
                <div className="mt-4 flex items-center gap-3 rounded-card bg-primary px-4 py-3.5 text-white">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/20"><Clock size={19} stroke={2.4} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10.5px] font-bold uppercase tracking-[.04em] text-white/80">{oDelivery ? L('Llega en aprox.', 'Estimated arrival') : L('Listo para recoger en', 'Ready for pickup in')}</span>
                    <span className="block text-[17px] font-extrabold">{of.eta_range}</span>
                  </span>
                </div>
              )}

              <div className="mt-4"><OrderStepsVertical stageIdx={stageIdx} isDelivery={oDelivery} /></div>

              <div className="mt-3 rounded-card border border-hair bg-white p-4 text-[12.5px] font-semibold text-ink-2 shadow-card">
                {(o?.items ?? []).slice(0, 6).map((it, i) => (
                  <div key={i} className="flex justify-between gap-3 py-0.5">
                    <span className="min-w-0 flex-1 truncate">{it.qty}× {it.name}</span>
                    {it.price != null && <span className="flex-none">{money(it.price * it.qty)}</span>}
                  </div>
                ))}
                {collect != null && (
                  <div className="mt-1.5 flex justify-between border-t border-hair pt-2 text-[13.5px] font-extrabold text-ink">
                    <span>{L('Total a pagar', 'Total due')}</span><span>{money(Number(collect))}</span>
                  </div>
                )}
                <div className="mt-1 text-[11px] font-bold text-amber-ink">
                  {oDelivery ? L('Pagas en efectivo al recibir tu pedido.', 'Pay cash when your order arrives.') : L('Pagas en efectivo al recoger tu pedido.', 'Pay cash when you pick up your order.')}
                </div>
              </div>

              <PrimaryBtn className="mt-4" onClick={() => { const target = `/cuenta/?sec=pedidos${o ? `&order=${o.id}` : ''}`; closeDone(); router.push(target); }}>
                {L('Seguir mi pedido', 'Track my order')}
                <ChevronRight size={15} stroke={2.8} className="ml-0.5 inline" />
              </PrimaryBtn>
              <button onClick={closeDone} className="mt-2 w-full cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white py-2.5 text-[12.5px] font-extrabold text-ink">
                {L('Seguir explorando', 'Keep browsing')}
              </button>
            </div>
          );
        })() : cartView === 'address' ? (
          <>
            <OverlayTitle title={L('Dirección de entrega', 'Delivery address')} onClose={() => setCartView('cart')} />
            {addressStore.addresses.length === 0 ? (
              <div className="py-6 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lilac"><MapPin size={20} className="text-primary" stroke={2.2} /></span>
                <div className="mt-3 text-[13.5px] font-extrabold text-ink">{L('Aún no tienes direcciones guardadas', 'No saved addresses yet')}</div>
                <div className="mx-auto mt-1 max-w-[280px] text-[12px] font-semibold text-muted">{L('Agrega tu dirección para recibir tu pedido.', 'Add your address to get your order delivered.')}</div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {addressStore.addresses.map((a) => {
                  const on = (chosenAddr?.id ?? null) === a.id;
                  return (
                    <button key={a.id} onClick={() => { setAddrId(a.id); setCartView('cart'); }} className={`flex items-center gap-3 rounded-field border-[1.5px] p-3 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${on ? 'bg-primary' : 'bg-lilac-2'}`}>
                        <MapPin size={15} stroke={2.4} className={on ? 'text-white' : 'text-primary'} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-extrabold text-ink">{a.label || L('Dirección', 'Address')}{a.is_default ? ` · ${L('Principal', 'Default')}` : ''}</span>
                        <span className="block truncate text-[11.5px] font-semibold text-muted">{a.formatted}</span>
                      </span>
                      {on && <Check size={16} stroke={3} className="flex-none text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={() => app.openDeliveryAddress()} className="mt-3 w-full cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white px-4 py-3 text-[12.5px] font-extrabold text-primary-dark">
              {L('+ Nueva dirección', '+ New address')}
            </button>
          </>
        ) : (
          <>
            <OverlayTitle title={storeCart ? L('Tu carrito', 'Your cart') : L('Tu pedido', 'Your order')} onClose={() => setCartOpen(false)} />
            {cartCount === 0 && savedLines.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-[14px] font-extrabold text-ink">{L('Tu carrito está vacío', 'Your cart is empty')}</div>
                <div className="mt-1 text-[12px] font-semibold text-muted">{realShop ? L('Agrega productos de la tienda para empezar.', 'Add products from the store to start.') : L('Agrega platillos del menú para empezar.', 'Add items from the menu to start.')}</div>
              </div>
            ) : cartCount === 0 ? (
              // only saved-for-later items remain — surface them so nothing is "lost"
              <div className="py-2 text-center text-[12.5px] font-semibold text-muted">{L('Tu carrito está vacío — tienes artículos guardados para después.', 'Your cart is empty — you have items saved for later.')}</div>
            ) : (
              <>
                {storeCart && cartSavings > 0 && (
                  <div className="mb-2.5 flex items-center gap-2 rounded-field bg-green-bg px-3 py-2 text-[11.5px] font-extrabold text-green-dark">
                    <Check size={13} stroke={3} />{L(`Estás ahorrando ${money(cartSavings)} en ofertas`, `You're saving ${money(cartSavings)} on deals`)}
                  </div>
                )}
                <div className={`flex flex-col overflow-y-auto ${storeCart ? 'max-h-[300px] gap-3' : 'max-h-[240px] gap-2.5'}`}>
                  {Object.entries(cart).map(([k, l]) => {
                    if (!storeCart) return (
                      <div key={k} className="flex items-center gap-3">
                        <span className="h-11 w-11 flex-none rounded-[10px]" style={{ background: `repeating-linear-gradient(135deg,${l.bg})` }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-extrabold text-ink">{l.name}</span>
                          {l.optsLabel && <span className="block truncate text-[11px] font-semibold text-muted">{l.optsLabel}</span>}
                          {l.note && <span className="block truncate text-[10.5px] font-semibold italic text-muted-2">“{l.note}”</span>}
                        </span>
                        <span className="flex flex-none items-center gap-2 rounded-full bg-lilac-2 px-1.5 py-1">
                          <button onClick={() => decLine(k)} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-[14px] font-extrabold">−</button>
                          <span className="w-3 text-center text-[12.5px] font-extrabold">{l.qty}</span>
                          <button onClick={() => incCartLine(k)} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-[14px] font-extrabold">+</button>
                        </span>
                        <span className="w-14 flex-none text-right text-[13px] font-extrabold text-ink">{money(l.unit * l.qty)}</span>
                      </div>
                    );
                    // Amazon-style store line: photo, variant, sale strikethrough,
                    // stock warning, qty stepper + Guardar para después / Eliminar.
                    const found = shopItemForKey(k);
                    const stk = found ? shopStock(found.catKey, found.item) : null;
                    const lowStk = stk != null && stk > 0 && stk <= 5;
                    return (
                      <div key={k} className="rounded-card-sm border border-hair bg-white p-3 shadow-card">
                        <div className="flex gap-3">
                          <span className="relative h-16 w-16 flex-none overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${l.bg})` }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {l.img && <img src={l.img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-[13px] font-extrabold leading-snug text-ink">{l.name}</div>
                            {l.optsLabel && <div className="mt-0.5 truncate text-[11px] font-semibold text-muted">{l.optsLabel}</div>}
                            {l.note && <div className="truncate text-[10.5px] font-semibold italic text-muted-2">“{l.note}”</div>}
                            <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                              <span className="text-[13.5px] font-extrabold text-ink">{money(l.unit)}</span>
                              {l.orig && l.orig > l.unit && <span className="text-[11px] font-bold text-muted line-through">{money(l.orig)}</span>}
                              {lowStk && <span className="rounded-md bg-amber-bg px-1.5 py-0.5 text-[8.5px] font-extrabold text-amber-ink">{L('Quedan', 'Left')} {stk}</span>}
                            </div>
                          </div>
                          <span className="w-16 flex-none text-right text-[13.5px] font-extrabold text-ink">{money(l.unit * l.qty)}</span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between border-t border-hair pt-2">
                          <span className="flex items-center gap-2 rounded-full bg-lilac-2 px-1.5 py-1">
                            <button onClick={() => decLine(k)} aria-label={l.qty === 1 ? L('Eliminar', 'Remove') : L('Quitar uno', 'Remove one')} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-primary-dark">{l.qty === 1 ? <Trash2 size={12} stroke={2.2} /> : <Minus size={13} stroke={2.8} />}</button>
                            <span className="w-4 text-center text-[12.5px] font-extrabold tabular-nums">{l.qty}</span>
                            <button onClick={() => incCartLine(k)} aria-label={L('Agregar uno', 'Add one')} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-primary-dark"><Plus size={13} stroke={2.8} /></button>
                          </span>
                          <span className="flex items-center gap-3 text-[11px] font-extrabold">
                            <button onClick={() => saveForLater(k)} className="cursor-pointer text-primary-dark">{L('Guardar para después', 'Save for later')}</button>
                            <span className="text-lilac-line">|</span>
                            <button onClick={() => removeLine(k)} className="cursor-pointer text-pink-dark">{L('Eliminar', 'Remove')}</button>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Entrega / Recoger */}
                {deliveryAvailable && (
                  <div className="mt-3.5 flex gap-1 rounded-full bg-lilac-2 p-1">
                    {deliveryAvailable && (
                      <button onClick={() => setOrderChannel('delivery')} className={`flex-1 cursor-pointer rounded-full py-2 text-center ${orderChannel === 'delivery' ? 'bg-white shadow-cta-sm' : ''}`}>
                        <span className={`block text-[11.5px] font-extrabold ${orderChannel === 'delivery' ? 'text-primary-dark' : 'text-muted'}`}>{L('Entrega', 'Delivery')}</span>
                        {/* the OWNER's own time label ("2–5 días" muebles, "30–45 min" comida) */}
                        <span className="block text-[9.5px] font-bold text-muted">{del?.time ?? (del?.prep ? `${del.prep}–${del.prep + 15} min` : '30–45 min')}</span>
                      </button>
                    )}
                    <button onClick={() => setOrderChannel('pickup')} className={`flex-1 cursor-pointer rounded-full py-2 text-center ${!isDelivery ? 'bg-white shadow-cta-sm' : ''}`}>
                      <span className={`block text-[11.5px] font-extrabold ${!isDelivery ? 'text-primary-dark' : 'text-muted'}`}>{L('Recoger', 'Pickup')}</span>
                      <span className="block text-[9.5px] font-bold text-muted">{storeCart ? L('En tienda', 'In store') : del?.prep ? `${del.prep} min` : '15–25 min'}</span>
                    </button>
                  </div>
                )}

                {/* dirección + instrucciones (solo entrega) */}
                {isDelivery && (
                  <>
                    <button onClick={() => setCartView('address')} className="mt-3 flex w-full cursor-pointer items-center gap-3 rounded-field border-[1.5px] border-lilac-line bg-white p-3 text-left">
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-lilac-2"><MapPin size={15} stroke={2.4} className="text-primary" /></span>
                      <span className="min-w-0 flex-1">
                        {chosenAddr ? (
                          <>
                            <span className="block truncate text-[12.5px] font-extrabold text-ink">{chosenAddr.label || L('Entregar en', 'Deliver to')}</span>
                            <span className="block truncate text-[11.5px] font-semibold text-muted">{chosenAddr.formatted}</span>
                          </>
                        ) : (
                          <span className="block text-[12.5px] font-extrabold text-primary-dark">{L('Elige tu dirección de entrega', 'Choose your delivery address')}</span>
                        )}
                      </span>
                      <ChevronRight size={16} className="flex-none text-muted" />
                    </button>
                    {/* out of the delivery radius → hard stop: explain with the real
                        numbers and point to the two ways out (address / pickup) */}
                    {outOfRange && (
                      <div className="mt-2 rounded-field bg-pink-bg px-3 py-2.5">
                        <div className="text-[12px] font-extrabold text-pink-dark">{L('Esta dirección está fuera del rango de entrega', 'This address is outside the delivery range')}</div>
                        <div className="mt-0.5 text-[11px] font-semibold leading-snug text-ink-3">
                          {rangeCheck?.distanceMi != null && rangeCheck?.radiusMi != null
                            ? L(
                                `Está a ${(Math.round(rangeCheck.distanceMi * 10) / 10).toLocaleString()} mi y ${b.name} entrega hasta ${(Math.round(rangeCheck.radiusMi * 10) / 10).toLocaleString()} mi. `,
                                `It's ${(Math.round(rangeCheck.distanceMi * 10) / 10).toLocaleString()} mi away and ${b.name} delivers up to ${(Math.round(rangeCheck.radiusMi * 10) / 10).toLocaleString()} mi. `,
                              )
                            : ''}
                          {L('Elige otra dirección o cambia a Recoger.', 'Choose another address or switch to Pickup.')}
                        </div>
                      </div>
                    )}
                    {/* Instrucciones de entrega — estilo DoorDash: preferencia de
                        entrega (predeterminada) + detalles rápidos + nota libre. */}
                    <div className="mt-3">
                      <div className="text-[12px] font-extrabold text-ink">{L('Instrucciones de entrega', 'Delivery instructions')}</div>
                      {/* preferencia (una sola) */}
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {DROPOFF_OPTS.map((o) => {
                          const on = dropoff === o.key;
                          return (
                            <button key={o.key} onClick={() => setDropoff(o.key)} aria-pressed={on}
                              className={`flex min-h-[56px] cursor-pointer flex-col items-center justify-center gap-1 rounded-field border-[1.5px] px-1 py-2 text-center ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                              <o.Icon size={17} stroke={2.2} className={on ? 'text-primary' : 'text-muted-2'} />
                              <span className={`text-[11px] font-extrabold leading-tight ${on ? 'text-primary-dark' : 'text-ink-soft'}`}>{L(o.es, o.en)}</span>
                            </button>
                          );
                        })}
                      </div>
                      {/* detalles rápidos (varios) */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {INS_DETAILS.map((x) => {
                          const on = insDetails.includes(x.key);
                          return (
                            <button key={x.key} onClick={() => toggleDetail(x.key)} aria-pressed={on}
                              className={`flex cursor-pointer items-center gap-1 rounded-chip border-[1.5px] px-2.5 py-1.5 text-[11px] font-extrabold ${on ? 'border-primary bg-lilac-3 text-primary-dark' : 'border-lilac-line bg-white text-ink-soft'}`}>
                              {on && <Check size={12} stroke={3} className="text-primary" />}{L(x.es, x.en)}
                            </button>
                          );
                        })}
                      </div>
                      {/* nota libre */}
                      <input
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        maxLength={300}
                        placeholder={L('Otra nota: apto, código de puerta, referencia…', 'Other note: apt, gate code, landmark…')}
                        className="mt-2 w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[12.5px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary"
                      />
                    </div>
                    {/* propina para el repartidor — política PROPIA del negocio: solo
                        aparece si el dueño la activó (del.tips) y en pago con tarjeta
                        (en efectivo el cliente le da la propina al repartidor directo) */}
                    {tipsEnabled && (<>
                    <div className="mt-3 text-[12px] font-extrabold text-ink">{L('Propina para el repartidor', 'Tip for your driver')} <span className="font-semibold text-muted">· {L('100% para él/ella', '100% goes to them')}</span></div>
                    <div className="mt-1.5 flex gap-1.5">
                      <button onClick={() => { setCustomTipOn(false); setTipSel(0); }} className={`flex-1 cursor-pointer rounded-btn border-[1.5px] py-1.5 text-center ${!customTipOn && tipSel === 0 ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                        <span className={`block text-[11.5px] font-extrabold ${!customTipOn && tipSel === 0 ? 'text-primary-dark' : 'text-ink-soft'}`}>{L('Sin', 'None')}</span>
                      </button>
                      {(tipCfg?.presets ?? []).filter((p) => p > 0).map((p) => {
                        const on = !customTipOn && tipSel === p;
                        const isPct = tipCfg?.mode !== 'amount';
                        return (
                          <button key={p} onClick={() => { setCustomTipOn(false); setTipSel(p); }} className={`flex-1 cursor-pointer rounded-btn border-[1.5px] py-1.5 text-center ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                            <span className={`block text-[11.5px] font-extrabold ${on ? 'text-primary-dark' : 'text-ink-soft'}`}>{isPct ? `${p}%` : money(p)}</span>
                            {isPct && <span className="block text-[9.5px] font-bold text-muted">{money(+(cartTotal * p / 100).toFixed(2))}</span>}
                          </button>
                        );
                      })}
                      {tipCfg?.custom && (
                      <button onClick={() => setCustomTipOn(true)} className={`flex-1 cursor-pointer rounded-btn border-[1.5px] py-1.5 text-center ${customTipOn ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                        <span className={`block text-[11.5px] font-extrabold ${customTipOn ? 'text-primary-dark' : 'text-ink-soft'}`}>{L('Otra', 'Other')}</span>
                        <span className="block text-[9.5px] font-bold text-muted">$</span>
                      </button>
                      )}
                    </div>
                    {customTipOn && (
                      <input
                        value={tipCustom} inputMode="decimal"
                        onChange={(e) => setTipCustom(e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder={L('Propina en $ — ej. 4.00', 'Tip in $ — e.g. 4.00')}
                        className="mt-2 w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[12.5px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary"
                      />
                    )}
                    </>)}
                  </>
                )}

                {/* código de promoción — del NEGOCIO (check_promo). El negocio lo
                    crea en su panel; aquí el cliente lo canjea. */}
                <div className="mt-3">
                  {promo ? (
                    <div className="flex items-center justify-between gap-2 rounded-field bg-green-bg px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-[12px] font-extrabold text-green-dark">{L('Código', 'Code')} {promo.code} · −{money(discount)}</div>
                        {promo.label && <div className="truncate text-[10.5px] font-semibold text-green-dark/80">{promo.label}</div>}
                      </div>
                      <button onClick={clearPromo} className="flex-none cursor-pointer text-[11px] font-extrabold text-green-dark underline">{L('Quitar', 'Remove')}</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input value={promoInput} onChange={(e) => { setPromoInput(e.target.value.toUpperCase().replace(/\s+/g, '')); setPromoErr(''); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') applyPromo(); }}
                          placeholder={L('Código de promoción', 'Promo code')} maxLength={24}
                          className="min-w-0 flex-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[12.5px] font-extrabold uppercase text-ink outline-none placeholder:font-semibold placeholder:normal-case placeholder:text-muted focus:border-primary" />
                        <button onClick={applyPromo} disabled={!promoInput.trim() || promoBusy}
                          className="flex-none cursor-pointer rounded-field bg-lilac-2 px-4 py-2.5 text-[12.5px] font-extrabold text-primary-dark disabled:opacity-50">{promoBusy ? '…' : L('Aplicar', 'Apply')}</button>
                      </div>
                      {promoErr && <div className="mt-1 text-[11px] font-semibold text-pink-dark">{promoErr}</div>}
                    </>
                  )}
                </div>

                {/* desglose — coincide EXACTO con el cobro de Stripe (o efectivo) */}
                <div className="mt-4 flex flex-col gap-1.5 border-t border-hair pt-3 text-[12.5px] font-semibold text-ink-2">
                  <div className="flex justify-between"><span>{L('Subtotal', 'Subtotal')}</span><span>{money(cartTotal)}</span></div>
                  {isDelivery && <div className="flex justify-between"><span>{L('Tarifa de entrega', 'Delivery fee')}</span><span>{money(deliveryFee)}</span></div>}
                  {payOnline && <div className="flex justify-between"><span>{L('Tarifa de servicio', 'Service fee')}</span><span>{money(serviceFee)}</span></div>}
                  {tip > 0 && <div className="flex justify-between"><span>{L('Propina', 'Tip')}</span><span>{money(tip)}</span></div>}
                  {discount > 0 && <div className="flex justify-between text-green-dark"><span>{L('Descuento', 'Discount')}{promo ? ` · ${promo.code}` : ''}</span><span>−{money(discount)}</span></div>}
                  <div className="flex justify-between text-[14px] font-extrabold text-ink"><span>{L('Total', 'Total')}</span><span>{money(grandTotal)}</span></div>
                  <div className="mt-1 text-[11px] font-semibold text-muted">
                    {payOnline
                      ? L('Pago seguro con tarjeta. Recibirás confirmación al instante.', 'Secure card payment. You’ll get instant confirmation.')
                      : isDelivery
                        ? L('Pagas en efectivo al recibir tu pedido. Sin cargos en línea.', 'Pay cash on delivery. No online charge.')
                        : L('Pagas en efectivo al recoger. Sin cargos en línea.', 'Pay cash at pickup. No online charge.')}
                  </div>
                </div>
                {belowMin && (
                  <div className="mt-2 rounded-field bg-amber-bg px-3 py-2.5">
                    <div className="text-[11.5px] font-bold text-amber-ink">
                      {L(`Te faltan ${money((del?.min ?? 0) - cartTotal)} para el mínimo de entrega (${money(del?.min ?? 0)})`, `Add ${money((del?.min ?? 0) - cartTotal)} more to reach the delivery minimum (${money(del?.min ?? 0)})`)}
                    </div>
                    {/* progress toward the minimum — positive framing, Instacart-style */}
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/70">
                      <div className="h-full rounded-full bg-amber transition-all" style={{ width: `${Math.min(100, Math.round((cartTotal / Math.max(0.01, del?.min ?? 0)) * 100))}%` }} />
                    </div>
                  </div>
                )}
                <PrimaryBtn className="mt-4" onClick={payOnline ? payCart : placeCart} disabled={paying || belowMin || outOfRange}>
                  {paying
                    ? L('Procesando…', 'Processing…')
                    : outOfRange
                      ? L('Fuera del rango de entrega', 'Outside the delivery range')
                      : isDelivery && !chosenAddr
                        ? L('Elige tu dirección', 'Choose your address')
                        : <>{payOnline ? L('Pagar · ', 'Pay · ') : L('Realizar pedido · ', 'Place order · ')}{money(grandTotal)}</>}
                </PrimaryBtn>
              </>
            )}

            {/* ── Guardado para después (Amazon-style) — parked items, 30 days ── */}
            {savedLines.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-[13px] font-extrabold text-ink">{L('Guardado para después', 'Saved for later')} <span className="font-semibold text-muted">· {savedLines.length}</span></div>
                <div className="flex flex-col gap-2">
                  {savedLines.map((sv, i) => (
                    <div key={sv.key} className="flex items-center gap-3 rounded-card-sm border border-dashed border-lilac-line bg-app p-2.5">
                      <span className="relative h-12 w-12 flex-none overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${sv.line.bg})` }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {sv.line.img && <img src={sv.line.img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-extrabold text-ink">{sv.line.name}</span>
                        <span className="block text-[11.5px] font-bold text-ink-soft">{money(sv.line.unit)}{sv.line.qty > 1 ? ` × ${sv.line.qty}` : ''}{sv.line.optsLabel ? ` · ${sv.line.optsLabel}` : ''}</span>
                      </span>
                      <span className="flex flex-none flex-col items-end gap-1.5">
                        <button onClick={() => moveSavedToCart(i)} className="cursor-pointer rounded-full bg-primary px-3 py-1.5 text-[11px] font-extrabold text-white shadow-cta-sm">{L('Mover al carrito', 'Move to cart')}</button>
                        <button onClick={() => removeSaved(i)} className="cursor-pointer text-[10.5px] font-extrabold text-pink-dark">{L('Quitar', 'Remove')}</button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Completa tu compra — cross-sell from the same aisles (store cart) ── */}
            {storeCart && (() => {
              const inCartNames = new Set(Object.values(cart).map((l) => l.name));
              const savedNames = new Set(savedLines.map((s) => s.line.name));
              const cartCatKeys = new Set(Object.keys(cart).map((k) => k.split(':').slice(0, 2).join(':')));
              const candidates = shopCats
                .flatMap((c) => c.items.map((it) => ({ catKey: c.key, it })))
                .filter((x) => !inCartNames.has(B(x.it.n)) && !savedNames.has(B(x.it.n)) && shopStock(x.catKey, x.it) !== 0)
                .sort((a, b2) => {
                  const sameA = cartCatKeys.has(a.catKey) ? 1 : 0, sameB = cartCatKeys.has(b2.catKey) ? 1 : 0;
                  if (sameA !== sameB) return sameB - sameA;           // same aisle first…
                  const saleA = a.it.orig ? 1 : 0, saleB = b2.it.orig ? 1 : 0;
                  return saleB - saleA;                                 // …then deals
                })
                .slice(0, 8);
              if (!candidates.length) return null;
              return (
                <div className="mt-5">
                  <div className="mb-2 text-[13px] font-extrabold text-ink">{L('Completa tu compra', 'Complete your purchase')}</div>
                  <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4">
                    {candidates.map((x) => (
                      <div key={`${x.catKey}:${B(x.it.n)}`} className="w-[130px] flex-none">{gridCard(x.catKey, x.it, shopDisplayOnly)}</div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </Overlay>

      {/* service DETAIL sheet — description + extras before scheduling (Booksy
          pattern; layout from the Barbershop/Carwash prototypes). */}
      <Overlay open={svcInfo !== null && svcSel === null} onClose={() => setSvcInfo(null)} width={440}>
        {svcInfo !== null && svcSel === null && (() => {
          const s = svcInfo;
          const canBook = svcBooking && s.bookable;
          const canInquire = svcBooking && !s.bookable;
          const extras = s.addons.filter((a) => svcAddOns[a.id]);
          const infoTotal = (s.price ?? 0) + extras.reduce((n, a) => n + a.price, 0);
          return (
            <>
              <div className="relative -mx-4 -mt-4 h-[130px] overflow-hidden rounded-t-panel md:-mx-5 md:-mt-5 md:rounded-t-card" style={{ background: `repeating-linear-gradient(135deg,${s.tile})` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.img && <img src={s.img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                <button onClick={() => setSvcInfo(null)} className="absolute left-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white shadow-card">
                  <X size={15} stroke={2.6} className="text-ink" />
                </button>
                {s.badge && (
                  <span className={`absolute right-3 top-3 rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${s.badge === 'popular' ? 'bg-amber-bg text-amber-ink' : 'bg-lilac text-primary-dark'}`}>
                    {s.badge === 'popular' ? 'Popular' : L('Nuevo', 'New')}
                  </span>
                )}
              </div>
              <div className="mt-4 text-[19px] font-extrabold leading-tight text-ink">{s.name}</div>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="flex items-center gap-1 text-[12px] font-bold text-muted"><Clock size={13} stroke={2.4} />{s.dur}</span>
                <span className="text-[14px] font-extrabold text-primary-dark">{svcPriceLabel(s)}</span>
                {s.deposit && <span className="rounded-md bg-green-bg px-1.5 py-0.5 text-[9px] font-extrabold text-green-dark">{L('Depósito', 'Deposit')}</span>}
              </div>
              <div className="mt-3 text-[13px] font-semibold leading-relaxed text-ink-2">{B(s.desc)}</div>
              {s.addons.length > 0 && (
                <>
                  <div className="mb-2 mt-4 text-[13.5px] font-extrabold text-ink">{L('Agregar extras', 'Add extras')}</div>
                  <div className="flex flex-col gap-2">
                    {s.addons.map((a) => {
                      const on = !!svcAddOns[a.id];
                      return (
                        <button key={a.id} onClick={() => setSvcAddOns((m) => ({ ...m, [a.id]: !on }))} className={`flex cursor-pointer items-center gap-3 rounded-field border-[1.5px] p-2.5 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                          <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded ${on ? 'bg-primary' : 'bg-lilac-line'}`}>{on && <Check size={11} className="text-white" stroke={3.2} />}</span>
                          <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink">{B(a.name)}</span>
                          <span className="flex-none text-[12px] font-extrabold text-ink">{a.price ? `+$${a.price}` : L('Gratis', 'Free')}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {(canBook || canInquire) ? (
                <div className="mt-5 flex items-center gap-3">
                  {s.price != null && infoTotal > 0 && (
                    <span className="flex-none">
                      <span className="block text-[10.5px] font-semibold text-muted">Total</span>
                      <span className="block text-[18px] font-extrabold text-ink">{money(infoTotal)}</span>
                    </span>
                  )}
                  <PrimaryBtn className="min-w-0 flex-1" onClick={() => openSvc(pubToTarget(s), { keepExtras: true })}>
                    {canBook ? L('Reservar cita', 'Book appointment') : L('Solicitar información', 'Request info')}
                  </PrimaryBtn>
                </div>
              ) : (
                <div className="mt-5 flex items-center gap-2.5 rounded-tile bg-lilac-2 px-3.5 py-2.5">
                  <Phone size={15} stroke={2.2} className="flex-none text-primary-dark" />
                  <span className="text-[12px] font-semibold leading-snug text-ink-soft">{L('Para reservar, llama o visita el negocio.', 'To book, call or visit the business.')}</span>
                </div>
              )}
            </>
          );
        })()}
      </Overlay>

      {/* service booking modal */}
      <Overlay open={svcSel !== null} onClose={() => setSvcSel(null)} width={440}>
        {svcSel !== null && !svcDone && (() => {
          const total = svcTotal();
          const showTotal = svcSel.price != null && total > 0;
          // Online deposit path is the only one a promo code affects (cash bookings
          // settle in person). Business-absorbed % off; server re-validates at pay.
          const svcOnlineDep = payOnline && !!svcSel.deposit && total > 0;
          const svcDiscount = svcPromo ? Math.min(total, +(total * svcPromo.percent / 100).toFixed(2)) : 0;
          const svcPayToday = +(total * 1.05 - svcDiscount).toFixed(2);
          return (
            <>
              <OverlayTitle title={svcResched ? L('Reagendar cita', 'Reschedule appointment') : svcSel.name} onClose={() => setSvcSel(null)} />
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
                <span className="min-w-0 flex-1">{svcResched ? `${svcSel.name} · ${svcSel.dur}` : L(svcSel.descEs, svcSel.descEn)}</span>
                {svcSel.priceLabel && <span className="flex-none font-extrabold text-primary-dark">{B(svcSel.priceLabel)}</span>}
              </div>

              {/* professional picker — the Booksy signature step. "Cualquiera" =
                  first available; a specific pro narrows the open slots to theirs. */}
              {svcSel.bookable && svcProviders.length > 0 && (
                <>
                  <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Elige tu profesional', 'Pick your professional')}</div>
                  <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                    {[{ id: 'any', name: L('Cualquiera', 'Anyone'), tag: L('Primer disponible', 'First available'), color: '#9A8FB0', photo: undefined as string | undefined },
                      ...svcProviders.map((p) => ({ id: p.id, name: p.name, tag: B(p.tag), color: p.color, photo: p.photo }))].map((p) => {
                      const on = svcStaff === p.id;
                      return (
                        <button key={p.id} onClick={() => setSvcStaff(p.id)} className="w-[72px] flex-none cursor-pointer text-center">
                          <span className={`relative mx-auto flex h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-full text-[17px] font-extrabold text-white ${on ? 'ring-[3px] ring-ink ring-offset-2' : ''}`} style={{ background: p.color }}>
                            {p.photo
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={p.photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
                              : p.id === 'any' ? '★' : initials(p.name)}
                            {on && (
                              <span className="absolute bottom-0 right-0 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white bg-ink">
                                <Check size={9} stroke={4} className="text-white" />
                              </span>
                            )}
                          </span>
                          <span className="mt-1.5 block truncate text-[11px] font-extrabold text-ink">{p.name}</span>
                          <span className="block truncate text-[9px] font-semibold text-muted">{p.tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* price variant (vehicle type, home size…) — delta re-priced server-side */}
              {svcSel.variant && !svcResched && (
                <>
                  <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{B(svcSel.variant.label)}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {svcSel.variant.options.map((o, i) => {
                      const on = svcVar === i;
                      return (
                        <button key={i} onClick={() => setSvcVar(i)} className={`cursor-pointer rounded-field border-[1.5px] px-3 py-2.5 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                          <span className="block truncate text-[12.5px] font-extrabold text-ink">{B(o.name)}</span>
                          <span className={`block text-[10.5px] font-bold ${on ? 'text-primary-dark' : 'text-muted'}`}>{o.delta > 0 ? `+${money(o.delta)}` : L('Incluido', 'Included')}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* per-person services → party size */}
              {svcSel.priceType === 'persona' && (
                <>
                  <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Personas', 'People')}</div>
                  <div className="flex w-fit items-center gap-3 rounded-full bg-lilac-2 px-2 py-1.5">
                    <button onClick={() => setSvcPersons(Math.max(1, svcPersons - 1))} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-ink">−</button>
                    <span className="w-6 text-center text-[14px] font-extrabold">{svcPersons}</span>
                    <button onClick={() => setSvcPersons(svcPersons + 1)} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-ink">+</button>
                  </div>
                </>
              )}

              <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{svcSel.bookable ? L('Elige fecha', 'Pick a date') : L('Fecha preferida', 'Preferred date')}</div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {dateChips.map((d, i) => {
                  const off = svcDayOff(i); // weekday the service doesn't offer
                  const full = !off && svcSel.bookable && (svcDayFull[i] ?? false);
                  const on = svcDate === i && !full && !off;
                  return (
                    <button key={i} disabled={full || off} onClick={() => setSvcDate(i)} className={`flex-none rounded-btn px-3.5 py-2 text-center ${on ? 'bg-primary text-white' : full || off ? 'cursor-not-allowed bg-lilac-2 opacity-50' : 'cursor-pointer bg-lilac-2 text-ink-soft'}`}>
                      <span className="block text-[12.5px] font-extrabold">{B(d.lab)}</span>
                      <span className={`block text-[10.5px] font-bold ${on ? 'text-white/80' : 'text-muted'}`}>{B(d.sub)}</span>
                      {full ? <span className="mt-0.5 block text-[8.5px] font-extrabold text-pink-dark">{L('Lleno', 'Full')}</span>
                        : off ? <span className="mt-0.5 block text-[8.5px] font-extrabold text-muted">{L('No abre', 'Closed')}</span> : null}
                    </button>
                  );
                })}
              </div>

              {/* time slot only for bookable (appointment) services — real slots
                  from the business's open hours × service duration */}
              {svcSel.bookable && (
                <>
                  <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Elige hora', 'Pick a time')}</div>
                  {svcSlots.length === 0 ? (
                    <div className="rounded-field bg-lilac-2 px-3.5 py-3 text-[12px] font-semibold text-ink-2">
                      {L('Cerrado ese día — elige otra fecha', 'Closed that day — pick another date')}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {svcSlots.map((t) => {
                        const iso = dateChips[svcDate]?.iso;
                        // full = capacity-full (no team) OR the chosen pro / every pro busy
                        const full = !!iso && ((svcProviders.length === 0 && slotFull(iso, t)) || slotStaffFull(iso, t));
                        const left = iso && svcProviders.length === 0 && svcSel!.capMax > 0 && svcSel!.capMax < 9999 ? svcSel!.capMax - slotSeats(iso, t) : null;
                        const sel = svcTime === t && !full;
                        return (
                          <button
                            key={t}
                            disabled={full}
                            onClick={() => setSvcTime(t)}
                            className={`flex-none rounded-btn px-3.5 py-2 text-center ${sel ? 'bg-primary text-white' : full ? 'cursor-not-allowed bg-lilac-2 opacity-50' : 'cursor-pointer bg-lilac-2 text-ink-soft'}`}
                          >
                            <span className="block text-[12.5px] font-extrabold">{fmtShort(t)}</span>
                            {full ? <span className="mt-0.5 block text-[8.5px] font-extrabold text-pink-dark">{L('Ocupado', 'Taken')}</span>
                              : left != null && left <= 3 ? <span className={`mt-0.5 block text-[8.5px] font-extrabold ${sel ? 'text-white/80' : 'text-amber-ink'}`}>{left} {L('libres', 'left')}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* add-ons for this service */}
              {svcSel.addons.length > 0 && (
                <>
                  <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Agrega extras', 'Add extras')}</div>
                  <div className="flex flex-col gap-2">
                    {svcSel.addons.map((a) => {
                      const on = !!svcAddOns[a.id];
                      return (
                        <button key={a.id} onClick={() => setSvcAddOns((m) => ({ ...m, [a.id]: !on }))} className={`flex items-center gap-3 rounded-field border-[1.5px] p-2.5 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                          <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded ${on ? 'bg-primary' : 'bg-lilac-line'}`}>{on && <Check size={11} className="text-white" stroke={3.2} />}</span>
                          <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink">{B(a.name)}</span>
                          <span className="flex-none text-[12px] font-extrabold text-ink">{a.price ? `+$${a.price}` : L('Gratis', 'Free')}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* note to the professional ("fade medio, barba perfilada…") */}
              {svcSel.bookable && !svcResched && (
                <>
                  <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Notas para el profesional', 'Notes for the professional')} <span className="font-bold text-muted">· {L('opcional', 'optional')}</span></div>
                  <input
                    value={svcNote}
                    onChange={(e) => setSvcNote(e.target.value)}
                    maxLength={300}
                    placeholder={L('Ej. fade medio, barba perfilada…', 'E.g. mid fade, beard lineup…')}
                    className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[13px] font-semibold text-ink outline-none placeholder:text-muted-2 focus:border-primary"
                  />
                </>
              )}

              {/* promo code — only when paying a deposit online (a code has no effect
                  on a cash/inquiry booking). The business creates it in Promociones. */}
              {svcOnlineDep && !svcResched && (
                <PromoField slug={b.slug} scope="service" subtotal={total} applied={svcPromo}
                  onApply={setSvcPromo} onClear={() => setSvcPromo(null)} L={L} money={money} />
              )}

              {/* summary card: lines → total → how you pay (Booksy/Fresha pattern) */}
              {showTotal && !svcResched && (
                <div className="mt-4 rounded-field bg-lilac-2 p-3.5 text-[12.5px] font-semibold text-ink-2">
                  <div className="flex justify-between">
                    <span className="min-w-0 truncate pr-2">{svcSel.name}{svcSel.variant ? ` (${svcVarLabel()})` : ''}{svcSel.priceType === 'persona' ? ` × ${Math.max(1, svcPersons)}` : ''}</span>
                    <span className="flex-none font-extrabold text-ink">{money(total - svcChosenAddons().reduce((n, a) => n + a.price, 0))}</span>
                  </div>
                  {svcChosenAddons().map((a) => (
                    <div key={a.id} className="mt-0.5 flex justify-between text-[11.5px]">
                      <span className="min-w-0 truncate pr-2">{B(a.name)}</span>
                      <span className="flex-none font-extrabold text-ink">+{money(a.price)}</span>
                    </div>
                  ))}
                  <div className="mt-1.5 flex justify-between border-t border-lilac-line pt-1.5"><span>{L('Total', 'Total')}</span><span className="text-[14px] font-extrabold text-ink">{money(total)}</span></div>
                  {svcOnlineDep
                    ? <>
                        <div className="mt-0.5 flex justify-between text-[11.5px]"><span>{L('Tarifa de servicio', 'Service fee')}</span><span className="font-extrabold text-ink">{money(+(total * 0.05).toFixed(2))}</span></div>
                        {svcDiscount > 0 && <div className="mt-0.5 flex justify-between text-[11.5px] text-green-dark"><span>{L('Descuento', 'Discount')}{svcPromo ? ` · ${svcPromo.code}` : ''}</span><span className="font-extrabold">−{money(svcDiscount)}</span></div>}
                        <div className="mt-1 flex justify-between border-t border-lilac-line pt-1 text-[11.5px]"><span>{L('Pagas hoy (asegura tu cita)', 'You pay today (secures your spot)')}</span><span className="font-extrabold text-primary-dark">{money(svcPayToday)}</span></div>
                      </>
                    : (
                      <div className="mt-2 flex items-center gap-2 rounded-btn bg-amber-bg px-2.5 py-2">
                        <HandStop size={14} stroke={2.2} className="flex-none text-amber-ink" />
                        <span className="text-[11px] font-bold text-amber-ink">{L('Pagas en el local al terminar', 'Pay at the venue when done')}</span>
                      </div>
                    )}
                </div>
              )}

              <PrimaryBtn className="mt-5" onClick={confirmBooking}>
                {svcResched
                  ? L('Confirmar nuevo horario', 'Confirm new time')
                  : svcOnlineDep
                    ? `${L('Pagar reserva · ', 'Pay booking · ')}${money(svcPayToday)}`
                    : svcSel.bookable
                      ? showTotal ? `${L('Confirmar cita · ', 'Confirm appointment · ')}${money(total)}` : L('Solicitar reserva', 'Request booking')
                      : L('Solicitar información', 'Request info')}
              </PrimaryBtn>
            </>
          );
        })()}
        {svcSel !== null && svcDone && (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary shadow-cta">
              <Check size={32} stroke={3} className="text-white" />
            </span>
            <div className="mt-4 text-[21px] font-extrabold text-ink">
              {svcDoneInfo?.resched ? L('¡Cita reagendada!', 'Appointment moved!') : svcSel.bookable ? L('¡Cita agendada!', 'Appointment booked!') : L('¡Consulta enviada!', 'Inquiry sent!')}
            </div>
            <div className="mt-1.5 max-w-[300px] text-[13px] font-semibold leading-relaxed text-muted">
              {svcSel.bookable
                ? L('El negocio confirmará tu cita — te avisamos al instante.', 'The business will confirm your appointment — we’ll notify you right away.')
                : L('Te contactaremos pronto para confirmar los detalles.', "We'll contact you soon to confirm the details.")}
            </div>
            {/* appointment summary card (service · pro · when · total) */}
            {svcDoneInfo && svcSel.bookable && (
              <div className="mt-4 w-full max-w-[300px] rounded-card-sm border border-hair bg-white p-4 text-left shadow-card">
                <div className="text-[14px] font-extrabold text-ink">{svcDoneInfo.name}</div>
                {svcDoneInfo.staff && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-white">{initials(svcDoneInfo.staff)}</span>
                    <span className="text-[12.5px] font-bold text-ink-soft">{L('con', 'with')} {svcDoneInfo.staff}</span>
                  </div>
                )}
                <div className="mt-2.5 flex items-center gap-2 border-t border-hair pt-2.5">
                  <Clock size={14} stroke={2.2} className="flex-none text-primary-dark" />
                  <span className="text-[12.5px] font-bold text-ink-soft">{svcDoneInfo.when}</span>
                </div>
                {svcDoneInfo.total > 0 && (
                  <div className="mt-2.5 flex items-center justify-between border-t border-hair pt-2.5">
                    <span className="text-[12px] font-bold text-muted">{L('Total a pagar en el local', 'Total to pay at the venue')}</span>
                    <span className="text-[13px] font-extrabold text-primary-dark">{money(svcDoneInfo.total)}</span>
                  </div>
                )}
              </div>
            )}
            {svcDoneInfo && svcSel.bookable && (
              <button
                onClick={() => {
                  const start = new Date(svcDoneInfo.startISO);
                  const end = new Date(start.getTime() + svcDoneInfo.durMin * 60000);
                  const esc = (s: string) => s.replace(/([\\;,])/g, '\\$1');
                  const p2 = (n: number) => String(n).padStart(2, '0');
                  const stamp = (d: Date) => `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}00Z`;
                  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ToLatino//Citas//ES', 'BEGIN:VEVENT',
                    `UID:${start.getTime()}@tolatino`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
                    `SUMMARY:${esc(`${svcDoneInfo.name} · ${b.name}`)}`, `LOCATION:${esc(b.address ?? b.name)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
                  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
                  const a = document.createElement('a');
                  a.href = url; a.download = 'cita.ics'; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="mt-3 w-full max-w-[300px] cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white py-3 text-[13px] font-extrabold text-primary-dark"
              >
                {L('Agregar al calendario', 'Add to calendar')}
              </button>
            )}
            <PrimaryBtn className="mt-3 w-full max-w-[300px]" onClick={() => { setSvcSel(null); setSvcDone(false); setSvcDoneInfo(null); }}>
              {L('Listo', 'Done')}
            </PrimaryBtn>
          </div>
        )}
      </Overlay>

      {/* rental booking modal */}
      <Overlay open={rentIdx !== null} onClose={() => setRentIdx(null)} width={440}>
        {rentIdx !== null && rentalItems[rentIdx] && !rentDone && (() => {
          const it = rentalItems[rentIdx];
          const rule = it.avail;
          const first = new Date(rentCal.y, rentCal.m, 1);
          const lead = (first.getDay() + 6) % 7; // Monday-first
          const dim = new Date(rentCal.y, rentCal.m + 1, 0).getDate();
          const totalCells = Math.ceil((lead + dim) / 7) * 7;
          const now = new Date();
          const prevDisabled = rentCal.y < now.getFullYear() || (rentCal.y === now.getFullYear() && rentCal.m <= now.getMonth());
          const span = rentSpan();
          const unitFee = rentUnitFee(it);
          const maxUnits = Math.max(1, it.stock || 1);
          const selectedAddons = it.addons.filter((a) => rentAddons.includes(a.id));
          // Online rental fee path is the only one a promo code affects (deposit is
          // collected at pickup). Business-absorbed % off; server re-validates at pay.
          const rentFee = rentSubtotal(it);
          const rentOnline = payOnline && rentFee > 0;
          const rentDiscount = rentPromo ? Math.min(rentFee, +(rentFee * rentPromo.percent / 100).toFixed(2)) : 0;
          const rentPayToday = +(rentFee * 1.05 - rentDiscount).toFixed(2);
          const shortD = (isoStr: string) => { const dt = parseISO(isoStr); return L(`${MO_SH_ES[dt.getMonth()]} ${dt.getDate()}`, `${MO_SH_EN[dt.getMonth()]} ${dt.getDate()}`); };
          const shiftMonth = (dir: number) => setRentCal((c) => { const d = new Date(c.y, c.m + dir, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
          const dayLbl = rentMode === 'hour' ? `${rentHours} ${rentHours === 1 ? L('hora', 'hour') : L('horas', 'hours')}` : `${span} ${span === 1 ? L('día', 'day') : L('días', 'days')}`;
          return (
            <>
              <OverlayTitle title={B(it.n)} onClose={() => setRentIdx(null)} />
              <div className="text-[12.5px] font-semibold text-muted">{B(it.d)}</div>

              {/* by-day vs by-hour (only when the item has an hourly rate) */}
              {it.hour != null && (
                <div className="mt-4 flex gap-1.5">
                  {([['day', L('Por día', 'By day')], ['hour', L('Por hora', 'By hour')]] as [RentMode, string][]).map(([m, lab]) => (
                    <button key={m} onClick={() => { setRentMode(m); setRentEnd(null); }} className={`flex-1 cursor-pointer rounded-btn py-2.5 text-[12.5px] font-extrabold ${rentMode === m ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-soft'}`}>{lab}</button>
                  ))}
                </div>
              )}

              {/* calendar */}
              <div className="mb-2 mt-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-extrabold text-ink">{rentMode === 'hour' ? L('Elige el día', 'Pick the day') : L('Elige las fechas', 'Pick the dates')}</div>
                  {rule && rule !== 'Siempre' && <div className="mt-0.5 text-[10.5px] font-semibold text-muted-2">{L('Disponible', 'Available')}: {L(rule, AVAIL_EN[rule] ?? rule)}</div>}
                </div>
                <div className="flex flex-none items-center gap-1">
                  <button onClick={() => shiftMonth(-1)} disabled={prevDisabled} aria-label={L('Mes anterior', 'Previous month')} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft size={16} stroke={2.4} /></button>
                  <span className="w-[104px] text-center text-[12px] font-extrabold text-ink">{L(MO_LONG_ES[rentCal.m], MO_LONG_EN[rentCal.m])} {rentCal.y}</span>
                  <button onClick={() => shiftMonth(1)} aria-label={L('Mes siguiente', 'Next month')} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink"><ChevronRight size={16} stroke={2.4} /></button>
                </div>
              </div>
              <div className="mb-1.5 grid grid-cols-7 gap-1">{WD_MON1.map((w, i) => <span key={i} className="text-center text-[10px] font-extrabold text-muted-faint">{L(w[0], w[1])}</span>)}</div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: totalCells }, (_, i) => {
                  const dnum = i - lead + 1;
                  if (dnum < 1 || dnum > dim) return <span key={i} />;
                  const dISO = isoDay(rentCal.y, rentCal.m, dnum);
                  const booked = (rentBusy[dISO] ?? 0) >= maxUnits; // fully booked that day
                  const enabled = rentDayEnabled(rule, new Date(rentCal.y, rentCal.m, dnum)) && !booked;
                  const isEnd = dISO === rentStart || dISO === rentEnd;
                  const inRange = !!rentStart && !!rentEnd && dISO > rentStart && dISO < rentEnd;
                  return (
                    <button key={i} disabled={!enabled} onClick={() => rentPick(dISO)}
                      className={`flex aspect-square items-center justify-center rounded-lg text-[12px] font-extrabold transition-colors ${isEnd ? 'bg-primary text-white' : inRange ? 'bg-lilac text-primary-dark' : booked ? 'cursor-not-allowed text-muted-faint line-through' : enabled ? 'cursor-pointer bg-app text-ink hover:bg-lilac-2' : 'cursor-not-allowed text-muted-faint'}`}>{dnum}</button>
                  );
                })}
              </div>
              {Object.keys(rentBusy).length > 0 && (
                <div className="mt-1.5 text-[10.5px] font-semibold text-muted-2"><span className="line-through">00</span> = {L('días ya rentados', 'days already booked')}</div>
              )}

              {rentMode === 'hour' && (
                <>
                  <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Horas', 'Hours')}</div>
                  <div className="flex w-fit items-center gap-3 rounded-full bg-lilac-2 px-2 py-1.5">
                    <button onClick={() => setRentHours((q) => Math.max(1, q - 1))} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-ink">−</button>
                    <span className="w-6 text-center text-[14px] font-extrabold">{rentHours}</span>
                    <button onClick={() => setRentHours((q) => q + 1)} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-ink">+</button>
                  </div>
                </>
              )}

              {/* quantity (only when more than one unit exists) */}
              {maxUnits > 1 && (
                <>
                  <div className="mb-2 mt-4 flex items-center justify-between">
                    <span className="text-[13px] font-extrabold text-ink">{L('Cantidad', 'Quantity')}</span>
                    <span className="text-[10.5px] font-semibold text-muted-2">{maxUnits} {B(it.unit)}{maxUnits === 1 ? '' : 's'} {L('disponibles', 'available')}</span>
                  </div>
                  <div className="flex w-fit items-center gap-3 rounded-full bg-lilac-2 px-2 py-1.5">
                    <button onClick={() => setRentUnits((q) => Math.max(1, q - 1))} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-ink">−</button>
                    <span className="w-6 text-center text-[14px] font-extrabold">{rentUnits}</span>
                    <button onClick={() => setRentUnits((q) => Math.min(maxUnits, q + 1))} disabled={rentUnits >= maxUnits} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-ink disabled:opacity-40">+</button>
                  </div>
                </>
              )}

              {/* add-ons / extras */}
              {it.addons.length > 0 && (
                <>
                  <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Extras', 'Add-ons')}</div>
                  <div className="flex flex-col gap-2">
                    {it.addons.map((a) => {
                      const on = rentAddons.includes(a.id);
                      return (
                        <button key={a.id} onClick={() => setRentAddons((l) => (on ? l.filter((x) => x !== a.id) : [...l, a.id]))} className={`flex items-center gap-3 rounded-field border-[1.5px] p-3 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                          <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded ${on ? 'bg-primary' : 'bg-lilac-line'}`}>{on && <Check size={11} className="text-white" stroke={3.4} />}</span>
                          <span className="min-w-0 flex-1 text-[12.5px] font-extrabold text-ink">{B(a.name)}</span>
                          <span className="flex-none text-[12.5px] font-extrabold text-ink">{a.price ? `+${money(a.price)}` : L('Gratis', 'Free')}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="mt-3 rounded-field bg-app px-3.5 py-2.5 text-[12px] font-bold text-ink-2">
                {rentStart
                  ? <>{shortD(rentStart)}{rentMode === 'day' && rentEnd ? ` – ${shortD(rentEnd)}` : ''} · <span className="text-primary-dark">{dayLbl}</span>{rentMode === 'day' && rentStart && !rentEnd && <span className="ml-1 font-semibold text-muted">· {L('toca el día final para un rango', 'tap an end day for a range')}</span>}</>
                  : <span className="font-semibold text-muted">{L('Toca un día para empezar', 'Tap a day to start')}</span>}
              </div>

              {/* promo code — only when paying the rental fee online (deposit is at
                  pickup, so a code has no effect on a request/cash rental). */}
              {rentOnline && (
                <PromoField slug={b.slug} scope="rental" subtotal={rentFee} applied={rentPromo}
                  onApply={setRentPromo} onClear={() => setRentPromo(null)} L={L} money={money} />
              )}

              <div className="mt-3 rounded-field bg-lilac-2 p-3.5 text-[12.5px] font-semibold text-ink-2">
                <div className="flex justify-between"><span>{L('Renta', 'Rental')}{rentStart ? ` · ${rentUnits > 1 ? `${rentUnits}× ` : ''}${dayLbl}` : ''}</span><span>{money(unitFee * rentUnits)}</span></div>
                {selectedAddons.map((a) => (
                  <div key={a.id} className="mt-1 flex justify-between text-[11.5px]"><span>{B(a.name)}</span><span>{a.price ? money(a.price) : L('Gratis', 'Free')}</span></div>
                ))}
                <div className="mt-1 flex justify-between"><span>{L('Depósito reembolsable', 'Refundable deposit')}{rentOnline ? L(' · al recoger', ' · at pickup') : ''}{rentUnits > 1 ? ` · ${rentUnits}×` : ''}</span><span>{money(it.dep * rentUnits)}</span></div>
                {rentOnline && (
                  <>
                    <div className="mt-1 flex justify-between text-[11.5px]"><span>{L('Tarifa de servicio', 'Service fee')}</span><span>{money(+(rentFee * 0.05).toFixed(2))}</span></div>
                    {rentDiscount > 0 && <div className="mt-1 flex justify-between text-[11.5px] text-green-dark"><span>{L('Descuento', 'Discount')}{rentPromo ? ` · ${rentPromo.code}` : ''}</span><span className="font-extrabold">−{money(rentDiscount)}</span></div>}
                    <div className="mt-2 flex items-center justify-between border-t border-lilac-line pt-2 text-[14px] font-extrabold text-ink">
                      <span>{L('Pagas hoy', 'You pay today')}</span><span className="text-primary-dark">{money(rentPayToday)}</span>
                    </div>
                  </>
                )}
                {!rentOnline && (
                  <div className="mt-2 flex items-center justify-between border-t border-lilac-line pt-2 text-[14px] font-extrabold text-ink">
                    <span>{L('Total', 'Total')}</span><span className="text-primary-dark">{money(rentGrand(it))}</span>
                  </div>
                )}
              </div>

              <PrimaryBtn className="mt-4" onClick={confirmRental}>
                {!rentStart ? L('Elige la fecha', 'Pick a date') : rentOnline ? `${L('Pagar renta · ', 'Pay rental · ')}${money(rentPayToday)}` : L('Solicitar renta', 'Request rental')}
              </PrimaryBtn>
            </>
          );
        })()}
        {rentIdx !== null && rentDone && (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
              <Check size={28} stroke={3} className="text-green" />
            </span>
            <div className="mt-4 text-[19px] font-extrabold text-ink">{L('¡Renta solicitada!', 'Rental requested!')}</div>
            <div className="mt-1.5 max-w-[300px] text-[13px] font-semibold leading-relaxed text-muted">
              {L('El negocio confirmará disponibilidad y el depósito. Míralo en Mi cuenta.', 'The business will confirm availability and the deposit. See it in My account.')}
            </div>
            <PrimaryBtn className="mt-5" onClick={() => { setRentIdx(null); setRentDone(false); }}>
              {L('Listo', 'Done')}
            </PrimaryBtn>
          </div>
        )}
      </Overlay>

      {/* detail event modal */}
      <Overlay open={evIdx !== null} onClose={() => setEvIdx(null)} width={440}>
        {evIdx !== null && (
          <>
            <OverlayTitle title={B(DETAIL_EVENTS[evIdx].title)} onClose={() => setEvIdx(null)} />
            <div className="text-[12.5px] font-bold text-muted">
              {B(DETAIL_EVENTS[evIdx].d)} {DETAIL_EVENTS[evIdx].day} · {B(DETAIL_EVENTS[evIdx].loc)}
            </div>
            <div className="mt-3 text-[13.5px] font-medium leading-[1.55] text-ink-soft">{B(DETAIL_EVENTS[evIdx].desc)}</div>
            <div className="mt-2 text-[12px] font-bold text-muted-2">
              {DETAIL_EVENTS[evIdx].base + (evOn(evIdx) ? 1 : 0)} {L('asisten', 'going')}
            </div>
            <PrimaryBtn
              className={`mt-4 ${evOn(evIdx) ? '!bg-green-bg !text-green-dark !shadow-none' : ''}`}
              onClick={() => toggleEv(evIdx)}
            >
              {evOn(evIdx) ? L('Voy ✓', 'Going ✓') : L('Asistir', 'Attend')}
            </PrimaryBtn>
          </>
        )}
      </Overlay>

      {/* write review modal */}
      <Overlay open={writeOpen} onClose={() => setWriteOpen(false)} width={440}>
        <OverlayTitle title={L('Tu reseña', 'Your review')} onClose={() => setWriteOpen(false)} />
        <div className="flex justify-center gap-1 py-2 text-[30px]">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setMyStars(n)} className={`flex h-11 w-11 cursor-pointer items-center justify-center ${n <= myStars ? 'text-amber' : 'text-muted-faint'}`}>
              {n <= myStars ? '★' : '☆'}
            </button>
          ))}
        </div>
        <textarea
          value={myText}
          onChange={(e) => setMyText(e.target.value)}
          rows={4}
          placeholder={L('Cuéntale a la comunidad tu experiencia…', 'Tell the community about your experience…')}
          className="w-full resize-none rounded-field border-[1.5px] border-[#ECE9F6] bg-app px-3.5 py-3 text-[13.5px] font-medium outline-none placeholder:text-muted focus:border-primary"
        />

        {/* photo picker — reviewers upload to their own uid folder (lib/image) */}
        <input ref={reviewFileInput} type="file" accept="image/*" multiple onChange={onPickReviewPhotos} className="hidden" />
        <div className="mt-3 flex flex-wrap gap-2">
          {myPhotos.map((p, i) => (
            <div key={p.url} className="relative h-16 w-16 overflow-hidden rounded-field">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => removeReviewPhoto(i)}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white"
                aria-label={L('Quitar foto', 'Remove photo')}
              >
                <X size={12} stroke={3} />
              </button>
            </div>
          ))}
          {myPhotos.length < MAX_REVIEW_PHOTOS && (
            <button
              onClick={() => reviewFileInput.current?.click()}
              className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-field border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 text-primary-dark"
            >
              <Plus size={16} stroke={2.6} />
              <span className="text-[9.5px] font-extrabold">{L('Fotos', 'Photos')}</span>
            </button>
          )}
        </div>

        <PrimaryBtn className="mt-4" disabled={!myText.trim() || revBusy} onClick={submitReview}>
          {revBusy ? L('Publicando…', 'Posting…') : L('Publicar reseña', 'Post review')}
        </PrimaryBtn>
      </Overlay>

      {/* On-site payment (Stripe Payment Element) — our branded checkout sheet */}
      <CheckoutSheet
        open={!!checkout}
        clientSecret={checkout?.clientSecret ?? null}
        amount={checkout?.amount ?? 0}
        pendingId={checkout?.pendingId ?? ''}
        returnPath={checkout?.returnPath ?? '/negocios/'}
        onClose={() => setCheckout(null)}
      />

      {/* confirmation toast — width-capped + centered (never overflows) */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[90] w-[calc(100%-28px)] max-w-[360px] -translate-x-1/2 rounded-xl bg-ink px-4 py-3 text-center text-[12.5px] font-bold text-white shadow-modal">
          {toast}
        </div>
      )}
    </div>
  );
}

// Promo-code field for the booking/rental sheets — mirrors the food cart's promo
// input. Manages its own input/loading/error; reports the validated result up via
// onApply (the parent recomputes the discount off the live subtotal + passes the
// code to checkout, where the server re-validates). `scope` picks the store the
// code lives in (service_config vs rental_config).
function PromoField({ slug, scope, subtotal, applied, onApply, onClear, L, money }: {
  slug: string;
  scope: 'service' | 'rental';
  subtotal: number;
  applied: { code: string; percent: number; label: string } | null;
  onApply: (r: { code: string; percent: number; label: string }) => void;
  onClear: () => void;
  L: (es: string, en: string) => string;
  money: (n: number) => string;
}) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const discount = applied ? Math.min(subtotal, +(subtotal * applied.percent / 100).toFixed(2)) : 0;
  const apply = async () => {
    const code = input.trim();
    if (!code || busy) return;
    setBusy(true); setErr('');
    const r = await checkPromo(slug, code, subtotal, scope);
    setBusy(false);
    if (r.ok) { onApply({ code: code.toUpperCase(), percent: r.percent, label: r.label }); setInput(''); setErr(''); }
    else { onClear(); setErr(L('Código no válido para esto', 'Code not valid for this')); }
  };
  return (
    <div className="mt-4">
      {applied ? (
        <div className="flex items-center justify-between gap-2 rounded-field bg-green-bg px-3 py-2">
          <div className="min-w-0">
            <div className="text-[12px] font-extrabold text-green-dark">{L('Código', 'Code')} {applied.code} · −{money(discount)}</div>
            {applied.label && <div className="truncate text-[10.5px] font-semibold text-green-dark/80">{applied.label}</div>}
          </div>
          <button onClick={() => { onClear(); setInput(''); setErr(''); }} className="flex-none cursor-pointer text-[11px] font-extrabold text-green-dark underline">{L('Quitar', 'Remove')}</button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input value={input} onChange={(e) => { setInput(e.target.value.toUpperCase().replace(/\s+/g, '')); setErr(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
              placeholder={L('Código de promoción', 'Promo code')} maxLength={24}
              className="min-w-0 flex-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[12.5px] font-extrabold uppercase text-ink outline-none placeholder:font-semibold placeholder:normal-case placeholder:text-muted focus:border-primary" />
            <button onClick={apply} disabled={!input.trim() || busy}
              className="flex-none cursor-pointer rounded-field bg-lilac-2 px-4 py-2.5 text-[12.5px] font-extrabold text-primary-dark disabled:opacity-50">{busy ? '…' : L('Aplicar', 'Apply')}</button>
          </div>
          {err && <div className="mt-1 text-[11px] font-semibold text-pink-dark">{err}</div>}
        </>
      )}
    </div>
  );
}
