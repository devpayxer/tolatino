'use client';

// The customer side of the two-sided transaction loop. Loads the signed-in
// user's orders / bookings / rentals / event tickets / RSVPs and exposes the
// creators the business listings + events call (place order, book, rent, buy
// tickets, RSVP "Voy"). Every create inserts with user_id = the customer, so the
// SAME row also lands in the business dashboard (RLS opens both sides —
// migration 0032). Optimistic local state so Mi cuenta reflects instantly.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type BizRef = { name: string; slug: string } | null;
type EvRef = { slug: string; title_es: string; title_en: string; starts_at: string; venue_es: string | null; venue_en: string | null; time_label_es: string | null; time_label_en: string | null } | null;

export type OrderItem = { name: string; qty: number; price?: number };
export type MyOrder = { id: string; business_id: string; code: string | null; items: OrderItem[]; total: number | null; channel: string | null; status: string; created_at: string; businesses: BizRef };
export type MyBooking = { id: string; business_id: string; service_name: string | null; party_size: number | null; starts_at: string; status: string; deposit: number | null; created_at: string; businesses: BizRef };
export type MyRental = { id: string; business_id: string; item_name: string; start_at: string; end_at: string | null; qty: number; total: number | null; status: string; created_at: string; businesses: BizRef };
export type MyTicket = { id: string; event_id: string; qty: number; total: number | null; code: string; status: string; created_at: string; events: EvRef };
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
  book: (businessSlug: string, serviceName: string, startsAt: string, partySize: number | null, deposit: number | null) => Promise<{ error: string | null }>;
  rent: (businessSlug: string, itemName: string, startAt: string, endAt: string | null, qty: number, total: number, deposit: number | null) => Promise<{ error: string | null }>;
  buyTickets: (eventSlug: string, qty: number, total: number | null) => Promise<{ error: string | null }>;
  rsvp: (eventSlug: string, on: boolean) => Promise<{ error: string | null }>;
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
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!supabase || !user) {
      setOrders([]); setBookings([]); setRentals([]); setTickets([]); setGoing([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const uid = user.id;
      const [o, b, r, t, g] = await Promise.all([
        supabase!.from('business_orders').select(`id,business_id,code,items,total,channel,status,created_at,${BIZ}`).eq('user_id', uid).order('created_at', { ascending: false }),
        supabase!.from('business_bookings').select(`id,business_id,service_name,party_size,starts_at,status,deposit,created_at,${BIZ}`).eq('user_id', uid).order('starts_at', { ascending: false }),
        supabase!.from('business_rentals').select(`id,business_id,item_name,start_at,end_at,qty,total,status,created_at,${BIZ}`).eq('user_id', uid).order('start_at', { ascending: false }),
        supabase!.from('event_tickets').select(`id,event_id,qty,total,code,status,created_at,${EV}`).eq('user_id', uid).order('created_at', { ascending: false }),
        supabase!.from('event_attendance').select(`event_id,created_at,${EV}`).eq('user_id', uid).order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      if (!o.error && o.data) setOrders(o.data as unknown as MyOrder[]);
      if (!b.error && b.data) setBookings(b.data as unknown as MyBooking[]);
      if (!r.error && r.data) setRentals(r.data as unknown as MyRental[]);
      if (!t.error && t.data) setTickets(t.data as unknown as MyTicket[]);
      if (!g.error && g.data) setGoing(g.data as unknown as MyGoing[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
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

  const book = useCallback<Ctx['book']>(async (businessSlug, serviceName, startsAt, partySize, deposit) => {
    if (!supabase || !user) return { error: 'auth' };
    const bizId = await idOf('businesses', businessSlug);
    if (!bizId) return { error: 'business-not-found' };
    const { error } = await supabase.from('business_bookings').insert({ business_id: bizId, user_id: user.id, customer_name: custName, service_name: serviceName, starts_at: startsAt, party_size: partySize, deposit, status: 'pending' });
    if (!error) refresh();
    return { error: error ? error.message : null };
  }, [user, custName, refresh, idOf]);

  const rent = useCallback<Ctx['rent']>(async (businessSlug, itemName, startAt, endAt, qty, total, deposit) => {
    if (!supabase || !user) return { error: 'auth' };
    const bizId = await idOf('businesses', businessSlug);
    if (!bizId) return { error: 'business-not-found' };
    const { error } = await supabase.from('business_rentals').insert({ business_id: bizId, user_id: user.id, customer_name: custName, item_name: itemName, start_at: startAt, end_at: endAt, qty, total, deposit, status: 'pending' });
    if (!error) refresh();
    return { error: error ? error.message : null };
  }, [user, custName, refresh, idOf]);

  const buyTickets = useCallback<Ctx['buyTickets']>(async (eventSlug, qty, total) => {
    if (!supabase || !user) return { error: 'auth' };
    const evId = await idOf('events', eventSlug);
    if (!evId) return { error: 'event-not-found' };
    const { error } = await supabase.from('event_tickets').insert({ event_id: evId, user_id: user.id, qty, total });
    if (!error) refresh();
    return { error: error ? error.message : null };
  }, [user, refresh, idOf]);

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

  const goingIds = useMemo(() => new Set(going.map((g) => g.event_id)), [going]);
  const goingSlugs = useMemo(() => new Set(going.map((g) => g.events?.slug).filter(Boolean) as string[]), [going]);

  const value: Ctx = { loading, orders, bookings, rentals, tickets, going, goingIds, goingSlugs, refresh, placeOrder, book, rent, buyTickets, rsvp };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useMyActivity(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useMyActivity must be used inside <MyActivityProvider>');
  return ctx;
}
