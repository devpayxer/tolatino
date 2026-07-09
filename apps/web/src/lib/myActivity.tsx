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
import { useAuth } from '@/lib/auth';

type BizRef = { name: string; slug: string } | null;
type EvRef = { slug: string; title_es: string; title_en: string; starts_at: string; venue_es: string | null; venue_en: string | null; time_label_es: string | null; time_label_en: string | null } | null;

export type OrderItem = { name: string; qty: number; price?: number; opts?: string };
/** Receipt + delivery state stored by the paid checkout (fulfillment jsonb). */
export type OrderFulfil = {
  address?: string; address_label?: string; instructions?: string;
  dispatch?: 'unassigned' | 'assigned' | 'picked_up' | 'on_the_way' | 'delivered';
  driver?: string; driver_phone?: string; eta?: string; eta_range?: string;
  subtotal?: number; delivery_fee?: number; tip?: number; service_fee?: number; paid_total?: number;
};
export type MyOrder = { id: string; business_id: string; code: string | null; items: OrderItem[]; total: number | null; channel: string | null; status: string; created_at: string; fulfillment: OrderFulfil | null; businesses: BizRef };
export type MyBooking = { id: string; business_id: string; service_name: string | null; party_size: number | null; starts_at: string; status: string; deposit: number | null; created_at: string; businesses: BizRef };
export type MyRental = { id: string; business_id: string; item_name: string; start_at: string; end_at: string | null; qty: number; total: number | null; status: string; created_at: string; businesses: BizRef };
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
  placeOrder: (businessSlug: string, items: OrderItem[], total: number, channel: string) => Promise<{ error: string | null }>;
  book: (businessSlug: string, serviceName: string, serviceId: string | null, startsAt: string, partySize: number | null, deposit: number | null) => Promise<{ error: string | null }>;
  rent: (businessSlug: string, itemName: string, itemId: string | null, startAt: string, endAt: string | null, qty: number, total: number, deposit: number | null) => Promise<{ error: string | null }>;
  buyTickets: (eventSlug: string, tierId: string, qty: number) => Promise<{ error: string | null; code?: string }>;
  buyTicketsMulti: (eventSlug: string, items: { tierId: string; qty: number }[], promo?: string) => Promise<{ error: string | null; codes?: string[]; tickets?: { code: string; tierId: string }[] }>;
  waitlist: MyWaitlist[];
  waitlistTierIds: Set<string>;
  joinWaitlist: (eventSlug: string, tierId: string | null) => Promise<{ error: string | null }>;
  leaveWaitlist: (eventSlug: string, tierId: string | null) => Promise<{ error: string | null }>;
  rsvp: (eventSlug: string, on: boolean) => Promise<{ error: string | null }>;
  // Customer self-service: cancel one's own order/booking/rental (RLS: own rows).
  cancel: (kind: 'order' | 'booking' | 'rental', id: string) => Promise<{ error: string | null }>;
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
        supabase!.from('business_orders').select(`id,business_id,code,items,total,channel,status,created_at,fulfillment,${BIZ}`).eq('user_id', uid).order('created_at', { ascending: false }),
        supabase!.from('business_bookings').select(`id,business_id,service_name,party_size,starts_at,status,deposit,created_at,${BIZ}`).eq('user_id', uid).order('starts_at', { ascending: false }),
        supabase!.from('business_rentals').select(`id,business_id,item_name,start_at,end_at,qty,total,status,created_at,${BIZ}`).eq('user_id', uid).order('start_at', { ascending: false }),
        supabase!.from('event_tickets').select(`id,event_id,qty,admitted,total,unit_price,code,status,used_at,created_at,${EV},event_tiers(name_es,name_en)`).eq('user_id', uid).order('created_at', { ascending: false }),
        supabase!.from('event_attendance').select(`event_id,created_at,${EV}`).eq('user_id', uid).order('created_at', { ascending: false }),
        supabase!.from('event_waitlist').select('event_id,tier_id,status').eq('user_id', uid),
      ]);
      if (cancelled) return;
      if (!o.error && o.data) setOrders(o.data as unknown as MyOrder[]);
      if (!b.error && b.data) setBookings(b.data as unknown as MyBooking[]);
      if (!r.error && r.data) setRentals(r.data as unknown as MyRental[]);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_rentals', filter: filt }, () => refresh())
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

  const placeOrder = useCallback<Ctx['placeOrder']>(async (businessSlug, items, total, channel) => {
    if (!supabase || !user) return { error: 'auth' };
    const bizId = await idOf('businesses', businessSlug);
    if (!bizId) return { error: 'business-not-found' };
    const { error } = await supabase.from('business_orders').insert({ business_id: bizId, user_id: user.id, customer_name: custName, items, total, channel, status: 'new' });
    if (!error) refresh();
    return { error: error ? error.message : null };
  }, [user, custName, refresh, idOf]);

  const book = useCallback<Ctx['book']>(async (businessSlug, serviceName, serviceId, startsAt, partySize, deposit) => {
    if (!supabase || !user) return { error: 'auth' };
    const bizId = await idOf('businesses', businessSlug);
    if (!bizId) return { error: 'business-not-found' };
    const { error } = await supabase.from('business_bookings').insert({ business_id: bizId, user_id: user.id, customer_name: custName, service_name: serviceName, service_id: serviceId, starts_at: startsAt, party_size: partySize, deposit, status: 'pending' });
    if (!error) refresh();
    return { error: error ? error.message : null };
  }, [user, custName, refresh, idOf]);

  const rent = useCallback<Ctx['rent']>(async (businessSlug, itemName, itemId, startAt, endAt, qty, total, deposit) => {
    if (!supabase || !user) return { error: 'auth' };
    const bizId = await idOf('businesses', businessSlug);
    if (!bizId) return { error: 'business-not-found' };
    const { error } = await supabase.from('business_rentals').insert({ business_id: bizId, user_id: user.id, customer_name: custName, item_name: itemName, item_id: itemId, start_at: startAt, end_at: endAt, qty, total, deposit, status: 'pending' });
    if (!error) refresh();
    return { error: error ? error.message : null };
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
  const buyTicketsMulti = useCallback<Ctx['buyTicketsMulti']>(async (eventSlug, items, promo) => {
    if (!supabase || !user) return { error: 'auth' };
    try {
      const rows = await buyEventTicketsMulti(eventSlug, items, promo);
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
    const table = kind === 'order' ? 'business_orders' : kind === 'booking' ? 'business_bookings' : 'business_rentals';
    const { error } = await supabase.from(table).update({ status: 'cancelled' }).eq('id', id).eq('user_id', user.id);
    if (!error) refresh();
    return { error: error ? error.message : null };
  }, [user, refresh]);

  const goingIds = useMemo(() => new Set(going.map((g) => g.event_id)), [going]);
  const goingSlugs = useMemo(() => new Set(going.map((g) => g.events?.slug).filter(Boolean) as string[]), [going]);
  // tiers the user is actively waiting on (for the "En espera ✓" toggle on sold-out tiers).
  const waitlistTierIds = useMemo(() => new Set(waitlist.filter((w) => w.tier_id && w.status !== 'converted').map((w) => w.tier_id!)), [waitlist]);

  const value: Ctx = { loading, orders, bookings, rentals, tickets, going, goingIds, goingSlugs, refresh, placeOrder, book, rent, buyTickets, buyTicketsMulti, waitlist, waitlistTierIds, joinWaitlist, leaveWaitlist, rsvp, cancel };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useMyActivity(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useMyActivity must be used inside <MyActivityProvider>');
  return ctx;
}
