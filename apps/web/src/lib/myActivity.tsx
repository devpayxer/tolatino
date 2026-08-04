'use client';

// The customer side of the two-sided transaction loop. Loads the signed-in
// user's orders / bookings / rentals / event tickets / RSVPs and exposes the
// creators the business listings + events call (place order, book, rent, buy
// tickets, RSVP "Voy"). Every create inserts with user_id = the customer, so the
// SAME row also lands in the business dashboard (RLS opens both sides —
// migration 0032). Optimistic local state so Mi cuenta reflects instantly.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { buyEventTickets, buyEventTicketsMulti } from '@/lib/live';
import { refundPurchase } from '@/lib/stripe';
import { useAuth } from '@/lib/auth';

type BizRef = { name: string; slug: string } | null;
type EvRef = { slug: string; title_es: string; title_en: string; starts_at: string; venue_es: string | null; venue_en: string | null; time_label_es: string | null; time_label_en: string | null } | null;

export type OrderItem = { name: string; qty: number; price?: number; opts?: string; img?: string };
/** Receipt + delivery state stored by the paid checkout (fulfillment jsonb). */
export type OrderFulfil = {
  address?: string; address_label?: string; instructions?: string;
  dispatch?: 'unassigned' | 'assigned' | 'picked_up' | 'on_the_way' | 'delivered';
  driver?: string; driver_phone?: string; driver_vehicle?: string; eta?: string; eta_range?: string;
  promo?: string; discount?: number; payment?: string;
  subtotal?: number; delivery_fee?: number; tip?: number; service_fee?: number; paid_total?: number;
  collect_total?: number; // cash orders: amount the seller collects on delivery/pickup
  kind?: string; // 'store' = Tienda order (all lines are products) → Amazon-style copy
};
export type MyOrder = { id: string; business_id: string; code: string | null; items: OrderItem[]; total: number | null; channel: string | null; status: string; created_at: string; fulfillment: OrderFulfil | null; businesses: BizRef };
export type MyBooking = {
  id: string; business_id: string; service_name: string | null; service_id: string | null; party_size: number | null;
  starts_at: string; status: string; deposit: number | null; created_at: string;
  // Booking-pro fields (migration 0092) — appointment shape à la Booksy.
  duration_min: number | null; staff_id: string | null; staff_name: string | null;
  addons: { n: string; p: number }[] | null; variant: string | null; total: number | null; notes: string | null;
  businesses: BizRef;
};
/** Optional appointment detail passed by the booking sheet (migration 0092). */
export type BookingExtra = {
  duration_min?: number; staff_id?: string; staff_name?: string;
  addons?: { n: string; p: number }[]; variant?: string; total?: number; notes?: string;
};
// A rental ORDER (0097): a header with N line items, one date range, one status.
export type MyRental = { id: string; business_id: string; item_name: string; item_count: number; start_at: string; end_at: string | null; total: number | null; deposit: number | null; status: string; paid: boolean; depositStatus: string; depositCaptured: number; created_at: string; businesses: BizRef };
export type MyTicket = { id: string; event_id: string; qty: number; admitted: number; total: number | null; unit_price: number | null; code: string; status: string; used_at: string | null; created_at: string; events: EvRef; event_tiers: { name_es: string; name_en: string } | null };
export type MyWaitlist = { event_id: string; tier_id: string | null; status: string };
export type MyGoing = { event_id: string; created_at: string; events: EvRef };

type Ctx = {
  loading: boolean;
  orders: MyOrder[];
  bookings: MyBooking[];
  rentals: MyRental[];
  tickets: MyTicket[];
  going: MyGoing[];
  goingIds: Set<string>; // attendance event uuids
  goingSlugs: Set<string>; // attendance event slugs (matches consumer EventItem.slug)
  refresh: () => void;
  // Consumer objects carry the public `slug`, not the DB uuid — creators resolve
  // slug → id, then insert with user_id = the customer.
  placeOrder: (businessSlug: string, items: OrderItem[], total: number, channel: string, fulfillment?: Record<string, unknown>) => Promise<{ error: string | null; id?: string; code?: string }>;
  // `status` is the row's FINAL status as decided by the server (the approval-mode
  // trigger, 0095) — the confirmation UI must show this, never a config guess.
  book: (businessSlug: string, serviceName: string, serviceId: string | null, startsAt: string, partySize: number | null, deposit: number | null, extra?: BookingExtra) => Promise<{ error: string | null; status?: string | null }>;
  buyTickets: (eventSlug: string, tierId: string, qty: number) => Promise<{ error: string | null; code?: string }>;
  buyTicketsMulti: (eventSlug: string, items: { tierId: string; qty: number }[], promo?: string, seats?: string[], addonIds?: string[]) => Promise<{ error: string | null; codes?: string[]; tickets?: { code: string; tierId: string }[] }>;
  waitlist: MyWaitlist[];
  waitlistTierIds: Set<string>;
  joinWaitlist: (eventSlug: string, tierId: string | null) => Promise<{ error: string | null }>;
  leaveWaitlist: (eventSlug: string, tierId: string | null) => Promise<{ error: string | null }>;
  rsvp: (eventSlug: string, on: boolean) => Promise<{ error: string | null }>;
  // Customer self-service: cancel one's own order/booking/rental (RLS: own rows).
  cancel: (kind: 'order' | 'booking' | 'rental', id: string) => Promise<{ error: string | null }>;
  /** Move a pending/confirmed booking to a new slot (status resets to 'pending' so
   *  the business re-confirms — guard in migration 0092 §7). Optionally reassigns
   *  the professional. Errors surface the overlap guard ('staff_slot_taken'). */
  rescheduleBooking: (id: string, startsAt: string, staff?: { id: string; name: string } | null) => Promise<{ error: string | null }>;
};

const C = createContext<Ctx | null>(null);

const BIZ = 'businesses(name,slug)';
const EV = 'events(slug,title_es,title_en,starts_at,venue_es,venue_en,time_label_es,time_label_en)';

export function MyActivityProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [rentals, setRentals] = useState<MyRental[]>([]);
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [going, setGoing] = useState<MyGoing[]>([]);
  const [waitlist, setWaitlist] = useState<MyWaitlist[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!supabase || !user) {
      setOrders([]); setBookings([]); setRentals([]); setTickets([]); setGoing([]); setWaitlist([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const uid = user.id;
      const [o, b, r, t, g, w] = await Promise.all([
        supabase!.from('business_orders').select(`id,business_id,code,items,total,channel,status,created_at,fulfillment,${BIZ}`).eq('user_id', uid).order('created_at', { ascending: false }).limit(200),
        supabase!.from('business_bookings').select(`id,business_id,service_name,service_id,party_size,starts_at,status,deposit,created_at,duration_min,staff_id,staff_name,addons,variant,total,notes,${BIZ}`).eq('user_id', uid).order('starts_at', { ascending: false }).limit(200),
        supabase!.from('business_rental_orders').select(`id,business_id,start_at,end_at,fee_total,deposit_total,status,paid,deposit_status,deposit_captured,created_at,business_rentals(item_name,qty),${BIZ}`).eq('user_id', uid).order('created_at', { ascending: false }).limit(200),
        supabase!.from('event_tickets').select(`id,event_id,qty,admitted,total,unit_price,code,status,used_at,created_at,${EV},event_tiers(name_es,name_en)`).eq('user_id', uid).order('created_at', { ascending: false }).limit(200),
        supabase!.from('event_attendance').select(`event_id,created_at,${EV}`).eq('user_id', uid).order('created_at', { ascending: false }),
        supabase!.from('event_waitlist').select('event_id,tier_id,status').eq('user_id', uid),
      ]);
      if (cancelled) return;
      if (!o.error && o.data) setOrders(o.data as unknown as MyOrder[]);
      if (!b.error && b.data) setBookings(b.data as unknown as MyBooking[]);
      if (!r.error && r.data) setRentals((r.data as unknown as (Omit<MyRental, 'item_name' | 'item_count' | 'total' | 'deposit'> & { fee_total: number | null; deposit_total: number | null; business_rentals: { item_name: string; qty: number }[] })[]).map((o) => {
        const lines = Array.isArray(o.business_rentals) ? o.business_rentals : [];
        const first = lines[0]?.item_name ?? 'Renta';
        return { id: o.id, business_id: o.business_id, item_name: lines.length > 1 ? `${first} +${lines.length - 1}` : first, item_count: lines.length, start_at: o.start_at, end_at: o.end_at, total: o.fee_total, deposit: o.deposit_total, status: o.status, paid: o.paid === true, depositStatus: String((o as { deposit_status?: string }).deposit_status ?? 'none'), depositCaptured: Number((o as { deposit_captured?: number }).deposit_captured ?? 0), created_at: o.created_at, businesses: o.businesses };
      }));
      if (!t.error && t.data) setTickets(t.data as unknown as MyTicket[]);
      if (!g.error && g.data) setGoing(g.data as unknown as MyGoing[]);
      if (!w.error && w.data) setWaitlist(w.data as unknown as MyWaitlist[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  // Live updates: when the owner advances a status (or a new row lands), reflect it
  // on Mi cuenta immediately. Filtered to the signed-in customer's own rows; RLS
  // (0032) means realtime only delivers those anyway. Tables published in 0060.
  useEffect(() => {
    if (!supabase || !user) return;
    const filt = `user_id=eq.${user.id}`;
    const ch = supabase
      .channel(`myactivity-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_orders', filter: filt }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_bookings', filter: filt }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_rental_orders', filter: filt }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_tickets', filter: filt }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendance', filter: filt }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_waitlist', filter: filt }, () => refresh())
      .subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [user, refresh]);

  const custName = profile?.display_name ?? null;

  // slug → uuid (public read). Returns null if not found / offline.
  const idOf = useCallback(async (table: 'businesses' | 'events', slug: string): Promise<string | null> => {
    if (!supabase) return null;
    const { data } = await supabase.from(table).select('id').eq('slug', slug).maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  }, []);

  const placeOrder = useCallback<Ctx['placeOrder']>(async (businessSlug, items, total, channel, fulfillment) => {
    if (!supabase || !user) return { error: 'auth' };
    const bizId = await idOf('businesses', businessSlug);
    if (!bizId) return { error: 'business-not-found' };
    // returning id+code lets the cash confirmation sheet track THIS order live
    const { data, error } = await supabase.from('business_orders').insert({ business_id: bizId, user_id: user.id, customer_name: custName, items, total, channel, status: 'new', ...(fulfillment ? { fulfillment } : {}) }).select('id,code').single();
    if (!error) refresh();
    const row = data as { id: string; code: string | null } | null;
    return { error: error ? error.message : null, id: row?.id, code: row?.code ?? undefined };
  }, [user, custName, refresh, idOf]);

  const book = useCallback<Ctx['book']>(async (businessSlug, serviceName, serviceId, startsAt, partySize, deposit, extra) => {
    if (!supabase || !user) return { error: 'auth' };
    const bizId = await idOf('businesses', businessSlug);
    if (!bizId) return { error: 'business-not-found' };
    // .select('status') reads the row back AFTER the approval-mode trigger (0095)
    // ran, so the caller learns whether the server confirmed it or left it pending.
    const { data, error } = await supabase.from('business_bookings').insert({
      business_id: bizId, user_id: user.id, customer_name: custName, service_name: serviceName,
      service_id: serviceId, starts_at: startsAt, party_size: partySize, deposit, status: 'pending',
      ...(extra?.duration_min ? { duration_min: extra.duration_min } : {}),
      ...(extra?.staff_id ? { staff_id: extra.staff_id, staff_name: extra.staff_name ?? null } : {}),
      ...(extra?.addons?.length ? { addons: extra.addons } : {}),
      ...(extra?.variant ? { variant: extra.variant } : {}),
      ...(extra?.total != null ? { total: extra.total } : {}),
      ...(extra?.notes ? { notes: extra.notes.slice(0, 300) } : {}),
    }).select('status').single();
    if (!error) refresh();
    return { error: error ? error.message : null, status: (data as { status: string } | null)?.status ?? null };
  }, [user, custName, refresh, idOf]);

  // Capacity-checked purchase via buy_event_tickets (migration 0061): the RPC locks
  // the tier, verifies availability + sales window, snapshots unit_price, issues the
  // ticket + code. Throws a reason (sold out / sales closed) we surface to the buyer.
  const buyTickets = useCallback<Ctx['buyTickets']>(async (eventSlug, tierId, qty) => {
    if (!supabase || !user) return { error: 'auth' };
    try {
      const { code } = await buyEventTickets(eventSlug, tierId, qty);
      refresh();
      return { error: null, code };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'error' };
    }
  }, [user, refresh]);

  // Atomic multi-tier purchase via buy_event_tickets_multi (migration 0064): one
  // all-or-nothing order across every selected tier (no partial order if a later
  // tier sold out). Returns the codes + per-ticket tier so the UI can label each.
  const buyTicketsMulti = useCallback<Ctx['buyTicketsMulti']>(async (eventSlug, items, promo, seats, addonIds) => {
    if (!supabase || !user) return { error: 'auth' };
    try {
      const rows = await buyEventTicketsMulti(eventSlug, items, promo, seats, addonIds);
      refresh();
      return { error: null, codes: rows.map((r) => r.code), tickets: rows.map((r) => ({ code: r.code, tierId: r.tierId })) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'error' };
    }
  }, [user, refresh]);

  // Waitlist join/leave (migration 0065). "Avísame si se libera" — we notify, we
  // don't hold a seat (first to re-buy wins). RPCs resolve the slug + own the row.
  const joinWaitlist = useCallback<Ctx['joinWaitlist']>(async (eventSlug, tierId) => {
    if (!supabase || !user) return { error: 'auth' };
    const { error } = await supabase.rpc('join_waitlist', { in_slug: eventSlug, in_tier_id: tierId });
    if (!error) refresh();
    return { error: error ? error.message : null };
  }, [user, refresh]);
  const leaveWaitlist = useCallback<Ctx['leaveWaitlist']>(async (eventSlug, tierId) => {
    if (!supabase || !user) return { error: 'auth' };
    const { error } = await supabase.rpc('leave_waitlist', { in_slug: eventSlug, in_tier_id: tierId });
    if (!error) refresh();
    return { error: error ? error.message : null };
  }, [user, refresh]);

  const rsvp = useCallback<Ctx['rsvp']>(async (eventSlug, on) => {
    if (!supabase || !user) return { error: 'auth' };
    const evId = await idOf('events', eventSlug);
    if (!evId) return { error: 'event-not-found' };
    if (on) {
      const { error } = await supabase.from('event_attendance').upsert({ event_id: evId, user_id: user.id });
      if (!error) refresh();
      return { error: error ? error.message : null };
    }
    const { error } = await supabase.from('event_attendance').delete().eq('event_id', evId).eq('user_id', user.id);
    if (!error) refresh();
    return { error: error ? error.message : null };
  }, [user, refresh, idOf]);

  const cancel = useCallback<Ctx['cancel']>(async (kind, id) => {
    if (!supabase || !user) return { error: 'auth' };
    const table = kind === 'order' ? 'business_orders' : kind === 'booking' ? 'business_bookings' : 'business_rental_orders';
    // Refund BEFORE cancelling, while the purchase is still in a self-refundable
    // early status — the server enforces the eligibility (only a not-yet-accepted
    // order) and no-ops for cash/late purchases, so this is safe to always call.
    await refundPurchase(kind, id).catch(() => {});
    const { error } = await supabase.from(table).update({ status: 'cancelled' }).eq('id', id).eq('user_id', user.id);
    if (!error) refresh();
    return { error: error ? error.message : null };
  }, [user, refresh]);

  const rescheduleBooking = useCallback<Ctx['rescheduleBooking']>(async (id, startsAt, staff) => {
    if (!supabase || !user) return { error: 'auth' };
    const { error } = await supabase.from('business_bookings')
      .update({ starts_at: startsAt, status: 'pending', ...(staff !== undefined ? { staff_id: staff?.id ?? null, staff_name: staff?.name ?? null } : {}) })
      .eq('id', id).eq('user_id', user.id);
    if (!error) refresh();
    return { error: error ? error.message : null };
  }, [user, refresh]);

  const goingIds = useMemo(() => new Set(going.map((g) => g.event_id)), [going]);
  const goingSlugs = useMemo(() => new Set(going.map((g) => g.events?.slug).filter(Boolean) as string[]), [going]);
  // tiers the user is actively waiting on (for the "En espera ✓" toggle on sold-out tiers).
  const waitlistTierIds = useMemo(() => new Set(waitlist.filter((w) => w.tier_id && w.status !== 'converted').map((w) => w.tier_id!)), [waitlist]);

  const value: Ctx = { loading, orders, bookings, rentals, tickets, going, goingIds, goingSlugs, refresh, placeOrder, book, buyTickets, buyTicketsMulti, waitlist, waitlistTierIds, joinWaitlist, leaveWaitlist, rsvp, cancel, rescheduleBooking };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useMyActivity(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useMyActivity must be used inside <MyActivityProvider>');
  return ctx;
}

/**
 * Poll Mi actividad while a tracking surface is open on a LIVE order (pass null
 * when closed). Realtime advances the tracker instantly when the websocket is
 * up; this guarantees it still advances (≤8s) when it isn't — flaky mobile
 * networks, blocked websockets. Stops on terminal states, so it only costs one
 * refetch cycle every 8s while the customer is actually watching an active order.
 */
export function useOrderPoll(orderId: string | null | undefined) {
  const { orders, refresh } = useMyActivity();
  const o = orderId ? orders.find((x) => x.id === orderId) : undefined;
  const terminal = !!o && (o.status === 'completed' || o.status === 'cancelled' || o.fulfillment?.dispatch === 'delivered');
  const active = !!orderId && !terminal;
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => refresh(), 8000);
    return () => window.clearInterval(t);
  }, [active, refresh]);
}
