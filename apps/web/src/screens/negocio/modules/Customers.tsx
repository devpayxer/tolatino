'use client';

// Clientes / Pedidos / Reseñas module (business dashboard). One screen, three
// modes selected by a top toggle (initial mode derives from the `tab` prop):
//  · Clientes — KPIs, search, segment sub-tabs, customer cards, loyalty toggles.
//  · Pedidos  — KPIs, status filter chips, order cards with a real ADVANCE
//               button (new → preparing → ready → completed).
//  · Reseñas  — rating breakdown bars + review cards, each with an AI-draft
//               reply (fills an editable box) and a flag toggle.
// Mobile-first; on desktop the secondary panels move into a sticky side rail and
// lists spread into multi-column grids. All state is real & local.

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck as Check, IconChevronRight as ChevronRight, IconEye as Eye, IconClock as Clock, IconCurrencyDollar as DollarSign, IconDownload as Download, IconFlag as Flag, IconGift as Gift, IconHeart as Heart, IconMail as Mail, IconPhone as Phone, IconRefresh as RefreshCw, IconSearch as Search, IconShoppingBag as ShoppingBag, IconSparkles as Sparkles, IconStar as Star, IconTruck as Truck, IconUserPlus as UserPlus, IconUsers as Users, IconCircleX as XCircle, IconBolt as Zap } from '@tabler/icons-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useUrlTab } from '@/lib/urlView';
import { supabase } from '@/lib/supabase';
import { refundPurchase } from '@/lib/stripe';
import { Overlay, OverlayTitle, Switch } from '@/components/ui';
import type { OwnDriver } from '@/screens/negocio/modules/FulfillmentEditors';
import { orderStageLabel } from '@/components/OrderSteps';

type Mode = 'customers' | 'orders' | 'reviews';
type Seg = 'all' | 'new' | 'regulars' | 'vip' | 'risk';
type OStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
// Board view filters: DB statuses + the client-facing "En camino" bucket
// (delivery orders out with a driver — status stays 'ready' in the DB).
type OView = OStatus | 'on_the_way';
type Channel = 'delivery' | 'dinein' | 'pickup';
type RvFilter = 'all' | 'need' | 'top' | 'low' | 'flagged';

type Customer = {
  id: number; dbId?: string; userId?: string | null; initials: string; color: string; name: string; visits: number;
  spent: string; spentN?: number; points?: number; phone?: string | null; email?: string | null; notes?: string | null;
  last: [string, string]; tag: [string, string]; vip: boolean;
  isNew: boolean; atRisk: boolean; b2b?: boolean;
};
// Delivery/prep/payout metadata (business_orders.fulfillment jsonb, migration
// 0049/0074 — no schema change needed for any of §Pedidos' new features below).
type Fulfil = {
  address?: string; address_label?: string; instructions?: string; tip?: number;
  dispatch?: 'unassigned' | 'assigned' | 'picked_up' | 'on_the_way' | 'delivered';
  driver?: string; driver_phone?: string; driver_vehicle?: string; eta?: string; eta_range?: string; prep?: number;
  subtotal?: number; delivery_fee?: number; service_fee?: number; paid_total?: number;
  // 'cash' orders are paid on delivery/pickup (no Stripe) — the seller collects
  // `collect_total` in cash; 'online'/absent means already charged by card.
  payment?: 'cash' | 'online'; collect_total?: number;
  // 'store' = Tienda order (every line a product) → the client sees Amazon-style
  // copy and a DAY-based delivery window, never kitchen minutes.
  kind?: string;
};
type Order = {
  id: string; dbId?: string; who: [string, string]; placed: [string, string]; urgent: boolean;
  channel: Channel; status: OStatus; total: string; items: [string, string];
  lines?: OrderItem[]; totalN?: number; createdAt?: string; userId?: string | null;
  fulfillment?: Fulfil;
};
type Review = {
  id: number; dbId?: string; initials: string; color: string; name: [string, string]; stars: number;
  date: string; ch: 'Google' | 'Nearby' | 'Yelp'; helpful: number;
  text: [string, string]; ai: [string, string]; seededReply?: [string, string];
  reply_es?: string | null; reply_en?: string | null;
};

// Aggregate stats from the owner_customer_stats / owner_order_stats RPCs (0069).
type CustStats = {
  total: number; new_30d: number; returning_n: number; avg_ltv: number;
  vip_n: number; vip_ltv: number; reg_n: number; reg_ltv: number;
  occ_n: number; occ_ltv: number; new_seg_n: number; new_ltv: number;
  risk_n: number; risk_ltv: number; enrolled: number;
};
type OrderStats = {
  today_count: number; today_revenue: number; in_flight: number; total_count: number;
  status: Record<string, number>; channel_today: Record<string, number>;
};

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';

const CH_TILE: Record<Channel, string> = {
  delivery: 'bg-pink-bg text-pink-dark',
  dinein: 'bg-lilac-2 text-primary-dark',
  pickup: 'bg-amber-bg text-amber-ink',
};
const STATUS_DOT: Record<OStatus, string> = {
  new: '#F0466E', preparing: '#F4B740', ready: '#7B61FF', completed: '#1F9D57', cancelled: '#9A96AE',
};
const FLOW: Record<OStatus, OStatus | null> = {
  new: 'preparing', preparing: 'ready', ready: 'completed', completed: null, cancelled: null,
};
const CH_REVIEW: Record<Review['ch'], string> = {
  Google: 'bg-green-bg text-green-dark',
  Nearby: 'bg-lilac-2 text-primary-dark',
  Yelp: 'bg-amber-bg text-amber-ink',
};

// A public `reviews` row (owner view) → the module's Review shape. Real reviews
// are native to To'Latino, so channel = 'Nearby'. `dbId` tracks the DB uuid so
// the owner's reply targets it via the reply_to_review RPC. `reply_es/en` carry
// any existing owner reply so it renders immediately.
type ReviewRow = {
  id: string; author_name: string; author_initials: string | null; rating: number;
  body_es: string | null; body_en: string | null; reply_es: string | null;
  reply_en: string | null; replied_at: string | null; created_at: string;
};
const RV_COLORS = ['#7B61FF', '#1F9D57', '#2A5C8A', '#D6336C', '#E8954A', '#9A6A12', '#B5791A'];
const relTime = (iso: string, es: boolean) => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (m < 1) return es ? 'ahora' : 'now';
  if (m < 60) return es ? `${m} min` : `${m}m`;
  if (h < 24) return `${h}h`;
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mo`;
};
function rowToReview(r: ReviewRow, idx: number, es: boolean): Review {
  const initials = (r.author_initials?.trim())
    || r.author_name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
    || 'A';
  return {
    id: idx + 1,
    dbId: r.id,
    initials,
    color: RV_COLORS[idx % RV_COLORS.length],
    name: [r.author_name, r.author_name],
    stars: r.rating,
    date: relTime(r.created_at, es),
    ch: 'Nearby',
    helpful: 0,
    text: [r.body_es ?? '', r.body_en ?? r.body_es ?? ''],
    ai: ['', ''],
    reply_es: r.reply_es,
    reply_en: r.reply_en,
  };
}

// ---- Clientes / Pedidos real-data mapping ---------------------------------
// Private per-business tables (RLS: owner-only). Both tabs mirror the reviews
// pattern above: a real signed-in owner → load + map rows (`dbId` tracks the DB
// uuid so writes target the right row); demo → keep the local fixture untouched.
type CustomerRow = {
  id: string; user_id: string | null; name: string; initials: string | null; color: string | null;
  phone: string | null; email: string | null; orders_count: number | null;
  spend: number | string | null; tag: string | null; notes: string | null;
  last_order_at: string | null; created_at: string; loyalty_points: number | null;
};
type OrderItem = { name?: string; qty?: number; price?: number };
type OrderRow = {
  id: string; code: string | null; customer_name: string | null;
  items: OrderItem[] | null; total: number | string | null;
  channel: string | null; status: string; created_at: string;
  fulfillment: Record<string, unknown> | null;
};

const money0 = (n: number | string | null) => `$${(Math.round(Number(n ?? 0)) || 0).toLocaleString('en-US')}`;
const money2 = (n: number | string | null) =>
  `$${(Number(n ?? 0) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// A private `business_customers` row → the module's Customer shape. The free-text
// `tag` drives both the display chip and the segment flags (vip / new / at-risk /
// b2b) so the Clientes sub-tabs keep filtering on real data.
function rowToCustomer(r: CustomerRow, idx: number): Customer {
  const tag = (r.tag ?? '').trim();
  const t = tag.toLowerCase();
  const b2b = t.includes('b2b');
  const vip = b2b || t.includes('vip');
  const isNew = t.includes('nuevo') || t.includes('new');
  const atRisk = t.includes('riesgo') || t.includes('risk');
  const initials = (r.initials?.trim())
    || r.name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
    || 'C';
  return {
    id: idx + 1,
    dbId: r.id,
    userId: r.user_id,
    initials,
    color: r.color || RV_COLORS[idx % RV_COLORS.length],
    name: r.name,
    visits: Number(r.orders_count ?? 0) || 0,
    spent: money0(r.spend),
    spentN: Number(r.spend ?? 0) || 0,
    points: Number(r.loyalty_points ?? 0) || 0,
    phone: r.phone,
    email: r.email,
    notes: r.notes,
    last: r.last_order_at ? [relTime(r.last_order_at, true), relTime(r.last_order_at, false)] : ['—', '—'],
    tag: tag ? [tag, tag] : ['Cliente', 'Customer'],
    vip,
    isNew,
    atRisk,
    b2b: b2b || undefined,
  };
}

const ORDER_CHANNELS: Channel[] = ['delivery', 'dinein', 'pickup'];
function itemsLine(items: OrderRow['items']): string {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .map((it) => {
      const q = Number(it?.qty ?? 1) || 1;
      const name = (it?.name ?? '').toString().trim();
      if (!name) return '';
      return q > 1 ? `${q}× ${name}` : name;
    })
    .filter(Boolean)
    .join(', ');
}

// A private `business_orders` row → the module's Order shape. `items` is a jsonb
// array [{name,qty,price}] summarized into one line; `code` is the human order id
// and `dbId` the DB uuid the status-advance button writes back to. A DB status of
// 'cancelled' simply falls outside the four filter tabs, so it renders nowhere.
function rowToOrder(r: OrderRow): Order {
  const channel = (ORDER_CHANNELS.includes(r.channel as Channel) ? r.channel : 'dinein') as Channel;
  const line = itemsLine(r.items);
  const code = (r.code && r.code.trim()) || `#${r.id.slice(0, 6)}`;
  const ageMin = (Date.now() - new Date(r.created_at).getTime()) / 60000;
  return {
    id: code,
    dbId: r.id,
    who: [r.customer_name || 'Cliente', r.customer_name || 'Customer'],
    placed: [relTime(r.created_at, true), relTime(r.created_at, false)],
    urgent: r.status === 'new' && Number.isFinite(ageMin) && ageMin < 5,
    channel,
    status: r.status as OStatus,
    total: money2(r.total),
    items: [line || 'Pedido', line || 'Order'],
    lines: Array.isArray(r.items) ? r.items : [],
    totalN: Number(r.total ?? 0) || 0,
    createdAt: r.created_at,
    fulfillment: (r.fulfillment as Fulfil | null) ?? {},
  };
}

export function CustomersModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es, isFree, isPremium, ci } = ctx;

  const initialMode: Mode = tab === 'orders' ? 'orders' : tab === 'reviews' ? 'reviews' : 'customers';

  // ---- seed data ------------------------------------------------------------
  const seedCustomers = useMemo<Customer[]>(
    () => [
      { id: 1, initials: 'ML', color: '#7B61FF', name: 'María López', visits: 24, spent: '$1,824', last: ['hace 2 días', '2 days ago'], tag: ['VIP', 'VIP'], vip: true, isNew: false, atRisk: false },
      { id: 2, initials: 'MT', color: '#1F9D57', name: 'Mission Tech', visits: 12, spent: '$4,680', last: ['hoy', 'today'], tag: ['B2B', 'B2B'], vip: true, isNew: false, atRisk: false, b2b: true },
      { id: 3, initials: 'JT', color: '#2A5C8A', name: 'James Tate', visits: 18, spent: '$1,420', last: ['hace 1 sem', '1 wk ago'], tag: ['Recurrente', 'Regular'], vip: false, isNew: false, atRisk: false },
      { id: 4, initials: 'SR', color: '#D6336C', name: 'Sofía Reyes', visits: 14, spent: '$840', last: ['hoy', 'today'], tag: ['Recurrente', 'Regular'], vip: false, isNew: false, atRisk: false },
      { id: 5, initials: 'AF', color: '#E8954A', name: 'Anna F.', visits: 8, spent: '$986', last: ['hace 3 días', '3 days ago'], tag: ['Catas', 'Tasting'], vip: false, isNew: false, atRisk: false },
      { id: 6, initials: 'CM', color: '#9A6A12', name: 'Carlos M.', visits: 3, spent: '$184', last: ['hace 4 días', '4 days ago'], tag: ['Nuevo', 'New'], vip: false, isNew: true, atRisk: false },
      { id: 7, initials: 'RG', color: '#B5791A', name: 'Rosa G.', visits: 11, spent: '$620', last: ['hace 68 días', '68 days ago'], tag: ['En riesgo', 'At risk'], vip: false, isNew: false, atRisk: true },
    ],
    [],
  );

  const seedOrders = useMemo<Order[]>(
    () => [
      { id: '#2487', who: ['María López', 'María López'], placed: ['ahora', 'just now'], urgent: true, channel: 'delivery', status: 'new', total: '$48.20', items: ['2× Quesabirria, Horchata, Agua', '2× Quesabirria, Horchata, Water'] },
      { id: '#2486', who: ['Mesa 7', 'Table 7'], placed: ['hace 2 min', '2m ago'], urgent: false, channel: 'dinein', status: 'new', total: '$92.00', items: ['3× Tacos al pastor, Vino tinto', '3× Tacos al pastor, Red wine'] },
      { id: '#2484', who: ['James Tate', 'James Tate'], placed: ['hace 8 min', '8m ago'], urgent: false, channel: 'pickup', status: 'preparing', total: '$40.40', items: ['Canasta de pan, Bucatini', 'Bread basket, Bucatini'] },
      { id: '#2483', who: ['Mesa 12', 'Table 12'], placed: ['hace 12 min', '12m ago'], urgent: false, channel: 'dinein', status: 'preparing', total: '$280.00', items: ['Menú degustación · 5 platos', 'Tasting menu · 5 courses'] },
      { id: '#2481', who: ['Carlos M.', 'Carlos M.'], placed: ['hace 18 min', '18m ago'], urgent: false, channel: 'delivery', status: 'ready', total: '$24.50', items: ['Torta ahogada, 2× Refrescos', 'Torta ahogada, 2× Sodas'] },
      { id: '#2477', who: ['Mesa 5', 'Table 5'], placed: ['cerrado', 'closed'], urgent: false, channel: 'dinein', status: 'completed', total: '$220.00', items: ['Cena para 4, 3× Cócteles', 'Dinner for 4, 3× Cocktails'] },
    ],
    [],
  );

  const seedReviews = useMemo<Review[]>(
    () => [
      { id: 1, initials: 'JT', color: '#2A5C8A', name: ['James Tate', 'James Tate'], stars: 4, date: es ? '14 min' : '14m', ch: 'Google', helpful: 8, text: ['El servicio fue un poco lento pero la comida lo compensó. El menú degustación fue lo mejor.', 'Service was a bit slow but the food made up for it. The tasting menu was a highlight.'], ai: ['¡Gracias por las amables palabras, James! Nos alegra que el menú degustación te encantara. Estamos mejorando los tiempos en la cena.', 'Thanks for the kind words, James! So glad the tasting menu landed. We’re tightening up our dinner pacing.'] },
      { id: 2, initials: 'ML', color: '#7B61FF', name: ['María López', 'María López'], stars: 5, date: '2h', ch: 'Nearby', helpful: 14, text: ['El mejor al pastor de Houston. Los martes de 2x1 son una experiencia religiosa.', 'Best al pastor in Houston. Taco Tuesday is a religious experience.'], ai: ['¡Mil gracias, María! Nos llena de alegría — significa mucho para todo el equipo. ¡Te esperamos pronto!', 'Thank you so much, María! We’re thrilled — it means the world to the whole team.'] },
      { id: 3, initials: 'DK', color: '#D6336C', name: ['Daniel Kim', 'Daniel Kim'], stars: 5, date: '3d', ch: 'Google', helpful: 22, text: ['Cena de cumpleaños — trajeron una vela en el pastel. Hicieron la noche.', 'Birthday dinner — they brought out a candle on the cake. Made the night.'], ai: ['', ''], seededReply: ['¡Mil gracias por las amables palabras — nos vemos pronto!', 'Thank you so much for the kind words — see you again soon!'] },
      { id: 4, initials: 'A', color: '#9A96AE', name: ['Anónimo', 'Anonymous'], stars: 1, date: '2d', ch: 'Yelp', helpful: 0, text: ['Nunca comí aquí pero el dueño es claramente caro y grosero. Una estrella.', 'Never even ate here but the owner is clearly overpriced and rude. One star.'], ai: ['Hola — tomamos en serio toda retroalimentación, pero no tenemos registro de una visita con este nombre. Si cenaste con nosotros, contáctanos directamente.', 'Hi — we take all feedback seriously, but we have no record of a visit under this name. Please reach out directly.'] },
    ],
    [es],
  );

  // Reviews are the only real-data view here (Clientes/Pedidos stay fixture).
  // Signed-in owner → load their business's reviews; demo → keep the fixture.
  const admin = useBizAdmin();
  const real = admin.active;
  const persistable = !admin.demo && !!real; // real signed-in business → persist replies
  const [realReviews, setRealReviews] = useState<Review[] | null>(null);
  const reviews = realReviews ?? seedReviews;
  // Clientes / Pedidos also load real data for a signed-in business (demo keeps
  // the fixtures). Orders live in the mutable `orders` state below (the advance
  // button edits them), so only Clientes needs its own real/fixture switch here.
  const [realCustomers, setRealCustomers] = useState<Customer[] | null>(null);
  const customers = realCustomers ?? seedCustomers;

  // ---- state ----------------------------------------------------------------
  const [mode, setMode] = useState<Mode>(initialMode);
  const [query, setQuery] = useState('');
  // Customer segment mirrored to ?sub= (refresh-safe; Panel clears it on switch).
  const [seg, setSeg] = useUrlTab<Seg>('sub', 'all', (v) => ['all', 'new', 'regulars', 'vip', 'risk'].includes(v));
  // Loyalty config persists in businesses.settings.loyalty (real). Synced from the
  // active business on load (effect below); toggling persists via admin.update.
  const savedLoyalty = (((real?.settings as Record<string, unknown> | null)?.loyalty) ?? null) as { enabled?: boolean; rate?: number; rewards?: Record<string, boolean> } | null;
  const [loyaltyOn, setLoyaltyOn] = useState(savedLoyalty?.enabled ?? true);
  const [loyaltyRate, setLoyaltyRate] = useState<number>(savedLoyalty?.rate ?? 1);
  const [rewards, setRewards] = useState<Record<number, boolean>>(
    savedLoyalty?.rewards
      ? { 0: !!savedLoyalty.rewards['0'], 1: !!savedLoyalty.rewards['1'], 2: !!savedLoyalty.rewards['2'], 3: !!savedLoyalty.rewards['3'] }
      : { 0: true, 1: true, 2: true, 3: false },
  );

  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [oStatus, setOStatus] = useState<OView>('new');

  const [rvFilter, setRvFilter] = useState<RvFilter>('all');
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [posted, setPosted] = useState<Record<number, [string, string]>>(() => {
    const seeded: Record<number, [string, string]> = {};
    seedReviews.forEach((r) => { if (r.seededReply) seeded[r.id] = r.seededReply; });
    return seeded;
  });
  const [flagged, setFlagged] = useState<Record<number, boolean>>({ 4: true });
  const [editingId, setEditingId] = useState<number | null>(null);

  const [toast, setToast] = useState('');
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 1900);
  };

  // Load the real business's reviews (demo keeps the sample fixture). Seed the
  // `posted` map from any existing owner reply so it renders right away.
  useEffect(() => {
    if (!persistable || !real || !supabase) {
      setRealReviews(null); // demo / not configured → fixture (posted stays seeded)
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!
        .from('reviews')
        .select('id,author_name,author_initials,rating,body_es,body_en,reply_es,reply_en,replied_at,created_at')
        .eq('business_id', real.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      const rows = error || !Array.isArray(data) ? [] : (data as ReviewRow[]);
      const mapped = rows.map((r, i) => rowToReview(r, i, es));
      setRealReviews(mapped);
      const seeded: Record<number, [string, string]> = {};
      mapped.forEach((r) => { if (r.reply_es) seeded[r.id] = [r.reply_es, r.reply_en ?? r.reply_es]; });
      setPosted(seeded);
      setFlagged({}); // fixture's default flag doesn't apply to real reviews
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  // Load the real business's private customer directory (demo keeps the fixture).
  useEffect(() => {
    if (!persistable || !real || !supabase) {
      setRealCustomers(null); // demo / not configured → fixture
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!
        .from('business_customers')
        .select('id,user_id,name,initials,color,phone,email,orders_count,spend,tag,notes,last_order_at,created_at,loyalty_points')
        .eq('business_id', real.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      const rows = error || !Array.isArray(data) ? [] : (data as CustomerRow[]);
      setRealCustomers(rows.map((r, i) => rowToCustomer(r, i)));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  // Load the real business's orders (demo keeps the fixture). Status advances then
  // persist to `business_orders` via `advance`; demo mutations stay local.
  useEffect(() => {
    if (!persistable || !real || !supabase) {
      setOrders(seedOrders); // demo / not configured → fixture
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!
        .from('business_orders')
        .select('id,code,customer_name,items,total,channel,status,created_at,fulfillment')
        .eq('business_id', real.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      const rows = error || !Array.isArray(data) ? [] : (data as OrderRow[]);
      rows.forEach((r) => seenOrderIds.current.add(r.id)); // don't re-toast orders already on screen
      setOrders(rows.map(rowToOrder));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  // NEW (Cocina handoff): realtime "new order" awareness — prepend + a toast, so
  // the owner doesn't have to reload to see it. No modal takeover (keeps the
  // existing screen exactly as before); accepting still happens by tapping the
  // card, same as any other order.
  const seenOrderIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!persistable || !real || !supabase) return;
    const ch = supabase.channel(`pedidos-${real.id}`).on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'business_orders', filter: `business_id=eq.${real.id}` },
      (payload) => {
        const row = payload.new as OrderRow;
        if (seenOrderIds.current.has(row.id)) return;
        seenOrderIds.current.add(row.id);
        setOrders((list) => (list.some((o) => o.dbId === row.id) ? list : [rowToOrder(row), ...list]));
        if (row.status === 'new') flash(L(`¡Nuevo pedido! ${row.code ?? ''}`, `New order! ${row.code ?? ''}`));
      },
    ).subscribe();
    return () => { supabase!.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  // ---- real aggregate stats (Clientes KPIs/segments · Pedidos KPIs/mix) ------
  const [custStats, setCustStats] = useState<CustStats | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [statsV, setStatsV] = useState(0);
  useEffect(() => {
    if (!persistable || !real || !supabase) { setCustStats(null); setOrderStats(null); return; }
    let cancelled = false;
    (async () => {
      const [cs, os] = await Promise.all([
        supabase!.rpc('owner_customer_stats', { in_business: real.id }),
        supabase!.rpc('owner_order_stats', { in_business: real.id }),
      ]);
      if (cancelled) return;
      if (!cs.error && cs.data) setCustStats(cs.data as CustStats);
      if (!os.error && os.data) setOrderStats(os.data as OrderStats);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo, statsV]);

  // Sync loyalty controls from the active business whenever it changes.
  useEffect(() => {
    const lc = ((real?.settings as Record<string, unknown> | null)?.loyalty ?? null) as { enabled?: boolean; rate?: number; rewards?: Record<string, boolean> } | null;
    if (!lc) return;
    setLoyaltyOn(lc.enabled ?? true);
    setLoyaltyRate(lc.rate ?? 1);
    if (lc.rewards) setRewards({ 0: !!lc.rewards['0'], 1: !!lc.rewards['1'], 2: !!lc.rewards['2'], 3: !!lc.rewards['3'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id]);

  // Persist loyalty config to businesses.settings.loyalty (real only).
  const persistLoyalty = (patch: { enabled?: boolean; rate?: number; rewards?: Record<number, boolean> }) => {
    if (!persistable || !real) return;
    const cur = (real.settings as Record<string, unknown> | null) ?? {};
    const nextRewards = patch.rewards ?? rewards;
    void admin.update({ settings: { ...cur, loyalty: {
      enabled: patch.enabled ?? loyaltyOn,
      rate: patch.rate ?? loyaltyRate,
      points_per_dollar: patch.rate ?? loyaltyRate,
      rewards: { '0': !!nextRewards[0], '1': !!nextRewards[1], '2': !!nextRewards[2], '3': !!nextRewards[3] },
    } } });
  };

  // Detail sheets: customer history + order detail.
  const [selCust, setSelCust] = useState<Customer | null>(null);
  const [custOrders, setCustOrders] = useState<Order[] | null>(null);
  const [selOrder, setSelOrder] = useState<Order | null>(null);

  // ---- derived --------------------------------------------------------------
  const inFlight = orderStats ? orderStats.in_flight : orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length;
  const needReply = reviews.filter((r) => !posted[r.id] && !flagged[r.id]).length;

  const modes: [Mode, string, number][] = [
    ['customers', L('Clientes', 'Customers'), 0],
    ['orders', L('Pedidos', 'Orders'), inFlight],
    ['reviews', L('Reseñas', 'Reviews'), needReply],
  ];

  // ---- shared bits ----------------------------------------------------------
  const chip = (on: boolean) =>
    `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;

  const Kpi = ({ Icon, c, bg, label, value, delta, dC }: { Icon: typeof Users; c: string; bg: string; label: string; value: string; delta: string; dC?: string }) => (
    <div className={`${cardCls} p-3.5`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: bg }}>
        <Icon size={15} strokeWidth={2.2} style={{ color: c }} />
      </span>
      <div className="mt-2.5 text-[10.5px] font-bold text-muted">{label}</div>
      <div className="mt-0.5 text-[19px] font-extrabold text-ink">{value}</div>
      <div className="text-[9.5px] font-extrabold" style={{ color: dC ?? '#1F9D57' }}>{delta}</div>
    </div>
  );

  // ---- actions --------------------------------------------------------------
  // Open a customer → load their real order history (match by buyer id, else name).
  const openCustomer = (c: Customer) => {
    setSelCust(c);
    setCustOrders(null);
    if (!persistable || !real || !supabase) { setCustOrders([]); return; }
    void (async () => {
      let q = supabase!.from('business_orders')
        .select('id,code,customer_name,items,total,channel,status,created_at,fulfillment')
        .eq('business_id', real.id).order('created_at', { ascending: false }).limit(50);
      q = c.userId ? q.eq('user_id', c.userId) : q.ilike('customer_name', c.name);
      const { data } = await q;
      setCustOrders(Array.isArray(data) ? (data as OrderRow[]).map(rowToOrder) : []);
    })();
  };

  // Save notes / tag edits on the open customer (optimistic + persist).
  const saveCustomer = async (patch: { notes?: string; tag?: string }) => {
    if (!selCust) return;
    const apply = (x: Customer): Customer => ({ ...x, notes: patch.notes ?? x.notes, tag: patch.tag ? [patch.tag, patch.tag] : x.tag });
    setSelCust((c) => (c ? apply(c) : c));
    const id = selCust.dbId;
    setRealCustomers((list) => (list && id ? list.map((x) => (x.dbId === id ? apply(x) : x)) : list));
    if (persistable && id && supabase) await supabase.from('business_customers').update(patch).eq('id', id);
    flash(L('Cliente actualizado', 'Customer updated'));
  };

  // CSV export of the current customer directory (client-side).
  const exportCsv = () => {
    const head = es ? ['Nombre', 'Visitas', 'Gasto', 'Puntos', 'Etiqueta', 'Última orden'] : ['Name', 'Visits', 'Spend', 'Points', 'Tag', 'Last order'];
    const rows = [head, ...customers.map((c) => [c.name, String(c.visits), c.spent, String(c.points ?? 0), c.tag[0], c.last[0]])];
    const csv = rows.map((r) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `clientes-${real?.slug ?? 'tolatino'}.csv`; a.click();
    URL.revokeObjectURL(url);
    flash(L('CSV exportado', 'CSV exported'));
  };

  // Cancel / reject an order (real → 'cancelled'; the notify trigger tells the buyer).
  const cancelOrder = async (o: Order) => {
    setOrders((list) => list.map((x) => ((o.dbId ? x.dbId === o.dbId : x.id === o.id) ? { ...x, status: 'cancelled' as OStatus } : x)));
    setSelOrder(null);
    flash(L(`${o.id} cancelado`, `${o.id} cancelled`));
    if (persistable && o.dbId && supabase) {
      const { error } = await supabase.from('business_orders').update({ status: 'cancelled' }).eq('id', o.dbId);
      if (error) { flash(L('No se pudo cancelar', 'Could not cancel')); return; }
      setStatsV((v) => v + 1);
      // Refund a prepaid order (no-op for cash) so the owner's cancel never leaves
      // the buyer's money captured.
      const r = await refundPurchase('order', o.dbId);
      if (r.refunded) flash(L('Pedido cancelado y reembolsado', 'Order cancelled and refunded'));
    }
  };

  // Honest suggested reply — a rating-aware template (true AI is the Premium tease).
  const replyTemplate = (r: Review) => {
    const first = (es ? r.name[0] : r.name[1]).split(/\s+/)[0] || (es ? 'cliente' : 'there');
    return r.stars >= 4
      ? L(`¡Gracias por tu reseña, ${first}! Nos alegra que hayas tenido una buena experiencia. ¡Te esperamos pronto!`, `Thanks for your review, ${first}! So glad you had a great experience — hope to see you again soon!`)
      : L(`Gracias por tu comentario, ${first}. Lamentamos que la experiencia no fuera la mejor; nos encantaría remediarlo. Escríbenos y lo resolvemos.`, `Thanks for the feedback, ${first}. We're sorry it wasn't your best experience — we'd love to make it right. Reach out and we'll fix it.`);
  };

  // ---- CLIENTES -------------------------------------------------------------
  const nf = (n: number) => (Number(n) || 0).toLocaleString('en-US');
  const custKpis = custStats
    ? [
        { Icon: Users, c: '#6D4DF6', bg: '#EFEBFF', label: L('Total', 'Total'), value: nf(custStats.total), delta: '' },
        { Icon: UserPlus, c: '#D6336C', bg: '#FDE7EF', label: L('Nuevos 30d', 'New 30d'), value: nf(custStats.new_30d), delta: '' },
        { Icon: RefreshCw, c: '#1F8A4C', bg: '#E3F5EA', label: L('Recurrencia', 'Return rate'), value: `${custStats.total ? Math.round((custStats.returning_n / custStats.total) * 100) : 0}%`, delta: '' },
        { Icon: DollarSign, c: '#9A6A12', bg: '#FCEFD6', label: L('LTV prom.', 'Avg LTV'), value: money0(custStats.avg_ltv), delta: '' },
      ]
    : [
        { Icon: Users, c: '#6D4DF6', bg: '#EFEBFF', label: L('Total', 'Total'), value: '4,284', delta: '▲ 6%' },
        { Icon: UserPlus, c: '#D6336C', bg: '#FDE7EF', label: L('Nuevos 30d', 'New 30d'), value: '62', delta: '▲ 28%' },
        { Icon: RefreshCw, c: '#1F8A4C', bg: '#E3F5EA', label: L('Recurrencia', 'Return rate'), value: '72%', delta: '▲ 4pp' },
        { Icon: DollarSign, c: '#9A6A12', bg: '#FCEFD6', label: L('LTV prom.', 'Avg LTV'), value: '$184', delta: '▲ 9%' },
      ];

  const segTabs: [Seg, string][] = [
    ['all', L('Todos', 'All')],
    ['new', L('Nuevos', 'New')],
    ['regulars', L('Recurrentes', 'Regulars')],
    ['vip', 'VIP'],
    ['risk', L('En riesgo', 'At risk')],
  ];

  const custList = useMemo(() => {
    let l = customers;
    if (seg === 'new') l = l.filter((c) => c.isNew);
    else if (seg === 'regulars') l = l.filter((c) => c.visits >= 9 && !c.vip && !c.atRisk);
    else if (seg === 'vip') l = l.filter((c) => c.vip);
    else if (seg === 'risk') l = l.filter((c) => c.atRisk);
    const q = query.trim().toLowerCase();
    if (q) l = l.filter((c) => c.name.toLowerCase().includes(q));
    return l;
  }, [customers, seg, query]);

  const tagStyle = (c: Customer) =>
    c.atRisk ? 'bg-amber-bg text-amber-ink' : c.isNew ? 'bg-green-bg text-green-dark' : c.b2b ? 'bg-lilac text-primary-dark' : c.vip ? 'bg-amber-bg text-amber-ink' : 'bg-lilac-2 text-muted-2';

  const segTotal = custStats?.total || 0;
  const barW = (n: number) => (segTotal > 0 && n > 0 ? Math.max(4, Math.round((n / segTotal) * 100)) : 0);
  const segments: [string, string, string, string, number][] = custStats
    ? [
        [L('VIP · top 10%', 'VIP · top 10%'), nf(custStats.vip_n), `${money0(custStats.vip_ltv)}`, '#4F46E5', barW(custStats.vip_n)],
        [L('Recurrentes', 'Regulars'), nf(custStats.reg_n), `${money0(custStats.reg_ltv)}`, '#7C6BFF', barW(custStats.reg_n)],
        [L('Ocasionales', 'Occasional'), nf(custStats.occ_n), `${money0(custStats.occ_ltv)}`, '#A78BFA', barW(custStats.occ_n)],
        [L('Nuevos', 'New'), nf(custStats.new_seg_n), `${money0(custStats.new_ltv)}`, '#34D399', barW(custStats.new_seg_n)],
        [L('En riesgo', 'At risk'), nf(custStats.risk_n), `${money0(custStats.risk_ltv)}`, '#F4B740', barW(custStats.risk_n)],
      ]
    : [
        [L('VIP · top 10%', 'VIP · top 10%'), '428', '$840', '#4F46E5', 86],
        [L('Recurrentes', 'Regulars'), '1,284', '$184', '#7C6BFF', 64],
        [L('Ocasionales', 'Occasional'), '2,104', '$58', '#A78BFA', 42],
        [L('Nuevos', 'New'), '184', '$24', '#34D399', 12],
      ];

  const rewardDefs: [string, string][] = [
    [L('Regalo de cumpleaños', 'Birthday gift'), L('Postre gratis', 'Free dessert')],
    [L('10ª visita · $20 crédito', '10th visit · $20 credit'), L('Automático', 'Automatic')],
    [L('Refiere un amigo · $10', 'Refer a friend · $10'), L('Ambos ganan', 'Both earn')],
    [L('Cliente perdido · 20%', 'Lapsed comeback · 20% off'), L('Sin pedir 60d', 'No order 60d')],
  ];

  const Toggle = ({ on, onClick, big }: { on: boolean; onClick: () => void; big?: boolean }) => (
    <Switch on={on} onClick={onClick} big={big} />
  );

  const customersView = (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {custKpis.map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-2.5 focus-within:border-primary">
              <Search size={16} stroke={2.2} className="flex-none text-muted-2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={L('Buscar por nombre, teléfono…', 'Search by name, phone…')}
                className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-muted"
              />
            </div>
            <button onClick={exportCsv} className="flex flex-none items-center gap-1.5 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[12px] font-extrabold text-ink-soft" title={L('Exportar CSV', 'Export CSV')}>
              <Download size={15} stroke={2.2} className="text-muted-2" /><span className="hidden sm:inline">{L('Exportar', 'Export')}</span>
            </button>
          </div>

          <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
            {segTabs.map(([k, label]) => (
              <button key={k} onClick={() => setSeg(k)} className={chip(seg === k)}>{label}</button>
            ))}
          </div>

          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-1">
            {custList.length === 0 ? (
              <div className={`${cardCls} p-9 text-center md:col-span-2 xl:col-span-1`}>
                <div className="text-[13px] font-semibold text-muted">{L('Ningún cliente en este segmento.', 'No customers in this segment.')}</div>
              </div>
            ) : (
              custList.map((c) => (
                <button key={c.id} onClick={() => openCustomer(c)} className={`${cardCls} flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-shadow hover:shadow-card-lg`}>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: c.color }}>{c.initials}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-extrabold text-ink">{c.name}</span>
                      {c.vip && <span className="flex-none rounded bg-amber-bg px-1.5 py-px text-[8px] font-extrabold text-amber-ink">VIP</span>}
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold text-muted-2">
                      {c.visits} {L('visitas', 'visits')} · {L('última', 'last')} {L(c.last[0], c.last[1])}
                      {(c.points ?? 0) > 0 && <> · {nf(c.points ?? 0)} pts</>}
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="text-[13px] font-extrabold text-ink">{c.spent}</div>
                    <span className={`mt-1 inline-block rounded px-1.5 py-px text-[8.5px] font-extrabold ${tagStyle(c)}`}>{L(c.tag[0], c.tag[1])}</span>
                  </div>
                  <ChevronRight size={16} stroke={2.2} className="flex-none text-muted-faint" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-[74px]">
          {/* segments */}
          <div className={`${cardCls} p-4`}>
            <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Segmentos de clientes', 'Customer segments')}</div>
            <div className="flex flex-col gap-2.5">
              {segments.map(([name, n, ltv, barC, w]) => (
                <div key={name}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="font-bold text-ink">{name}</span>
                    <span className="font-semibold text-muted-2">{n} · {ltv} LTV</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-lilac-2">
                    <div className="h-full rounded-full" style={{ width: `${w}%`, background: barC }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* loyalty */}
          <div className={`${cardCls} p-4`}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-ink">{L('Lealtad y recompensas', 'Loyalty & rewards')}</span>
              <Toggle big on={loyaltyOn} onClick={() => { const nv = !loyaltyOn; setLoyaltyOn(nv); persistLoyalty({ enabled: nv }); flash(nv ? L('Programa de lealtad activo', 'Loyalty program on') : L('Programa de lealtad pausado', 'Loyalty program paused')); }} />
            </div>
            <div className="rounded-btn-lg bg-lilac-3 p-3" style={{ opacity: loyaltyOn ? 1 : 0.45 }}>
              <div className="text-[11.5px] font-extrabold text-ink">{L(`Gana ${loyaltyRate} punto${loyaltyRate === 1 ? '' : 's'} por cada $1`, `Earn ${loyaltyRate} point${loyaltyRate === 1 ? '' : 's'} per $1 spent`)}</div>
              <div className="mt-1 text-[10.5px] font-semibold leading-snug text-ink-3">
                {custStats
                  ? L(`100 pts = $10 de crédito · ${nf(custStats.enrolled)} inscritos`, `100 pts = $10 credit · ${nf(custStats.enrolled)} enrolled`)
                  : L('100 pts = $10 de crédito · 284 inscritos · $4,820 canjeados este mes.', '100 pts = $10 credit · 284 enrolled · $4,820 redeemed this month.')}
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2" style={{ opacity: loyaltyOn ? 1 : 0.45 }}>
              {rewardDefs.map(([label, sub], i) => (
                <div key={label} className="flex items-center gap-2.5 rounded-lg bg-app px-3 py-2.5">
                  <Gift size={14} stroke={2.2} className="flex-none text-primary-dark" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-extrabold text-ink">{label}</span>
                    <span className="block text-[9.5px] font-semibold text-muted-2">{sub}</span>
                  </span>
                  <Toggle on={!!rewards[i]} onClick={() => { const nr = { ...rewards, [i]: !rewards[i] }; setRewards(nr); persistLoyalty({ rewards: nr }); }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ---- PEDIDOS --------------------------------------------------------------
  const urgentN = orders.filter((o) => o.urgent && o.status === 'new').length;
  const orderKpis = orderStats
    ? [
        { Icon: ShoppingBag, c: '#D6336C', bg: '#FDE7EF', label: L('Pedidos hoy', 'Orders today'), value: nf(orderStats.today_count), delta: '', dC: '#1F9D57' },
        { Icon: Clock, c: '#9A6A12', bg: '#FCEFD6', label: L('En curso', 'In flight'), value: nf(orderStats.in_flight), delta: urgentN ? L(`${urgentN} urgente${urgentN === 1 ? '' : 's'}`, `${urgentN} urgent`) : '', dC: '#9A96AE' },
        { Icon: DollarSign, c: '#1F8A4C', bg: '#E3F5EA', label: L('Ingresos hoy', 'Revenue today'), value: money0(orderStats.today_revenue), delta: '', dC: '#1F9D57' },
        { Icon: Check, c: '#6D4DF6', bg: '#EFEBFF', label: L('Completados', 'Completed'), value: nf(orderStats.status?.completed ?? 0), delta: '', dC: '#1F9D57' },
      ]
    : [
        { Icon: ShoppingBag, c: '#D6336C', bg: '#FDE7EF', label: L('Pedidos hoy', 'Orders today'), value: '38', delta: '▲ 18%', dC: '#1F9D57' },
        { Icon: Clock, c: '#9A6A12', bg: '#FCEFD6', label: L('En curso', 'In flight'), value: String(inFlight), delta: L('1 urgente', '1 urgent'), dC: '#9A96AE' },
        { Icon: DollarSign, c: '#1F8A4C', bg: '#E3F5EA', label: L('Ingresos', 'Revenue'), value: '$1,847', delta: '▲ 12%', dC: '#1F9D57' },
        { Icon: Clock, c: '#6D4DF6', bg: '#EFEBFF', label: L('Prep prom.', 'Avg prep'), value: '18m', delta: '▼ 2m', dC: '#1F9D57' },
      ];

  const statusMeta: Record<OStatus, [string, string]> = {
    new: [L('Nuevos', 'New'), 'new'], preparing: [L('Preparando', 'Preparing'), 'preparing'], ready: [L('Listos', 'Ready'), 'ready'], completed: [L('Completados', 'Completed'), 'completed'], cancelled: [L('Cancelados', 'Cancelled'), 'cancelled'],
  };
  // Board filters mirror the CLIENT's steps: a delivery order out with a driver
  // moves from "Listos" to "En camino" — the same word the customer is seeing.
  const onTheWay = (o: Order) => o.channel === 'delivery' && o.status !== 'completed' && o.status !== 'cancelled' && (o.fulfillment?.dispatch === 'on_the_way' || o.fulfillment?.dispatch === 'picked_up');
  const viewMatch = (o: Order, k: OView) => (k === 'on_the_way' ? onTheWay(o) : o.status === k && !(k === 'ready' && onTheWay(o)));
  const viewMeta = (k: OView): string => (k === 'on_the_way' ? L('En camino', 'On the way') : statusMeta[k][0]);
  const viewDot = (k: OView): string => (k === 'on_the_way' ? '#2F6FED' : STATUS_DOT[k]);
  const statusKeys: OView[] = ['new', 'preparing', 'ready', 'on_the_way', 'completed', 'cancelled'];
  const chLabel = (ch: Channel) => ch === 'delivery' ? L('Entrega', 'Delivery') : ch === 'dinein' ? L('Mostrador', 'Dine-in') : L('Recoger', 'Pickup');

  const advance = async (o: Order) => {
    const nx = FLOW[o.status];
    if (!nx) return;
    // Optimistic local advance (match by DB uuid when present, else display code).
    setOrders((list) => list.map((x) => ((o.dbId ? x.dbId === o.dbId : x.id === o.id) ? { ...x, status: nx } : x)));
    setSelOrder((s) => (s && (o.dbId ? s.dbId === o.dbId : s.id === o.id) ? { ...s, status: nx } : s));
    flash(`${o.id} → ${statusMeta[nx][0]}`);
    // Persist only for a real, signed-in business; demo mutations stay local.
    if (persistable && o.dbId && supabase) {
      const { error } = await supabase.from('business_orders').update({ status: nx }).eq('id', o.dbId);
      if (error) flash(L('No se pudo actualizar el pedido', 'Could not update the order')); else setStatsV((v) => v + 1);
    }
  };

  // NEW (Cocina handoff) — additive order-action sheets: prep time on accept,
  // assign a real driver before "en camino", reject with a reason. None of
  // this changes the DB schema (fulfillment jsonb already supports it, 0049/
  // 0074) or the existing card/detail layout — same single action button,
  // smarter behind it.
  const [prepFor, setPrepFor] = useState<Order | null>(null);
  const [prepMin, setPrepMin] = useState(15);
  const [assignFor, setAssignFor] = useState<Order | null>(null);
  const [assignEta, setAssignEta] = useState(10); // driver arrival ETA the owner picks
  const [rejectFor, setRejectFor] = useState<Order | null>(null);
  const ownDrivers: OwnDriver[] = (real?.settings as Record<string, unknown> | null)?.drivers as OwnDriver[] | undefined ?? [];
  const EXTERNAL_DRIVERS: { name: string; rate: string }[] = [
    { name: 'Uber Direct', rate: '$8.50 · ~6 min' },
    { name: 'DoorDash Drive', rate: '$9.00 · ~9 min' },
  ];
  const REJECT_REASONS: [string, string][] = [
    [L('Artículo agotado', 'Item sold out'), 'sold_out'],
    [L('Cocina saturada', 'Kitchen overloaded'), 'overloaded'],
    [L('Cerramos por hoy', 'Closed for today'), 'closed'],
    [L('Fuera de zona de entrega', 'Out of delivery zone'), 'out_of_zone'],
  ];

  const writeFulfil = (o: Order, patch: Partial<Fulfil>) => {
    const merged: Fulfil = { ...o.fulfillment, ...patch };
    setOrders((list) => list.map((x) => ((o.dbId ? x.dbId === o.dbId : x.id === o.id) ? { ...x, fulfillment: merged } : x)));
    setSelOrder((s) => (s && (o.dbId ? s.dbId === o.dbId : s.id === o.id) ? { ...s, fulfillment: merged } : s));
    // NOTE: the supabase query builder is LAZY — it only executes on await/.then().
    // A bare `void builder` silently never fired, so driver/ETA/prep writes from
    // Cocina never reached the DB (or the client's tracker). Always .then() it.
    if (persistable && o.dbId && supabase) {
      supabase.from('business_orders').update({ fulfillment: merged }).eq('id', o.dbId)
        .then(({ error }) => { if (error) flash(L('No se pudo actualizar el pedido', 'Could not update the order')); });
    }
  };
  // Accept with a prep time (10/15/20/30 min) — advances new → preparing and
  // refreshes the CUSTOMER's ETA banner (eta_range) from the real prep time,
  // so what the client sees matches what the kitchen committed to.
  // STORE orders (fulfillment.kind='store') never promise kitchen minutes:
  // delivery keeps/sets the store's day-based window (shipping zone `time`,
  // e.g. "2–5 días"); pickup waits for the "Listo para recoger" push.
  const acceptOrder = (o: Order, prep: number) => {
    if (o.fulfillment?.kind === 'store') {
      const zones = (real?.settings as Record<string, Record<string, Record<string, unknown>>> | null)?.shipping?.delivery?.zones;
      const zt = Array.isArray(zones) ? (zones[0] as Record<string, unknown> | undefined)?.time : undefined;
      const dayEta = typeof zt === 'string' && zt.trim() ? zt.trim() : undefined;
      if (o.channel === 'delivery' && dayEta && !o.fulfillment?.eta_range) writeFulfil(o, { eta_range: dayEta });
      void advance(o);
      setPrepFor(null);
      flash(L('Pedido aceptado — empácalo cuando puedas', 'Order accepted — pack it when ready'));
      return;
    }
    writeFulfil(o, { prep, eta_range: o.channel === 'delivery' ? `${prep + 10}–${prep + 25} min` : `${prep} min` });
    void advance(o);
    setPrepFor(null);
    flash(L(`Pedido aceptado · ${prep} min`, `Order accepted · ${prep} min`));
  };
  // Assign a real driver (own roster or an external gig service) before a
  // delivery order goes out. The OWNER picks the arrival ETA (no invented
  // numbers) — it feeds the client's map badge + ETA banner; the driver's
  // vehicle rides along so the client sees it in tracking.
  const assignDriver = (o: Order, name: string, phone?: string, vehicle?: string) => {
    writeFulfil(o, {
      dispatch: 'on_the_way', driver: name,
      ...(phone ? { driver_phone: phone } : {}), ...(vehicle ? { driver_vehicle: vehicle } : {}),
      eta: `${assignEta} min`, eta_range: `${assignEta}–${assignEta + 5} min`,
    });
    setAssignFor(null);
    flash(L(`${name} asignado · llega en ~${assignEta} min`, `${name} assigned · ~${assignEta} min away`));
  };
  // Reject a new order with a reason (customer is notified, not charged) —
  // same DB effect as `cancelOrder`, distinct toast copy.
  const rejectOrder = async (o: Order, reasonEs: string) => {
    setOrders((list) => list.map((x) => ((o.dbId ? x.dbId === o.dbId : x.id === o.id) ? { ...x, status: 'cancelled' as OStatus } : x)));
    setSelOrder(null); setRejectFor(null); setPrepFor(null);
    flash(L(`Pedido rechazado · ${reasonEs}`, `Order rejected`));
    if (persistable && o.dbId && supabase) await supabase.from('business_orders').update({ status: 'cancelled' }).eq('id', o.dbId);
  };
  // The one action button on a card/detail — same position, label/behavior now
  // routes through the new sheets where a real decision is needed.
  const cardAction = (o: Order): { label: string; onClick: () => void } | null => {
    if (o.status === 'new') return { label: L('Aceptar', 'Accept'), onClick: () => { setPrepMin(15); setPrepFor(o); } };
    if (o.status === 'preparing') return { label: L('Marcar listo', 'Mark ready'), onClick: () => void advance(o) };
    if (o.status === 'ready') {
      if (o.channel === 'delivery') {
        const d = o.fulfillment?.dispatch;
        // delivered also stamps dispatch, so client + Despacho land on the same state
        if (d === 'on_the_way') return { label: L('Marcar entregado', 'Mark delivered'), onClick: () => { writeFulfil(o, { dispatch: 'delivered' }); void advance(o); } };
        // driver staged from Despacho (assigned/picked_up) → one tap sends it out
        if (d === 'assigned' || d === 'picked_up') return { label: L('Marcar en camino', 'Mark on the way'), onClick: () => { writeFulfil(o, { dispatch: 'on_the_way', ...(o.fulfillment?.eta ? {} : { eta: '10 min' }) }); flash(L('Pedido en camino', 'Order on the way')); } };
        return { label: L('Asignar repartidor', 'Assign driver'), onClick: () => { setAssignEta(10); setAssignFor(o); } };
      }
      // pickup mirrors the client's final step ("Recogido"); dine-in stays generic
      return { label: o.channel === 'pickup' ? L('Marcar recogido', 'Mark picked up') : L('Completar', 'Complete'), onClick: () => void advance(o) };
    }
    return null;
  };

  const orderList = orders.filter((o) => viewMatch(o, oStatus));
  const chToday = orderStats?.channel_today ?? {};
  const chTotal = Object.values(chToday).reduce((s, n) => s + Number(n || 0), 0);
  const chPct = (ch: Channel) => (chTotal > 0 ? `${Math.round((Number(chToday[ch] ?? 0) / chTotal) * 100)}%` : '0%');
  const channelMix: [string, Channel, string, string][] = orderStats
    ? [
        ['#6D4DF6', 'dinein', L('Mostrador', 'Dine-in'), chPct('dinein')],
        ['#D6336C', 'delivery', L('Entrega', 'Delivery'), chPct('delivery')],
        ['#9A6A12', 'pickup', L('Recoger', 'Pickup'), chPct('pickup')],
      ]
    : [
        ['#6D4DF6', 'dinein', L('Mostrador', 'Dine-in'), '42%'],
        ['#D6336C', 'delivery', L('Entrega', 'Delivery'), '34%'],
        ['#9A6A12', 'pickup', L('Recoger', 'Pickup'), '24%'],
      ];

  const ordersView = (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {orderKpis.map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
            {statusKeys.map((k) => {
              const on = oStatus === k;
              const n = orders.filter((o) => viewMatch(o, k)).length;
              return (
                <button key={k} onClick={() => setOStatus(k)} className={`flex flex-none cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: viewDot(k) }} />
                  {viewMeta(k)}
                  <span className={`font-extrabold ${on ? 'text-white/80' : 'text-muted-2'}`}>{n}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
            {orderList.length === 0 ? (
              <div className={`${cardCls} p-9 text-center md:col-span-2`}>
                <div className="text-[13px] font-semibold text-muted">{L('No hay pedidos en este estado.', 'No orders in this status.')}</div>
              </div>
            ) : (
              orderList.map((o) => {
                const done = o.status === 'completed';
                const cxl = o.status === 'cancelled';
                const ca = cardAction(o);
                return (
                  <div key={o.id} onClick={() => setSelOrder(o)} className={`cursor-pointer overflow-hidden rounded-card-sm border bg-white shadow-card transition-shadow hover:shadow-card-lg ${o.urgent && !done && !cxl ? 'border-[rgba(240,70,110,.35)]' : 'border-hair'}`}>
                    <div className="p-3.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="font-mono text-[11.5px] font-extrabold text-primary-dark">{o.id}</span>
                        <span className="text-[9.5px] font-semibold text-muted-2">{L(o.placed[0], o.placed[1])}</span>
                      </div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-[13px] font-extrabold text-ink">{L(o.who[0], o.who[1])}</span>
                        {o.urgent && !done && !cxl && <span className="flex items-center gap-0.5 rounded bg-pink-bg px-1.5 py-px text-[8px] font-extrabold text-pink-dark"><Zap size={9} stroke={2.6} />{L('Urgente', 'Urgent')}</span>}
                      </div>
                      <div className="line-clamp-2 text-[11px] font-semibold leading-snug text-ink-3">{L(o.items[0], o.items[1])}</div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className={`rounded px-2 py-0.5 text-[9px] font-extrabold ${CH_TILE[o.channel]}`}>{chLabel(o.channel)}</span>
                          {o.fulfillment?.payment === 'cash' && <span className="rounded bg-green-bg px-2 py-0.5 text-[9px] font-extrabold text-green-dark">{L('Efectivo', 'Cash')}</span>}
                        </span>
                        <span className="text-[14px] font-extrabold text-ink">{o.total}</span>
                      </div>
                      {o.fulfillment?.payment === 'cash' && !done && !cxl && (
                        <div className="mt-2 rounded-md bg-amber-bg px-2 py-1 text-[10px] font-extrabold text-amber-ink">{L(`Cobra ${o.total} en efectivo al ${o.channel === 'delivery' ? 'entregar' : 'recoger'}`, `Collect ${o.total} cash at ${o.channel === 'delivery' ? 'delivery' : 'pickup'}`)}</div>
                      )}
                      {/* NEW: driver line once assigned (was silently absent before) */}
                      {o.fulfillment?.driver && !done && !cxl && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-green-bg px-2 py-1 text-[10px] font-extrabold text-green-dark">
                          <Truck size={11} stroke={2.4} />{o.fulfillment.driver}{o.fulfillment.eta ? ` · ${o.fulfillment.eta}` : ''}
                        </div>
                      )}
                      {done ? (
                        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] font-extrabold text-green-dark">
                          <Check size={12} stroke={3} />{L('Pagado y cerrado', 'Paid & closed')}
                        </div>
                      ) : cxl ? (
                        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] font-extrabold text-muted-2">
                          <XCircle size={12} stroke={2.6} />{L('Cancelado', 'Cancelled')}
                        </div>
                      ) : ca ? (
                        <button onClick={(e) => { e.stopPropagation(); ca.onClick(); }} className="mt-3 flex w-full items-center justify-center gap-1 rounded-field bg-primary py-2.5 text-[11.5px] font-extrabold text-white shadow-cta-sm">
                          {ca.label}<ChevronRight size={14} stroke={2.6} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-[74px]">
          <div className={`${cardCls} p-4`}>
            <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Por canal · hoy', 'By channel · today')}</div>
            <div className="flex flex-col gap-2.5">
              {channelMix.map(([c, ch, label, pct]) => (
                <div key={ch} className="flex items-center gap-2 text-[12px] font-bold text-ink-soft">
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: c }} />
                  <span className="flex-1">{label}</span>
                  <span className="font-extrabold text-ink">{pct}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-btn-lg bg-lilac-2 p-3">
              <div className="text-[12px] font-extrabold text-primary-dark">{orderStats ? `${money0(orderStats.today_revenue)} · ${nf(orderStats.today_count)} ${L('pedidos hoy', 'orders today')}` : `⏱ ${L('Prep prom. 18 min', 'Avg prep 18 min')}`}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-ink-3">{orderStats ? (orderStats.in_flight > 0 ? L(`${nf(orderStats.in_flight)} en curso ahora`, `${nf(orderStats.in_flight)} in flight now`) : L('Todo al día.', 'All caught up.')) : L('2 min más rápido que la semana pasada.', '2 min faster than last week.')}</div>
            </div>
          </div>
          <div className={`${cardCls} p-4`}>
            <div className="mb-2 text-[13px] font-extrabold text-ink">{L('Cola en vivo', 'Live queue')}</div>
            <div className="grid grid-cols-2 gap-2.5">
              {statusKeys.map((k) => (
                <button key={k} onClick={() => setOStatus(k)} className={`rounded-btn-lg p-2.5 text-left ${oStatus === k ? 'bg-lilac-2' : 'bg-app'}`}>
                  <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wide text-muted">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: viewDot(k) }} />{viewMeta(k)}
                  </div>
                  <div className="mt-1 text-[17px] font-extrabold text-ink">{orders.filter((o) => viewMatch(o, k)).length}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ---- RESEÑAS --------------------------------------------------------------
  // Real rating summary from the loaded reviews (per-star breakdown, avg, replied%).
  const rvCount = reviews.length;
  const rvAvg = rvCount ? reviews.reduce((s, r) => s + r.stars, 0) / rvCount : 0;
  const repliedN = reviews.filter((r) => posted[r.id]).length;
  const repliedPct = rvCount ? Math.round((repliedN / rvCount) * 100) : 0;
  const barColor = (star: number) => (star >= 4 ? '#1F9D57' : star === 3 ? '#F4B740' : '#D6336C');
  const ratingBars: [number, number, string][] = [5, 4, 3, 2, 1].map((star) => {
    const n = reviews.filter((r) => r.stars === star).length;
    return [star, rvCount ? Math.round((n / rvCount) * 100) : 0, barColor(star)] as [number, number, string];
  });
  const rvFilters: [RvFilter, string, number | null][] = [
    ['all', L('Todas', 'All'), null],
    ['need', L('Sin responder', 'Need reply'), needReply],
    ['top', '5★', null],
    ['low', '≤3★', null],
    ['flagged', L('Reportadas', 'Flagged'), null],
  ];
  const reviewList = reviews.filter((r) => {
    if (rvFilter === 'need') return !posted[r.id] && !flagged[r.id];
    if (rvFilter === 'top') return r.stars === 5;
    if (rvFilter === 'low') return r.stars <= 3;
    if (rvFilter === 'flagged') return flagged[r.id];
    return true;
  });

  const aiDraft = (r: Review) => {
    // Real reviews have no canned r.ai text → use a rating-aware template. Demo
    // fixtures carry a bespoke r.ai sample, so prefer it when present.
    const draft = (r.ai[0] || r.ai[1]) ? L(r.ai[0], r.ai[1]) : replyTemplate(r);
    setReplyText((t) => ({ ...t, [r.id]: draft }));
    flash(L('Borrador listo — revísalo', 'Draft ready — review it'));
  };
  const startEdit = (r: Review) => {
    setReplyText((t) => ({ ...t, [r.id]: posted[r.id]?.[0] ?? '' }));
    setEditingId(r.id);
  };
  const sendReply = async (r: Review) => {
    const text = (replyText[r.id] ?? '').trim();
    const had = !!posted[r.id];
    if (!text && !had) return flash(L('Escribe una respuesta primero', 'Write a reply first'));
    // Optimistic: reflect the reply (or its removal) immediately.
    setPosted((p) => {
      const next = { ...p };
      if (text) next[r.id] = [text, text];
      else delete next[r.id];
      return next;
    });
    setEditingId((id) => (id === r.id ? null : id));
    setReplyText((t) => ({ ...t, [r.id]: '' }));
    // Persist only for a real, signed-in business; demo stays local. An empty
    // reply clears the stored reply (the RPC nulls it out).
    if (persistable && r.dbId && supabase) {
      const { error } = await supabase.rpc('reply_to_review', { p_review_id: r.dbId, p_reply: text });
      if (error) return flash(L('No se pudo guardar la respuesta', 'Could not save the reply'));
    }
    flash(text ? L('Respuesta publicada', 'Reply posted') : L('Respuesta eliminada', 'Reply removed'));
  };
  const toggleFlag = (r: Review) => {
    const on = !flagged[r.id];
    setFlagged((f) => ({ ...f, [r.id]: on }));
    flash(on ? L('Reseña reportada', 'Review flagged') : L('Reporte quitado', 'Review unflagged'));
  };

  const Stars = ({ n }: { n: number }) => (
    <span className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={12} stroke={0} className={i < n ? 'fill-amber text-amber' : 'fill-lilac-line text-lilac-line'} />
      ))}
    </span>
  );

  const reviewsView = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        {/* rating summary (mobile: on top) */}
        <div className={`${cardCls} flex items-center gap-5 p-5 xl:hidden`}>
          <div className="flex-none text-center">
            <div className="text-[38px] font-extrabold leading-none text-ink">{rvCount ? rvAvg.toFixed(1) : '—'}</div>
            <div className="mt-1 flex justify-center"><Stars n={Math.round(rvAvg)} /></div>
            <div className="mt-1 text-[9.5px] font-semibold text-muted-2">{nf(rvCount)} {L('reseñas', 'reviews')}</div>
          </div>
          <div className="min-w-0 flex-1">
            {ratingBars.map(([star, pct, c]) => (
              <div key={star} className="mb-1 flex items-center gap-2">
                <span className="w-4 text-[9.5px] font-bold text-ink-soft">{star}★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-lilac-2">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                </div>
                <span className="w-7 text-right text-[9px] font-bold text-muted-2">{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
          {rvFilters.map(([k, label, n]) => (
            <button key={k} onClick={() => setRvFilter(k)} className={chip(rvFilter === k)}>
              {label}
              {n != null && n > 0 && <span className={`ml-1.5 font-extrabold ${rvFilter === k ? 'text-white/80' : 'text-pink-dark'}`}>{n}</span>}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {reviewList.length === 0 ? (
            <div className={`${cardCls} p-9 text-center`}>
              <div className="text-[13px] font-semibold text-muted">{L('No hay reseñas con este filtro.', 'No reviews for this filter.')}</div>
            </div>
          ) : (
            reviewList.map((r) => {
              const reply = posted[r.id];
              const isFlagged = flagged[r.id];
              const editing = editingId === r.id;
              const draft = replyText[r.id] ?? '';
              return (
                <div key={r.id} className={`rounded-card-sm border bg-white p-4 shadow-card ${isFlagged ? 'border-[rgba(240,70,110,.3)]' : 'border-hair'}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: r.color }}>{r.initials}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12.5px] font-extrabold text-ink">{L(r.name[0], r.name[1])}</span>
                        <span className={`rounded px-1.5 py-px text-[8px] font-extrabold ${CH_REVIEW[r.ch]}`}>{r.ch}</span>
                        {isFlagged && <span className="rounded bg-pink-bg px-1.5 py-px text-[8px] font-extrabold text-pink-dark">{L('Reportada', 'Flagged')}</span>}
                      </div>
                      <div className="mt-1"><Stars n={r.stars} /></div>
                    </div>
                    <span className="flex-none text-[9px] font-semibold text-muted-faint">{r.date}</span>
                  </div>

                  <div className="mt-2.5 text-[12px] font-medium leading-relaxed text-ink-body">{L(r.text[0], r.text[1])}</div>

                  {reply && !editing ? (
                    <div className="mt-3 rounded-r-lg border-l-[3px] border-ink bg-app px-3 py-2.5">
                      <div className="mb-1 flex items-center gap-1.5 text-[9.5px] font-extrabold text-ink">
                        <span className="flex h-4 w-4 items-center justify-center rounded bg-primary text-[7px] font-extrabold text-white">{ci.initials}</span>
                        {ci.name.split(' ')[0]} · {L('respuesta del dueño', 'owner reply')}
                        <button onClick={() => startEdit(r)} className="ml-auto flex-none cursor-pointer text-[9px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
                      </div>
                      <div className="text-[11px] font-medium leading-snug text-ink-3">{reply[0]}</div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-btn-lg border border-dashed border-lilac-ring p-3">
                      <div className="mb-2 flex items-center gap-1.5 text-[9.5px] font-extrabold text-primary-dark">
                        <Sparkles size={12} stroke={2.2} />{L('Respuesta sugerida', 'Suggested reply')}
                      </div>
                      <textarea
                        value={draft}
                        onChange={(e) => setReplyText((t) => ({ ...t, [r.id]: e.target.value }))}
                        rows={draft ? 3 : 2}
                        placeholder={L('Escribe una respuesta o genera un borrador con IA…', 'Write a reply or draft one with AI…')}
                        className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[11.5px] font-medium leading-snug text-ink outline-none placeholder:text-muted focus:border-primary"
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                        <button onClick={() => toggleFlag(r)} className="flex cursor-pointer items-center gap-1 rounded-field px-2.5 py-2 text-[10px] font-extrabold text-pink-dark">
                          <Flag size={11} stroke={2.4} />{isFlagged ? L('Quitar reporte', 'Unflag') : L('Reportar', 'Flag')}
                        </button>
                        <button onClick={() => aiDraft(r)} className="flex cursor-pointer items-center gap-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[10.5px] font-extrabold text-primary-dark">
                          <Sparkles size={11} stroke={2.4} />{L('Sugerir', 'Suggest')}
                        </button>
                        <button onClick={() => sendReply(r)} className="cursor-pointer rounded-field bg-primary px-3.5 py-2 text-[10.5px] font-extrabold text-white shadow-cta-sm">
                          {L('Responder', 'Send reply')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center gap-3 text-[10px] font-semibold text-muted-2">
                    <span className="flex items-center gap-1"><Heart size={12} stroke={2.2} className="text-pink" /> {r.helpful} {L('útil', 'helpful')}</span>
                    {!reply && !isFlagged && (
                      <button onClick={() => toggleFlag(r)} className="flex cursor-pointer items-center gap-1 text-pink-dark xl:hidden"><Flag size={11} stroke={2.2} />{L('Reportar', 'Flag')}</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* desktop rail */}
      <div className="hidden flex-col gap-4 xl:sticky xl:top-[74px] xl:flex">
        <div className={`${cardCls} p-5`}>
          <div className="text-center">
            <div className="text-[40px] font-extrabold leading-none text-ink">{rvCount ? rvAvg.toFixed(1) : '—'}</div>
            <div className="mt-1 flex justify-center"><Stars n={Math.round(rvAvg)} /></div>
            <div className="mt-1 text-[10px] font-semibold text-muted-2">{nf(rvCount)} {L('reseñas', 'reviews')}</div>
          </div>
          <div className="mt-4">
            {ratingBars.map(([star, pct, c]) => (
              <div key={star} className="mb-1.5 flex items-center gap-2">
                <span className="w-4 text-[9.5px] font-bold text-ink-soft">{star}★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-lilac-2">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                </div>
                <span className="w-7 text-right text-[9px] font-bold text-muted-2">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`${cardCls} p-4`}>
          <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Reputación', 'Reputation')}</div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              [L('Reseñas', 'Reviews'), nf(rvCount), ''],
              [L('Promedio', 'Average'), rvCount ? rvAvg.toFixed(1) : '—', ''],
              [L('Respondidas', 'Replied'), `${repliedPct}%`, ''],
              [L('Sin responder', 'Need reply'), String(needReply), ''],
            ].map(([l, v, d]) => (
              <div key={l} className="rounded-btn-lg bg-app p-3">
                <div className="text-[10px] font-bold text-muted">{l}</div>
                <div className="mt-0.5 text-[17px] font-extrabold text-ink">{v}</div>
                {d && <div className="text-[9.5px] font-extrabold text-green">{d}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ---- shell ----------------------------------------------------------------
  return (
    <div className="relative flex flex-col gap-4 pb-8">
      {/* mode toggle */}
      <div className="flex gap-2">
        {modes.map(([m, label, n]) => {
          const on = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-btn px-3 py-2.5 text-[12.5px] font-extrabold transition-colors ${on ? 'bg-ink text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-2'}`}
            >
              {label}
              {n > 0 && <span className={`rounded-full px-1.5 py-px text-[9px] font-extrabold text-white ${on ? 'bg-primary' : 'bg-pink-dark'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      {isFree && (
        <div className="flex flex-wrap items-center gap-3 rounded-card-sm bg-amber-bg p-4">
          <span className="text-[20px]">⚠️</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold text-ink">{L('Pedidos y reseñas necesitan verificación.', 'Orders & reviews need verification.')}</span>
            <span className="block text-[11.5px] font-semibold text-amber-ink">{L('Verifica tu negocio para desbloquear pedidos, respuestas y lealtad.', 'Verify your business to unlock orders, replies and loyalty.')}</span>
          </span>
          <button onClick={() => ctx.go('billing')} className="flex-none cursor-pointer rounded-btn bg-ink px-3.5 py-2 text-[12px] font-extrabold text-white">{L('Verificar', 'Verify')}</button>
        </div>
      )}

      {mode === 'customers' && customersView}
      {mode === 'orders' && ordersView}
      {mode === 'reviews' && reviewsView}

      {!isPremium && mode === 'reviews' && (
        <div className="flex flex-wrap items-center gap-3 rounded-card-sm p-4 text-white shadow-band" style={{ background: 'linear-gradient(140deg,#1E1B2E,#3A2E6E)' }}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-[rgba(244,183,64,.2)]"><Sparkles size={18} className="text-amber" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-extrabold">{L('Respuestas con IA en un toque', 'One-tap AI replies')}</span>
            <span className="block text-[11.5px] font-semibold leading-snug text-[rgba(255,255,255,.7)]">{L('Premium redacta respuestas según el tono de tu marca. $49/mes.', 'Premium drafts replies in your brand voice. $49/mo.')}</span>
          </span>
          <button onClick={() => ctx.go('billing')} className="flex-none cursor-pointer rounded-btn bg-amber px-4 py-2.5 text-[12px] font-extrabold text-ink">{L('Mejorar', 'Upgrade')}</button>
        </div>
      )}

      {/* customer detail: stats · tag · notes · real order history */}
      {selCust && (
        <Overlay open onClose={() => { setSelCust(null); setCustOrders(null); }} align="right" width={460}>
          <OverlayTitle title={selCust.name} onClose={() => { setSelCust(null); setCustOrders(null); }} />
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-[15px] font-extrabold text-white" style={{ background: selCust.color }}>{selCust.initials}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5"><span className="truncate text-[14px] font-extrabold text-ink">{selCust.name}</span>{selCust.vip && <span className="rounded bg-amber-bg px-1.5 py-px text-[8px] font-extrabold text-amber-ink">VIP</span>}</div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] font-semibold text-muted-2">
                {selCust.phone && <span className="flex items-center gap-1"><Phone size={11} stroke={2.2} />{selCust.phone}</span>}
                {selCust.email && <span className="flex items-center gap-1"><Mail size={11} stroke={2.2} />{selCust.email}</span>}
                {!selCust.phone && !selCust.email && <span>{L('última', 'last')} {L(selCust.last[0], selCust.last[1])}</span>}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {([[L('Órdenes', 'Orders'), nf(selCust.visits)], [L('Gasto', 'Spend'), selCust.spent], [L('Puntos', 'Points'), nf(selCust.points ?? 0)]] as [string, string][]).map(([l, v]) => (
              <div key={l} className="rounded-btn-lg bg-app p-3 text-center"><div className="text-[9.5px] font-bold text-muted">{l}</div><div className="mt-0.5 text-[16px] font-extrabold text-ink">{v}</div></div>
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Etiqueta', 'Tag')}</div>
            <div className="flex flex-wrap gap-2">
              {['VIP', 'Recurrente', 'Nuevo', 'En riesgo', 'B2B'].map((t) => (
                <button key={t} onClick={() => saveCustomer({ tag: t })} className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-extrabold ${selCust.tag[0] === t ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-soft'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Notas', 'Notes')}</div>
            <textarea defaultValue={selCust.notes ?? ''} onBlur={(e) => { if ((e.target.value ?? '') !== (selCust.notes ?? '')) saveCustomer({ notes: e.target.value }); }} rows={2} placeholder={L('Preferencias, alergias, contexto…', 'Preferences, allergies, context…')} className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[12px] font-medium text-ink outline-none placeholder:text-muted focus:border-primary" />
          </div>
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-extrabold text-ink-soft">{L('Historial de órdenes', 'Order history')}</div>
            {custOrders == null ? (
              <div className="py-4 text-center text-[12px] font-semibold text-muted">{L('Cargando…', 'Loading…')}</div>
            ) : custOrders.length === 0 ? (
              <div className="rounded-btn-lg bg-app py-5 text-center text-[12px] font-semibold text-muted">{L('Sin órdenes todavía.', 'No orders yet.')}</div>
            ) : (
              <div className="flex flex-col gap-2">
                {custOrders.map((o) => (
                  <div key={o.dbId ?? o.id} className="flex items-center gap-2.5 rounded-btn-lg bg-app px-3 py-2.5">
                    <span className="h-2 w-2 flex-none rounded-full" style={{ background: STATUS_DOT[o.status] }} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[11.5px] font-bold text-ink">{L(o.items[0], o.items[1])}</span><span className="text-[9.5px] font-semibold text-muted-2">{o.id} · {L(o.placed[0], o.placed[1])}</span></span>
                    <span className="flex-none text-[12px] font-extrabold text-ink">{o.total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Overlay>
      )}

      {/* order detail: items + prices · status · accept / advance / cancel */}
      {selOrder && (
        <Overlay open onClose={() => setSelOrder(null)} width={440}>
          <OverlayTitle title={selOrder.id} onClose={() => setSelOrder(null)} />
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-extrabold text-ink">{L(selOrder.who[0], selOrder.who[1])}</span>
            <span className={`rounded px-2 py-0.5 text-[9.5px] font-extrabold ${CH_TILE[selOrder.channel]}`}>{chLabel(selOrder.channel)}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10.5px] font-semibold text-muted-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT[selOrder.status] }} />{statusMeta[selOrder.status][0]} · {L(selOrder.placed[0], selOrder.placed[1])}
          </div>
          {/* the exact stage the CUSTOMER's tracker is showing right now — same
              mapping (orderStageLabel), so both sides speak the same language */}
          {selOrder.channel !== 'dinein' && (
            <div className="mt-2 flex items-center gap-2 rounded-field bg-lilac-3 px-3 py-2">
              <Eye size={13} stroke={2.4} className="flex-none text-primary-dark" />
              <span className="text-[11px] font-bold text-ink-soft">{L('Tu cliente ve:', 'Your customer sees:')}</span>
              <span className="text-[11px] font-extrabold text-primary-dark">{L(...orderStageLabel(selOrder))}</span>
              {selOrder.fulfillment?.eta_range && selOrder.status !== 'completed' && selOrder.status !== 'cancelled' && (
                <span className="ml-auto text-[10.5px] font-bold text-muted-2">ETA {selOrder.fulfillment.eta_range}</span>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-col gap-1.5">
            {(selOrder.lines && selOrder.lines.length > 0) ? selOrder.lines.map((it, i) => (
              <div key={i} className="flex items-center gap-2 text-[12.5px]">
                <span className="flex-none font-extrabold text-primary-dark">{Number(it.qty ?? 1)}×</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{it.name ?? '—'}</span>
                {it.price != null && <span className="flex-none font-bold text-ink-soft">{money2(Number(it.price) * Number(it.qty ?? 1))}</span>}
              </div>
            )) : <div className="text-[12px] font-semibold text-muted">{L(selOrder.items[0], selOrder.items[1])}</div>}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-hair pt-3">
            <span className="text-[12px] font-bold text-muted">{L('Total', 'Total')}</span>
            <span className="text-[18px] font-extrabold text-ink">{selOrder.total}</span>
          </div>
          {/* NEW: assigned-driver card (Cocina) */}
          {selOrder.fulfillment?.driver && (
            <div className="mt-3 flex items-center gap-2.5 rounded-btn-lg bg-green-bg p-3">
              <Truck size={16} stroke={2.2} className="flex-none text-green-dark" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-extrabold text-ink">{selOrder.fulfillment.driver}</div>
                {selOrder.fulfillment.eta && <div className="text-[10.5px] font-semibold text-muted-2">{selOrder.fulfillment.eta}</div>}
              </div>
            </div>
          )}
          {/* NEW: Pago y liquidación (Cocina) — 15% To'Latino commission + net payout */}
          {(() => {
            const sub = selOrder.fulfillment?.subtotal ?? selOrder.totalN ?? 0;
            const tip = selOrder.fulfillment?.tip ?? 0;
            const commission = Math.round(sub * 0.15 * 100) / 100;
            const payout = Math.round((sub - commission) * 100) / 100;
            return (
              <div className="mt-3 rounded-btn-lg bg-app p-3">
                <div className="mb-2 text-[10.5px] font-extrabold uppercase tracking-wide text-muted">{L('Pago y liquidación', 'Payment & payout')}</div>
                <div className="flex items-center justify-between text-[11.5px] font-bold text-ink-soft"><span>{L('Subtotal', 'Subtotal')}</span><span>{money2(sub)}</span></div>
                {tip > 0 && <div className="mt-1 flex items-center justify-between text-[11.5px] font-bold text-ink-soft"><span>{L('Propina (100% repartidor)', 'Tip (100% to driver)')}</span><span>{money2(tip)}</span></div>}
                <div className="mt-1 flex items-center justify-between text-[11.5px] font-bold text-pink-dark"><span>{L("Comisión To'Latino (15%)", "To'Latino commission (15%)")}</span><span>-{money2(commission)}</span></div>
                <div className="mt-2 flex items-center justify-between border-t border-hair pt-2">
                  <span className="text-[12.5px] font-extrabold text-ink">{L('Tu pago neto', 'Your net payout')}</span>
                  <span className="text-[15px] font-extrabold text-green-dark">{money2(payout)}</span>
                </div>
              </div>
            );
          })()}
          {selOrder.status !== 'completed' && selOrder.status !== 'cancelled' && (
            <div className="mt-4 flex gap-2.5">
              <button onClick={() => (selOrder.status === 'new' ? setRejectFor(selOrder) : cancelOrder(selOrder))} className="flex flex-none items-center gap-1 rounded-field border-[1.5px] border-lilac-line px-4 py-3 text-[12px] font-extrabold text-pink-dark"><XCircle size={14} stroke={2.4} />{L('Cancelar', 'Cancel')}</button>
              {(() => { const ca = cardAction(selOrder); return ca && (
                <button onClick={ca.onClick} className="flex flex-1 items-center justify-center gap-1 rounded-field bg-primary py-3 text-[12.5px] font-extrabold text-white shadow-cta-sm">{ca.label}<ChevronRight size={15} stroke={2.6} /></button>
              ); })()}
            </div>
          )}
          {selOrder.status === 'completed' && (
            <div className="mt-4 flex items-center justify-center gap-1.5 rounded-field bg-green-bg py-3 text-[12px] font-extrabold text-green-dark"><Check size={14} stroke={3} />{L('Pagado y cerrado', 'Paid & closed')}</div>
          )}
          {selOrder.status === 'cancelled' && (
            <div className="mt-4 flex items-center justify-center gap-1.5 rounded-field bg-app py-3 text-[12px] font-extrabold text-muted-2"><XCircle size={14} stroke={2.6} />{L('Pedido cancelado', 'Order cancelled')}</div>
          )}
        </Overlay>
      )}

      {/* NEW (Cocina handoff): prep-time sheet — accept with a prep time, or
          reject straight from here (doubles as the incoming-order step). */}
      {prepFor && (
        <Overlay open onClose={() => setPrepFor(null)} width={380}>
          <OverlayTitle title={L('Aceptar pedido', 'Accept order')} onClose={() => setPrepFor(null)} />
          <div className="text-[13px] font-extrabold text-ink">{prepFor.id} · {L(prepFor.who[0], prepFor.who[1])}</div>
          <div className="mt-0.5 text-[11px] font-semibold text-muted-2">{L(prepFor.items[0], prepFor.items[1])}</div>
          {prepFor.fulfillment?.kind === 'store' ? (
            <div className="mt-4 rounded-field bg-lilac-2 px-3.5 py-3 text-[12px] font-semibold leading-snug text-ink-2">
              {L('Pedido de tienda: el cliente verá "Empacando tu pedido" al aceptar — sin tiempos de cocina. Márcalo Listo cuando esté empacado.', 'Store order: the customer sees "Packing your order" once you accept — no kitchen timers. Mark it Ready when packed.')}
            </div>
          ) : (
            <>
              <div className="mt-4 text-[10.5px] font-extrabold uppercase tracking-wide text-muted">{L('Tiempo de preparación', 'Prep time')}</div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[10, 15, 20, 30].map((m) => (
                  <button key={m} onClick={() => setPrepMin(m)} className={`rounded-field py-2.5 text-[12.5px] font-extrabold ${prepMin === m ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>{m} min</button>
                ))}
              </div>
            </>
          )}
          <div className="mt-4 flex gap-2.5">
            <button onClick={() => { setRejectFor(prepFor); setPrepFor(null); }} className="flex flex-none items-center gap-1 rounded-field border-[1.5px] border-lilac-line px-4 py-3 text-[12px] font-extrabold text-pink-dark"><XCircle size={14} stroke={2.4} />{L('Rechazar', 'Reject')}</button>
            <button onClick={() => acceptOrder(prepFor, prepMin)} className="flex flex-1 items-center justify-center gap-1 rounded-field bg-primary py-3 text-[12.5px] font-extrabold text-white shadow-cta-sm"><Check size={15} stroke={2.8} />{prepFor.fulfillment?.kind === 'store' ? L('Aceptar pedido', 'Accept order') : L(`Aceptar · ${prepMin} min`, `Accept · ${prepMin} min`)}</button>
          </div>
        </Overlay>
      )}

      {/* NEW (Cocina handoff): assign a real driver before "en camino" — the owner
          picks the arrival ETA the client will see (no invented numbers) */}
      {assignFor && (
        <Overlay open onClose={() => setAssignFor(null)} width={400}>
          <OverlayTitle title={L('Asignar repartidor', 'Assign driver')} onClose={() => setAssignFor(null)} />
          <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted">{L('Llega al cliente en aprox.', 'Arrives at the customer in approx.')}</div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {[5, 10, 15, 20, 30].map((m) => (
              <button key={m} onClick={() => setAssignEta(m)} className={`cursor-pointer rounded-field py-2.5 text-[12px] font-extrabold ${assignEta === m ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>{m} min</button>
            ))}
          </div>
          <div className="mt-4 text-[10.5px] font-extrabold uppercase tracking-wide text-muted">{L('Tus repartidores', 'Your drivers')}</div>
          {ownDrivers.length === 0 && (
            <div className="mt-1.5 text-[11.5px] font-semibold text-muted-2">{L('Aún no tienes repartidores. Agrégalos en Entregas.', 'No drivers yet. Add them in Delivery.')}</div>
          )}
          <div className="mt-2 flex flex-col gap-2">
            {ownDrivers.map((d, i) => (
              <button key={i} onClick={() => assignDriver(assignFor, d.name, d.phone, d.vehicle)} className="flex items-center gap-2.5 rounded-field border-[1.5px] border-lilac-line px-3 py-2.5 text-left">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: d.color }}>{d.initials}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-extrabold text-ink">{d.name}</span>
                  <span className="block truncate text-[10.5px] font-semibold text-muted-2">{L(d.sEs, d.sEn)}{d.vehicle ? ` · ${d.vehicle}` : ''}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 text-[10.5px] font-extrabold uppercase tracking-wide text-muted">{L('Apps externas (respaldo)', 'External apps (backup)')}</div>
          <div className="mt-2 flex flex-col gap-2">
            {EXTERNAL_DRIVERS.map((e) => (
              <button key={e.name} onClick={() => assignDriver(assignFor, `${e.name} (externo)`)} className="flex items-center justify-between rounded-field border-[1.5px] border-lilac-line px-3 py-2.5 text-left">
                <span className="text-[12.5px] font-extrabold text-ink">{e.name}</span>
                <span className="text-[10.5px] font-extrabold text-primary-dark">{e.rate}</span>
              </button>
            ))}
          </div>
        </Overlay>
      )}

      {/* NEW (Cocina handoff): reject with a reason — customer is notified, not charged */}
      {rejectFor && (
        <Overlay open onClose={() => setRejectFor(null)} width={380}>
          <OverlayTitle title={L('Rechazar pedido', 'Reject order')} onClose={() => setRejectFor(null)} />
          <div className="text-[11.5px] font-semibold text-muted">{L('Elige el motivo. Se le avisará al cliente y no se le cobrará.', "Pick a reason. The customer is notified and won't be charged.")}</div>
          <div className="mt-3 flex flex-col gap-2">
            {REJECT_REASONS.map(([label]) => (
              <button key={label} onClick={() => rejectOrder(rejectFor, label)} className="flex items-center gap-2.5 rounded-field border-[1.5px] border-lilac-line px-3.5 py-3 text-left text-[12.5px] font-bold text-ink">
                <XCircle size={14} stroke={2.4} className="flex-none text-pink-dark" />{label}
              </button>
            ))}
          </div>
        </Overlay>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-4 py-3 text-[12.5px] font-bold text-white shadow-modal">
          <Check size={14} stroke={2.6} className="text-[#7BE0A8]" />
          {toast}
        </div>
      )}
    </div>
  );
}
