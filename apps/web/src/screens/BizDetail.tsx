'use client';

// Business detail (Handoff v2 → Cliente/Negocios): hero, meta, tabs
// (Overview · Updates · Menú · Tienda · Servicios · Eventos · Equipo ·
// Relacionados · Reseñas), cart + checkout, service booking, contact sheet.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IconCheck as Check, IconChevronDown as ChevronDown, IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight, IconGlobe as Globe, IconHeart as Heart, IconHeartFilled as HeartFilled, IconMapPin as MapPin, IconMenu2 as Menu, IconMessageCircle as MessageCircle, IconMinus as Minus, IconDots as MoreHorizontal, IconNavigation as Navigation, IconPhone as Phone, IconPlus as Plus, IconSend as Send, IconShare as Share, IconBuildingStore as Store, IconTrash as Trash2, IconX as X } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { useScrollLock } from '@/lib/scrollLock';
import { uploadPostImages } from '@/lib/image';
import { startConversation, fetchChatMessages, sendChatMessage, markConversationRead, subscribeChat, type ChatMsg } from '@/lib/chat';
import { useMyActivity } from '@/lib/myActivity';
import { Avatar, Card, Overlay, OverlayTitle, PrimaryBtn, Stars, VerifiedBadge } from '@/components/ui';
import { bizTile, FEATURES_COMMON, FEATURES_BY_CAT, type Business } from '@/data/fixtures';
import { useSavedBiz } from '@/lib/savedBiz';
import { useAddresses } from '@/lib/addresses';
import { startMarketplaceCheckout } from '@/lib/stripe';
import { fetchBusinessPhotos, fetchBusinessBySlug, fetchBusinessMenu, fetchBusinessServices, fetchBusinessProducts, fetchBusinessRentals, fetchRentalBusy, fetchBookingLoad, fetchBusinessReviews, postReview, checkDeliveryRange, trackListingView, type PublicMenu, type PublicServices, type PubSvc, type PublicShop, type PublicRentals, type PubRental, type PubReview } from '@/lib/live';
import { fetchBusinessRelations, type PublicRelation } from '@/lib/relations';
import { useNow } from '@/lib/useNow';
import { activeException, bizStatus, bookingSlots, fmtDayHours, fmtLong, fmtShort, statusLabel } from '@/lib/hours';
import { CAT, AVATAR_PALETTE } from '@/lib/tiles';

// es → en lookup for feature labels ("Lo que ofrece"), so the owner-selected
// `features` render bilingually; custom (approved) labels fall back to es.
const FEAT_EN: Record<string, string> = {};
for (const [es, en] of FEATURES_COMMON) FEAT_EN[es] = en;
for (const arr of Object.values(FEATURES_BY_CAT)) for (const [es, en] of arr) FEAT_EN[es] = en;
import { DETAIL_EVENTS, DETAIL_PHOTOS, MENU, OPTION_GROUPS, RENTAL, SEED_REVIEWS, SERVICES, SHOP, SHOP_PROMOS, STAFF, UPDATE_POSTS, WEEK, type Bi, type MenuCat, type MenuItem, type OptionGroup } from '@/data/bizdetail';

type TabKey = 'overview' | 'updates' | 'menu' | 'shop' | 'services' | 'rentals' | 'events' | 'staff' | 'related' | 'reviews';
type RentMode = 'day' | 'hour';
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

type CartLine = { qty: number; name: string; unit: number; optsLabel: string; bg: string; note?: string };

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

  const [tab, setTab] = useState<TabKey>('overview');
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
  useEffect(() => {
    let cancelled = false;
    setRealMenu(null);
    fetchBusinessMenu(b.slug).then((m) => { if (!cancelled) setRealMenu(m); });
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
  useEffect(() => {
    let cancelled = false;
    setRealServices(null);
    fetchBusinessServices(b.slug).then((s) => { if (!cancelled) setRealServices(s); });
    return () => { cancelled = true; };
  }, [b.slug]);
  const svcBooking = realServices?.booking ?? false;
  // Display-only services: booking off → showcase (no Reservar). Cash bookings still work.
  const svcDisplayOnly = realServices != null && !realServices.booking;

  // Real shop (business_items kind='product' + product_config, migration 0048).
  // Null → the Tienda tab keeps the sample fixtures. selling off → display-only
  // (products + prices, no cart). Cat keys are prefixed `sh:` (from the RPC).
  const [realShop, setRealShop] = useState<PublicShop | null>(null);
  useEffect(() => {
    let cancelled = false;
    setRealShop(null);
    fetchBusinessProducts(b.slug).then((s) => { if (!cancelled) setRealShop(s); });
    return () => { cancelled = true; };
  }, [b.slug]);
  const shopCats = realShop?.cats ?? SHOP;
  // Display-only shop: selling off → catalog (no cart). Cash orders still work.
  const shopDisplayOnly = realShop != null && !realShop.selling;

  // Real rentals (business_items kind='rental' + rental_config, migration 0050).
  // Null → the Renta tab keeps the sample fixtures. renting off → display-only
  // (items + rates, no online Rentar).
  const [realRentals, setRealRentals] = useState<PublicRentals | null>(null);
  useEffect(() => {
    let cancelled = false;
    setRealRentals(null);
    fetchBusinessRentals(b.slug).then((s) => { if (!cancelled) setRealRentals(s); });
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
  const [cartDone, setCartDone] = useState(false);
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
  const [svcDone, setSvcDone] = useState(false);
  const [rentIdx, setRentIdx] = useState<number | null>(null);
  const [rentMode, setRentMode] = useState<RentMode>('day');
  const [rentStart, setRentStart] = useState<string | null>(null); // yyyy-mm-dd
  const [rentEnd, setRentEnd] = useState<string | null>(null);
  const [rentHours, setRentHours] = useState(2);
  const [rentUnits, setRentUnits] = useState(1); // how many units to rent (≤ stock)
  const [rentAddons, setRentAddons] = useState<string[]>([]); // selected add-on ids
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
  const [instructions, setInstructions] = useState('');
  const [tipPct, setTipPct] = useState<number>(0.15); // 0 = no tip
  const [tipCustom, setTipCustom] = useState('');     // dollars when "Otra"
  const [customTipOn, setCustomTipOn] = useState(false);
  const [paying, setPaying] = useState(false);
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
  // Online tip only applies to card checkout; for cash delivery the customer tips
  // the driver in cash directly, so no online tip is collected.
  const tip = isDelivery && payOnline ? (customTipOn ? Math.max(0, Math.min(500, parseFloat(tipCustom) || 0)) : +(cartTotal * tipPct).toFixed(2)) : 0;
  const grandTotal = +(cartTotal + serviceFee + deliveryFee + tip).toFixed(2);
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

  // Route the current cart to Stripe (destination charge → seller's account minus
  // the To'Latino fee). The order is created by the webhook once payment lands.
  const payCart = async () => {
    if (!user) { router.push('/entrar'); return; }
    if (cartCount === 0 || paying || belowMin || outOfRange) return;
    if (isDelivery && !chosenAddr) { setCartView('address'); return; }
    setPaying(true);
    const items = Object.values(cart).map((l) => ({
      name: l.name, qty: l.qty, price: l.unit,
      opts: [l.optsLabel, l.note ? `📝 ${l.note}` : ''].filter(Boolean).join(' · ') || undefined,
    }));
    const { url, error } = await startMarketplaceCheckout({
      kind: 'order', slug: b.slug, items,
      channel: isDelivery ? 'delivery' : 'pickup',
      ...(isDelivery && chosenAddr ? { address: { formatted: chosenAddr.formatted, label: chosenAddr.label ?? undefined } } : {}),
      ...(isDelivery && instructions.trim() ? { instructions: instructions.trim() } : {}),
      ...(tip > 0 ? { tip } : {}),
    });
    if (url) { window.location.href = url; return; }
    setPaying(false);
    flash(error === 'seller_not_payable'
      ? L('Este negocio aún no acepta pagos en línea', 'This business does not accept online payments yet')
      : error === 'below_minimum'
        ? L('No llegas al mínimo para entrega', "You haven't reached the delivery minimum")
        : L('No se pudo iniciar el pago', 'Could not start payment'));
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
      ...(isDelivery && chosenAddr
        ? { address: chosenAddr.formatted, address_label: chosenAddr.label ?? undefined, dispatch: 'unassigned', eta_range: del?.prep ? `${del.prep}–${del.prep + 15} min` : '30–45 min' }
        : {}),
      ...(isDelivery && instructions.trim() ? { instructions: instructions.trim() } : {}),
    };
    const { error } = await act.placeOrder(b.slug, items, grandTotal, isDelivery ? 'delivery' : 'pickup', fulfillment);
    setPaying(false);
    if (error) { flash(L('No se pudo enviar el pedido', 'Could not place order')); return; }
    setCartDone(true);
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
    setCart((c) => ({ ...c, [key]: { qty: (c[key]?.qty ?? 0) + 1, name: B(item.n), unit: item.price, optsLabel: '', bg: item.bg } }));
  };

  // `keepOpen`: after adding, don't close the sheet — reset it to fresh defaults
  // so the customer can build ANOTHER, different variant without leaving (the
  // sheet stepper's "Cambiar algo"). Default closes the sheet as before.
  const addFromModal = (keepOpen = false) => {
    if (!itemModal) return;
    const groups = groupsFor(itemModal.catKey, itemModal.item);
    let add = 0;
    const chosen: string[] = [];
    groups.forEach((g) =>
      g.choices.forEach((ch, i) => {
        const sel = g.type === 'single' ? single[g.id] === i : !!multi[`${g.id}:${i}`];
        if (sel) {
          add += ch.price;
          chosen.push(B(ch.label));
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
    setCart((c) => ({ ...c, [key]: { qty: (c[key]?.qty ?? 0) + qty, name: B(itemModal.item.n), unit, optsLabel: chosen.join(', '), bg: itemModal.item.bg, note: note || undefined } }));
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
  const openSvc = (t: SvcTarget) => {
    setSvcSel(t);
    setSvcDate(0);
    setSvcTime(-1); // resolved to the first real slot by the effect below
    setSvcPersons(1);
    setSvcAddOns({});
    setSvcDone(false);
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
    id: s.id, capMax: capMaxOf(s.capacity),
  });
  const fixtureToTarget = (f: (typeof SERVICES)[number]): SvcTarget => ({
    name: B(f.n), descEs: f.d[0], descEn: f.d[1], price: null, priceType: 'cotiza',
    priceLabel: f.price, dur: '', bookable: true, deposit: false, addons: [], id: null, capMax: 0,
  });
  // Consumer price label for a real service card.
  const svcPriceLabel = (s: PubSvc): string =>
    s.priceType === 'cotiza' ? L('Cotización', 'Quote') : s.price ? `$${s.price}${s.priceType === 'persona' ? L('/persona', '/person') : ''}` : L('Gratis', 'Free');

  // Booking sheet math: selected add-ons, base (× persons when per-person), total.
  const svcChosenAddons = () => (svcSel ? svcSel.addons.filter((a) => svcAddOns[a.id]) : []);
  const svcTotal = () => {
    if (!svcSel || svcSel.price == null) return 0;
    const base = svcSel.priceType === 'persona' ? svcSel.price * Math.max(1, svcPersons) : svcSel.price;
    return base + svcChosenAddons().reduce((n, a) => n + a.price, 0);
  };

  const confirmBooking = async () => {
    if (!svcSel) return;
    // must pick a real slot (bookable services only)
    if (svcSel.bookable) {
      if (svcSlots.length === 0) { flash(L('Cerrado ese día — elige otra fecha', 'Closed that day — pick another date')); return; }
      if (svcTime < 0) { flash(L('Elige una hora', 'Pick a time')); return; }
    }
    // block a full slot (per-session capacity truth, migration 0059)
    if (svcSel.bookable && svcSel.capMax > 0) {
      const iso = dateChips[svcDate]?.iso;
      if (iso && svcTime >= 0 && slotFull(iso, svcTime)) { flash(L('Ese horario está lleno — elige otro', 'That time is full — pick another')); return; }
    }
    if (!user) { router.push('/entrar'); return; }
    const chosen = svcChosenAddons().map((a) => B(a.name));
    const label = chosen.length ? `${svcSel.name} · ${chosen.join(', ')}` : svcSel.name;
    const total = svcTotal();
    const dep = svcSel.deposit && total > 0 ? total : null;
    const persons = svcSel.priceType === 'persona' ? Math.max(1, svcPersons) : null;
    // Booking with a deposit/price + seller takes cards → charge the deposit online
    // via Stripe; the confirmed booking is created by the webhook once paid.
    if (payOnline && svcSel.deposit && total > 0) {
      const { url } = await startMarketplaceCheckout({
        kind: 'booking', slug: b.slug, subtotal: total,
        payload: { service_name: label, service_id: svcSel.id ?? null, starts_at: svcStartISO(), party_size: persons, deposit: total },
      });
      if (url) { window.location.href = url; return; }
      flash(L('No se pudo iniciar el pago', 'Could not start payment'));
      return;
    }
    setSvcDone(true); // keep the existing success screen (optimistic pay-later / inquiry)
    const { error } = await act.book(b.slug, label, svcSel.id, svcStartISO(), persons, dep);
    if (!error) flash(svcSel.bookable ? L('Reserva enviada · míralo en Mi cuenta', 'Booking sent · see it in My account') : L('Solicitud enviada · míralo en Mi cuenta', 'Request sent · see it in My account'));
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
  const dateChips = useMemo<{ lab: Bi; sub: Bi; iso: string }[]>(() => {
    const wdEs = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const wdEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const moEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const moEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const base = new Date();
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const dow = d.getDay(), day = d.getDate();
      const lab: Bi = i === 0 ? ['Hoy', 'Today'] : i === 1 ? ['Mañana', 'Tomorrow'] : [wdEs[dow], wdEn[dow]];
      const sub: Bi = [`${moEs[d.getMonth()]} ${day}`, `${moEn[d.getMonth()]} ${day}`];
      return { lab, sub, iso: isoDay(d.getFullYear(), d.getMonth(), day) };
    });
  }, []);
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
  // Keep the selected slot valid: when the day/slot set (or its load) changes, snap
  // to the first slot that isn't full — or clear it if the day is closed/fully booked.
  useEffect(() => {
    if (!svcSel?.bookable) return;
    const iso = dateChips[svcDate]?.iso;
    const open = iso ? svcSlots.filter((t) => !slotFull(iso, t)) : svcSlots;
    if (svcTime < 0 || !open.includes(svcTime)) setSvcTime(open[0] ?? -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcSlots, svcSlotBusy]);
  // Per date chip: is EVERY slot that day already full? (grey the day out). Only
  // meaningful when hours + capacity are tracked; otherwise never "full".
  const svcDayFull = useMemo<boolean[]>(() => {
    if (!svcSel?.bookable || !svcHasHours || svcSel.capMax <= 0) return dateChips.map(() => false);
    return dateChips.map((c) => {
      const slots = bookingSlots(b.hours, b.hoursExceptions, parseISO(c.iso), parseDurMin(svcSel!.dur), now);
      return slots.length > 0 && slots.every((t) => slotFull(c.iso, t));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcSel?.bookable, svcSel?.dur, svcSel?.capMax, svcHasHours, dateChips, b.hours, b.hoursExceptions, now, svcSlotBusy]);

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
  // If the active tab becomes hidden (e.g. real data resolved to none), fall back.
  useEffect(() => {
    if (!tabShown[tab]) setTab('overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, realMenu, realShop, realServices, realRentals, b.slug]);

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

  const itemCard = (catKey: string, it: MenuItem, displayOnly = false) => {
    if (displayOnly) return catalogCard(it);
    const stk = shopStock(catKey, it);
    const soldOut = stk === 0;
    const low = stk != null && stk > 0 && stk <= 5;
    // Add-to-cart stepper: qty = this item summed across its cart lines (the simple
    // line + any customized variants). Items with option groups open the sheet on
    // first add / when the card is tapped (to customize); the stepper then inc/decs
    // the most recent line. At qty 1 the left control is a trash (removes the item);
    // at qty ≥ 2 it becomes a minus (one less).
    const groups = groupsFor(catKey, it);
    const hasOpts = groups.length > 0;
    const simpleKey = `${catKey}:${B(it.n)}`;
    const lineKeys = Object.keys(cart).filter((k) => k === simpleKey || k.startsWith(`${simpleKey}|`));
    const qty = lineKeys.reduce((n, k) => n + cart[k].qty, 0);
    const firstAdd = () => { if (hasOpts) openItem(catKey, it); else addSimple(catKey, it); };
    // Customizable item + at least one existing line → "+" is ambiguous (repeat
    // the last customization, or build a different one?), so ask instead of
    // guessing. Simple items (no addons) and the very first add stay one-tap.
    const incOne = () => {
      if (stk != null && qty >= stk) { flash(L('No hay más unidades', 'No more units available')); return; }
      if (!hasOpts) { addSimple(catKey, it); return; }
      if (lineKeys.length === 0) { openItem(catKey, it); return; }
      setAddPrompt({ catKey, item: it });
    };
    // Trash/− is only ambiguous once there are 2+ DIFFERENT customized lines for
    // this item — a single line (however many units) has nothing to choose between.
    const decOne = () => {
      if (qty <= 1 || lineKeys.length <= 1) { const k = lineKeys[lineKeys.length - 1]; if (k) decLine(k); return; }
      setRemovePrompt({ catKey, item: it });
    };
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

  // Real service card (Servicios tab). booking on + bookable → Reservar; booking
  // on + inquiry-only → Consultar; booking off (display-only) → no action button.
  const svcCard = (s: PubSvc) => {
    const canBook = svcBooking && s.bookable;
    const canInquire = svcBooking && !s.bookable;
    return (
      <div key={s.id} className="flex items-start gap-3 rounded-card-sm border border-hair bg-white p-3 shadow-card">
        <span className="relative h-[62px] w-[62px] flex-none overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${s.tile})` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {s.img && <img src={s.img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="truncate text-[14px] font-extrabold text-ink">{s.name}</span>
            <span className="flex-none text-[13.5px] font-extrabold text-primary-dark">{svcPriceLabel(s)}</span>
          </div>
          <div className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-snug text-muted">{B(s.desc)}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-muted-2">{s.dur}</span>
            {s.deposit && <span className="rounded-md bg-green-bg px-1.5 py-0.5 text-[9px] font-extrabold text-green-dark">{L('Depósito', 'Deposit')}</span>}
            {s.addons.length > 0 && <span className="rounded-md bg-lilac px-1.5 py-0.5 text-[9px] font-extrabold text-primary-dark">{s.addons.length} {L('add-ons', 'add-ons')}</span>}
          </div>
          {(canBook || canInquire) && (
            <button onClick={() => openSvc(pubToTarget(s))} className="mt-2.5 w-full cursor-pointer rounded-field bg-primary py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm sm:w-auto sm:px-5">
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

      {tab === 'shop' && (
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
          {/* featured collections (real) or the fixture promo strip */}
          {(realShop ? realShop.collections.length > 0 : true) && (
            <div className="no-scrollbar mb-4 flex gap-3 overflow-x-auto">
              {realShop
                ? realShop.collections.map((c) => (
                    <div key={c.es} className="w-[200px] flex-none rounded-card-sm p-3.5" style={{ background: `repeating-linear-gradient(135deg,${c.tile})` }}>
                      <div className="text-[9.5px] font-extrabold uppercase tracking-[.06em] text-ink-3">{L('Colección', 'Collection')}</div>
                      <div className="mt-0.5 text-[14px] font-extrabold text-ink">{L(c.es, c.en)}</div>
                    </div>
                  ))
                : SHOP_PROMOS.map((p) => (
                    <div key={p.t[0]} className="w-[200px] flex-none rounded-card-sm p-3.5" style={{ background: `repeating-linear-gradient(135deg,${p.bg})` }}>
                      <div className="text-[14px] font-extrabold" style={{ color: p.c }}>{B(p.t)}</div>
                      <div className="mt-0.5 text-[11.5px] font-bold text-ink-3">{B(p.sub)}</div>
                    </div>
                  ))}
            </div>
          )}
          {shopCats.map((c) => (
            <div key={c.key} className="mb-5">
              <div className="mb-2.5 flex items-baseline gap-2">
                <span className="text-[15.5px] font-extrabold text-ink">{B(c.name)}</span>
                <span className="text-[11.5px] font-bold text-muted">{c.items.length} {L('productos', 'products')}</span>
              </div>
              <div className={shopDisplayOnly ? 'grid grid-cols-1 gap-2.5 sm:grid-cols-2' : 'flex flex-col gap-2.5'}>{c.items.map((it) => itemCard(c.key, it, shopDisplayOnly))}</div>
            </div>
          ))}
        </div>
      )}

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
          onClick={() => { setCartOpen(true); setCartDone(false); }}
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
          return (
          <>
            <OverlayTitle title={L('Personaliza tu platillo', 'Customize your item')} onClose={() => setItemModal(null)} />
            <div className="flex items-center gap-3">
              <span className="relative h-14 w-14 flex-none overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${itemModal.item.bg})` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {itemModal.item.img && <img src={itemModal.item.img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold text-ink">{B(itemModal.item.n)}</div>
                <div className="text-[12px] font-semibold text-muted">{B(itemModal.item.d)}</div>
              </div>
              <span className="ml-auto text-[14px] font-extrabold text-ink">{money(itemModal.item.price)}</span>
            </div>
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
            {/* special instructions (design: Item Detail) — travels with the order line */}
            <div className="mb-1.5 mt-4 text-[13px] font-extrabold text-ink">{L('Instrucciones especiales', 'Special instructions')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span></div>
            <input
              value={modalNote}
              onChange={(e) => setModalNote(e.target.value)}
              maxLength={200}
              placeholder={L('Ej. sin cebolla, salsa aparte…', 'E.g. no onions, sauce on the side…')}
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
      <Overlay open={cartOpen} onClose={() => { setCartOpen(false); setCartView('cart'); }} width={440}>
        {cartDone ? (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
              <Check size={28} stroke={3} className="text-green" />
            </span>
            <div className="mt-4 text-[19px] font-extrabold text-ink">{L('¡Pedido realizado!', 'Order placed!')}</div>
            <div className="mt-1.5 max-w-[300px] text-[13px] font-semibold leading-relaxed text-muted">
              {L('Tu comida está en preparación. Te avisaremos cuando salga.', "Your food is being prepared. We'll notify you when it's on the way.")}
            </div>
            <PrimaryBtn className="mt-5" onClick={() => { setCart({}); setCartOpen(false); setCartDone(false); }}>
              {L('Seguir explorando', 'Keep browsing')}
            </PrimaryBtn>
          </div>
        ) : cartView === 'address' ? (
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
            <OverlayTitle title={L('Tu pedido', 'Your order')} onClose={() => setCartOpen(false)} />
            {cartCount === 0 ? (
              <div className="py-8 text-center">
                <div className="text-[14px] font-extrabold text-ink">{L('Tu carrito está vacío', 'Your cart is empty')}</div>
                <div className="mt-1 text-[12px] font-semibold text-muted">{L('Agrega platillos del menú para empezar.', 'Add items from the menu to start.')}</div>
              </div>
            ) : (
              <>
                <div className="flex max-h-[240px] flex-col gap-2.5 overflow-y-auto">
                  {Object.entries(cart).map(([k, l]) => (
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
                  ))}
                </div>

                {/* Entrega / Recoger */}
                {deliveryAvailable && (
                  <div className="mt-3.5 flex gap-1 rounded-full bg-lilac-2 p-1">
                    {deliveryAvailable && (
                      <button onClick={() => setOrderChannel('delivery')} className={`flex-1 cursor-pointer rounded-full py-2 text-center ${orderChannel === 'delivery' ? 'bg-white shadow-cta-sm' : ''}`}>
                        <span className={`block text-[11.5px] font-extrabold ${orderChannel === 'delivery' ? 'text-primary-dark' : 'text-muted'}`}>{L('Entrega', 'Delivery')}</span>
                        <span className="block text-[9.5px] font-bold text-muted">{del?.prep ? `${del.prep}–${del.prep + 15} min` : '30–45 min'}</span>
                      </button>
                    )}
                    <button onClick={() => setOrderChannel('pickup')} className={`flex-1 cursor-pointer rounded-full py-2 text-center ${!isDelivery ? 'bg-white shadow-cta-sm' : ''}`}>
                      <span className={`block text-[11.5px] font-extrabold ${!isDelivery ? 'text-primary-dark' : 'text-muted'}`}>{L('Recoger', 'Pickup')}</span>
                      <span className="block text-[9.5px] font-bold text-muted">{del?.prep ? `${del.prep} min` : '15–25 min'}</span>
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
                    <input
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      maxLength={300}
                      placeholder={L('Instrucciones: timbre, apto, dejar en puerta…', 'Instructions: buzzer, apt, leave at door…')}
                      className="mt-2 w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[12.5px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary"
                    />
                    {/* propina para el repartidor — solo en pago con tarjeta; en
                        efectivo el cliente le da la propina al repartidor directo */}
                    {payOnline && (<>
                    <div className="mt-3 text-[12px] font-extrabold text-ink">{L('Propina para el repartidor', 'Tip for your driver')} <span className="font-semibold text-muted">· {L('100% para él/ella', '100% goes to them')}</span></div>
                    <div className="mt-1.5 flex gap-1.5">
                      {[0, 0.1, 0.15, 0.2].map((p) => {
                        const on = !customTipOn && tipPct === p;
                        return (
                          <button key={p} onClick={() => { setCustomTipOn(false); setTipPct(p); }} className={`flex-1 cursor-pointer rounded-btn border-[1.5px] py-1.5 text-center ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                            <span className={`block text-[11.5px] font-extrabold ${on ? 'text-primary-dark' : 'text-ink-soft'}`}>{p === 0 ? L('Sin', 'None') : `${p * 100}%`}</span>
                            {p > 0 && <span className="block text-[9.5px] font-bold text-muted">{money(+(cartTotal * p).toFixed(2))}</span>}
                          </button>
                        );
                      })}
                      <button onClick={() => setCustomTipOn(true)} className={`flex-1 cursor-pointer rounded-btn border-[1.5px] py-1.5 text-center ${customTipOn ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                        <span className={`block text-[11.5px] font-extrabold ${customTipOn ? 'text-primary-dark' : 'text-ink-soft'}`}>{L('Otra', 'Other')}</span>
                        <span className="block text-[9.5px] font-bold text-muted">$</span>
                      </button>
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

                {/* desglose — coincide EXACTO con el cobro de Stripe (o efectivo) */}
                <div className="mt-4 flex flex-col gap-1.5 border-t border-hair pt-3 text-[12.5px] font-semibold text-ink-2">
                  <div className="flex justify-between"><span>{L('Subtotal', 'Subtotal')}</span><span>{money(cartTotal)}</span></div>
                  {isDelivery && <div className="flex justify-between"><span>{L('Tarifa de entrega', 'Delivery fee')}</span><span>{money(deliveryFee)}</span></div>}
                  {payOnline && <div className="flex justify-between"><span>{L('Tarifa de servicio (5%)', 'Service fee (5%)')}</span><span>{money(serviceFee)}</span></div>}
                  {tip > 0 && <div className="flex justify-between"><span>{L('Propina', 'Tip')}</span><span>{money(tip)}</span></div>}
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
                  <div className="mt-2 rounded-field bg-amber-bg px-3 py-2 text-[11.5px] font-bold text-amber-ink">
                    {L(`Pedido mínimo para entrega: $${(del?.min ?? 0).toFixed(2)} — agrega ${money((del?.min ?? 0) - cartTotal)} más`, `Delivery minimum is $${(del?.min ?? 0).toFixed(2)} — add ${money((del?.min ?? 0) - cartTotal)} more`)}
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
          </>
        )}
      </Overlay>

      {/* service booking modal */}
      <Overlay open={svcSel !== null} onClose={() => setSvcSel(null)} width={440}>
        {svcSel !== null && !svcDone && (() => {
          const total = svcTotal();
          const showTotal = svcSel.price != null && total > 0;
          return (
            <>
              <OverlayTitle title={svcSel.name} onClose={() => setSvcSel(null)} />
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
                <span className="min-w-0 flex-1">{L(svcSel.descEs, svcSel.descEn)}</span>
                {svcSel.priceLabel && <span className="flex-none font-extrabold text-primary-dark">{B(svcSel.priceLabel)}</span>}
              </div>

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
                  const full = svcSel.bookable && (svcDayFull[i] ?? false);
                  const on = svcDate === i && !full;
                  return (
                    <button key={i} disabled={full} onClick={() => setSvcDate(i)} className={`flex-none rounded-btn px-3.5 py-2 text-center ${on ? 'bg-primary text-white' : full ? 'cursor-not-allowed bg-lilac-2 opacity-50' : 'cursor-pointer bg-lilac-2 text-ink-soft'}`}>
                      <span className="block text-[12.5px] font-extrabold">{B(d.lab)}</span>
                      <span className={`block text-[10.5px] font-bold ${on ? 'text-white/80' : 'text-muted'}`}>{B(d.sub)}</span>
                      {full ? <span className="mt-0.5 block text-[8.5px] font-extrabold text-pink-dark">{L('Lleno', 'Full')}</span> : null}
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
                    <div className="no-scrollbar flex gap-2 overflow-x-auto">
                      {svcSlots.map((t) => {
                        const iso = dateChips[svcDate]?.iso;
                        const full = !!iso && slotFull(iso, t);
                        const left = iso && svcSel!.capMax > 0 && svcSel!.capMax < 9999 ? svcSel!.capMax - slotSeats(iso, t) : null;
                        const sel = svcTime === t && !full;
                        return (
                          <button
                            key={t}
                            disabled={full}
                            onClick={() => setSvcTime(t)}
                            className={`flex-none rounded-btn px-3.5 py-2 text-center ${sel ? 'bg-primary text-white' : full ? 'cursor-not-allowed bg-lilac-2 opacity-50' : 'cursor-pointer bg-lilac-2 text-ink-soft'}`}
                          >
                            <span className="block text-[12.5px] font-extrabold">{fmtShort(t)}</span>
                            {full ? <span className="mt-0.5 block text-[8.5px] font-extrabold text-pink-dark">{L('Lleno', 'Full')}</span>
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

              {/* total + deposit summary (numeric-priced services) */}
              {showTotal && (
                <div className="mt-4 rounded-field bg-lilac-2 p-3.5 text-[12.5px] font-semibold text-ink-2">
                  <div className="flex justify-between"><span>{L('Total estimado', 'Estimated total')}</span><span className="text-[14px] font-extrabold text-ink">{money(total)}</span></div>
                  {svcSel.deposit && payOnline && total > 0
                    ? <>
                        <div className="mt-1 flex justify-between text-[11.5px]"><span>{L('Depósito al reservar', 'Deposit at booking')}</span><span className="font-extrabold text-ink">{money(total)}</span></div>
                        <div className="mt-0.5 flex justify-between text-[11.5px]"><span>{L('Tarifa de servicio (5%)', 'Service fee (5%)')}</span><span className="font-extrabold text-ink">{money(+(total * 0.05).toFixed(2))}</span></div>
                        <div className="mt-1 flex justify-between border-t border-lilac-line pt-1 text-[11.5px]"><span>{L('Pagas hoy', 'You pay today')}</span><span className="font-extrabold text-primary-dark">{money(+(total * 1.05).toFixed(2))}</span></div>
                      </>
                    : svcSel.deposit && <div className="mt-1 flex justify-between text-[11.5px]"><span>{L('Depósito al reservar', 'Deposit at booking')}</span><span className="font-extrabold text-primary-dark">{money(total)}</span></div>}
                </div>
              )}

              <PrimaryBtn className="mt-5" onClick={confirmBooking}>
                {payOnline && svcSel.deposit && total > 0
                  ? `${L('Pagar reserva · ', 'Pay booking · ')}${money(+(total * 1.05).toFixed(2))}`
                  : svcSel.bookable ? L('Solicitar reserva', 'Request booking') : L('Solicitar información', 'Request info')}
              </PrimaryBtn>
            </>
          );
        })()}
        {svcSel !== null && svcDone && (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
              <Check size={28} stroke={3} className="text-green" />
            </span>
            <div className="mt-4 text-[19px] font-extrabold text-ink">{svcSel.bookable ? L('¡Solicitud enviada!', 'Request sent!') : L('¡Consulta enviada!', 'Inquiry sent!')}</div>
            <div className="mt-1.5 max-w-[300px] text-[13px] font-semibold leading-relaxed text-muted">
              {L('Te contactaremos pronto para confirmar los detalles.', "We'll contact you soon to confirm the details.")}
            </div>
            <PrimaryBtn className="mt-5" onClick={() => { setSvcSel(null); setSvcDone(false); }}>
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

              <div className="mt-3 rounded-field bg-lilac-2 p-3.5 text-[12.5px] font-semibold text-ink-2">
                <div className="flex justify-between"><span>{L('Renta', 'Rental')}{rentStart ? ` · ${rentUnits > 1 ? `${rentUnits}× ` : ''}${dayLbl}` : ''}</span><span>{money(unitFee * rentUnits)}</span></div>
                {selectedAddons.map((a) => (
                  <div key={a.id} className="mt-1 flex justify-between text-[11.5px]"><span>{B(a.name)}</span><span>{a.price ? money(a.price) : L('Gratis', 'Free')}</span></div>
                ))}
                <div className="mt-1 flex justify-between"><span>{L('Depósito reembolsable', 'Refundable deposit')}{payOnline && rentSubtotal(it) > 0 ? L(' · al recoger', ' · at pickup') : ''}{rentUnits > 1 ? ` · ${rentUnits}×` : ''}</span><span>{money(it.dep * rentUnits)}</span></div>
                {payOnline && rentSubtotal(it) > 0 && (
                  <>
                    <div className="mt-1 flex justify-between text-[11.5px]"><span>{L('Tarifa de servicio (5%)', 'Service fee (5%)')}</span><span>{money(+(rentSubtotal(it) * 0.05).toFixed(2))}</span></div>
                    <div className="mt-2 flex items-center justify-between border-t border-lilac-line pt-2 text-[14px] font-extrabold text-ink">
                      <span>{L('Pagas hoy', 'You pay today')}</span><span className="text-primary-dark">{money(+(rentSubtotal(it) * 1.05).toFixed(2))}</span>
                    </div>
                  </>
                )}
                {!(payOnline && rentSubtotal(it) > 0) && (
                  <div className="mt-2 flex items-center justify-between border-t border-lilac-line pt-2 text-[14px] font-extrabold text-ink">
                    <span>{L('Total', 'Total')}</span><span className="text-primary-dark">{money(rentGrand(it))}</span>
                  </div>
                )}
              </div>

              <PrimaryBtn className="mt-4" onClick={confirmRental}>
                {!rentStart ? L('Elige la fecha', 'Pick a date') : payOnline && rentSubtotal(it) > 0 ? `${L('Pagar renta · ', 'Pay rental · ')}${money(+(rentSubtotal(it) * 1.05).toFixed(2))}` : L('Solicitar renta', 'Request rental')}
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

      {/* confirmation toast — width-capped + centered (never overflows) */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[90] w-[calc(100%-28px)] max-w-[360px] -translate-x-1/2 rounded-xl bg-ink px-4 py-3 text-center text-[12.5px] font-bold text-white shadow-modal">
          {toast}
        </div>
      )}
    </div>
  );
}
