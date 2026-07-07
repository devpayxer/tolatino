'use client';

// Eventos y boletos / Events module (business dashboard). Ported from the
// Handoff v2 "Events Module" prototype. Three nested surfaces driven by real
// state: (1) the LIST with sub-tabs Próximos/Borradores/Pasados/Recurrentes/
// Promotores; (2) a MANAGE DETAIL view (hero stats + Resumen/Asistentes/
// Check-in/Boletos/Ajustes, with a QR + live check-in toggles); (3) a 4-step
// "add event" wizard (Detalles → Boletos → Fecha/lugar → Revisar) ending in a
// success screen. Mobile-first single column; on desktop the list gains a
// sticky rail and the manage/wizard panels widen into multi-column layouts.

import { useEffect, useMemo, useState } from 'react';
import {
  Check, DollarSign, MapPin, Megaphone, Plus,
  QrCode, RefreshCw, Search, Share2, Ticket, TrendingUp, Users,
} from 'lucide-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';

type View = 'list' | 'manage' | 'wizard' | 'success';
type ListTab = 'upcoming' | 'drafts' | 'past' | 'recurring' | 'promoters';
type ManageTab = 'overview' | 'attendees' | 'checkin' | 'tickets' | 'settings';

type EventRow = {
  id: number; dbId?: string; name: string; mon: string; day: string; time: string; price: string;
  priceN: number; sold: number; cap: number; tile: string; status: [string, string];
  statusBg: string; statusC: string;
};

// A row from the public `events` table (migration 0002 + 0022), the columns the
// dashboard reads for the owner's own events.
type EventDbRow = {
  id: string; slug: string; title_es: string; title_en: string;
  venue_es: string | null; venue_en: string | null; cat: string; city: string;
  starts_at: string; time_label_es: string | null; time_label_en: string | null;
  price_label: string | null; going_count: number; desc_es: string | null; desc_en: string | null;
  tile_a: string | null; tile_b: string | null;
};

// A ticket a customer bought for this event (event_tickets) — the other side of
// the consumer's "Comprar boletos" action. customer_name is stored on insert.
type TicketRow = {
  id: string; customer_name: string | null; qty: number; total: number | null; code: string; status: string; created_at: string;
};
type EventTier = {
  id: string; name_es: string; name_en: string; price: number; capacity: number | null; sold: number; sort: number;
};
const TICKET_STATUS: Record<string, { es: string; en: string; cls: string }> = {
  confirmed: { es: 'Confirmado', en: 'Confirmed', cls: 'bg-green-bg text-green-dark' },
  used:      { es: 'Usado',      en: 'Used',      cls: 'bg-lilac-2 text-ink-2' },
  refunded:  { es: 'Reembolsado', en: 'Refunded', cls: 'bg-lilac-2 text-ink-2' },
};

// The public events table only allows four categories; map the wizard's event
// "type" to the nearest one (there is no 'mercado' source type in the wizard).
const EVENT_CAT_MAP: Record<string, 'musica' | 'mercado' | 'familia' | 'comida'> = {
  clase: 'familia', cata: 'comida', cena: 'comida', musica: 'musica',
};
const MON_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const MON_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const fmtTime = (d: Date) => {
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const m = d.getMinutes();
  return m ? `${h}:${String(m).padStart(2, '0')} ${ap}` : `${h} ${ap}`;
};
const EMPTY_EVENT: EventRow = {
  id: 0, name: '', mon: '', day: '', time: '', price: '', priceN: 0, sold: 0, cap: 1,
  tile: '#EFEBFF 0 9px,#E5DEF9 9px 18px', status: ['', ''], statusBg: '#E3F5EA', statusC: '#1F8A4C',
};
type Attendee = { initials: string; color: string; name: string; tier: string; tierBg: string; tierC: string; diet: string; base: boolean };
type EventDraft = { name: string; desc: string; type: string; date: string; time: string; location: string; price: string; capacity: string; recurring: boolean; vis: string };

export function EventsModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es, isFree, isPremium, ci } = ctx;
  void tab;

  // ---------- state ----------
  const [view, setView] = useState<View>('list');
  const [listTab, setListTab] = useState<ListTab>('upcoming');
  const [manageTab, setManageTab] = useState<ManageTab>('overview');
  const [manageId, setManageId] = useState(1);
  const [recurState, setRecurState] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: false });
  const [settingState, setSettingState] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: false, 4: true });
  const [checkedIn, setCheckedIn] = useState<Record<string, boolean>>({});
  const [attendeeQuery, setAttendeeQuery] = useState('');
  const [ticketRows, setTicketRows] = useState<TicketRow[] | null>(null);
  const [wizStep, setWizStep] = useState(0);
  const [wizMax, setWizMax] = useState(0);
  const [draft, setDraft] = useState<EventDraft>(newDraft);
  const [toast, setToast] = useState('');

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };

  // ---------- persistence wiring ----------
  // A signed-in owner's events load from / write to Supabase; when nobody is
  // signed in (or Supabase isn't configured) we stay in DEMO mode: the sample
  // seed below, with local-only edits that never touch the network.
  const admin = useBizAdmin();
  const real = admin.active;
  const persistable = !admin.demo && !!real; // real signed-in business → persist
  const { user } = useAuth();

  // ---------- seed data (DEMO sample events) ----------
  const seedEvents = useMemo<EventRow[]>(() => [
    { id: 1, name: L('Cena de Halloween', 'Halloween Dinner'), mon: 'OCT', day: '31', time: '7 PM', price: '$140', priceN: 140, sold: 32, cap: 48, tile: '#FCE3DC 0 9px,#F6CEC2 9px 18px', status: [es ? 'Vendiendo' : 'Selling', 'Selling'], statusBg: '#E3F5EA', statusC: '#1F8A4C' },
    { id: 2, name: 'Sourdough 101', mon: 'NOV', day: '08', time: '10 AM', price: '$85', priceN: 85, sold: 14, cap: 16, tile: '#F3E2CE 0 9px,#ECD3B4 9px 18px', status: [es ? 'Casi lleno' : 'Almost full', 'Almost full'], statusBg: '#FCEFD6', statusC: '#9A6A12' },
    { id: 3, name: L('Cata de vinos', 'Wine Tasting'), mon: 'NOV', day: '15', time: '6 PM', price: '$45', priceN: 45, sold: 22, cap: 30, tile: '#F3D9E2 0 9px,#E8BFCD 9px 18px', status: [es ? 'Vendiendo' : 'Selling', 'Selling'], statusBg: '#E3F5EA', statusC: '#1F8A4C' },
    { id: 4, name: L('Noche de Lotería', 'Lotería Night'), mon: 'NOV', day: '22', time: '5 PM', price: '$10', priceN: 10, sold: 14, cap: 16, tile: '#EAE2F8 0 9px,#DCCEF2 9px 18px', status: [es ? 'Vendiendo' : 'Selling', 'Selling'], statusBg: '#E3F5EA', statusC: '#1F8A4C' },
  ], [es, L]);

  const [events, setEvents] = useState<EventRow[]>(seedEvents);

  // Map an `events` DB row → the module's rich EventRow (tracks the uuid as dbId
  // so later edit/delete can target it). Capacity isn't modeled server-side yet,
  // so we derive a nominal cap for the progress bars.
  const rowToEvent = (r: EventDbRow, idx: number): EventRow => {
    const d = new Date(r.starts_at);
    const valid = !Number.isNaN(d.getTime());
    const sold = r.going_count ?? 0;
    const cap = Math.max(50, sold);
    const almost = cap > 0 && sold / cap >= 0.85;
    const tl = L(r.time_label_es ?? '', r.time_label_en ?? '');
    const priceN = Number((r.price_label ?? '').replace(/[^0-9.]/g, '')) || 0;
    return {
      id: idx + 1,
      dbId: r.id,
      name: L(r.title_es, r.title_en),
      mon: valid ? (es ? MON_ES : MON_EN)[d.getMonth()] : '—',
      day: valid ? String(d.getDate()).padStart(2, '0') : '',
      time: tl || (valid ? fmtTime(d) : ''),
      price: r.price_label ?? L('Gratis', 'Free'),
      priceN,
      sold,
      cap,
      tile: `${r.tile_a ?? '#EFEBFF'} 0 9px,${r.tile_b ?? '#E5DEF9'} 9px 18px`,
      status: almost ? ['Casi lleno', 'Almost full'] : ['Vendiendo', 'Selling'],
      statusBg: almost ? '#FCEFD6' : '#E3F5EA',
      statusC: almost ? '#9A6A12' : '#1F8A4C',
    };
  };

  // Pure fetch of the owner's events (callers own the setState).
  const fetchEvents = async (ownerId: string): Promise<EventRow[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('events')
      .select('id,slug,title_es,title_en,venue_es,venue_en,cat,city,starts_at,time_label_es,time_label_en,price_label,going_count,desc_es,desc_en,tile_a,tile_b')
      .eq('owner_id', ownerId)
      .order('starts_at', { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return (data as EventDbRow[]).map(rowToEvent);
  };

  // On mount / auth change: real owner → load their events; demo → keep the seed.
  useEffect(() => {
    if (!persistable || !real || !user) { setEvents(seedEvents); return; }
    let cancelled = false;
    (async () => {
      const rows = await fetchEvents(user.id);
      if (!cancelled) setEvents(rows);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, real?.id, admin.demo, es]);

  const drafts = useMemo(() => [
    { name: L('Fin de Año · Cata y Burbujas', 'NYE · Tasting & Bubbles'), date: L('31 Dic', 'Dec 31'), time: '8 PM – 1 AM', price: '$185', tile: '#F3D9E2 0 9px,#E8BFCD 9px 18px', ready: [[L('Detalles', 'Details'), true], [L('Fecha', 'Date'), true], [L('Boletos', 'Tickets'), false], [L('Fotos', 'Photos'), false]] as [string, boolean][] },
    { name: L('Serie de Pan de Invierno', 'Winter Bread Series'), date: L('Ene (sin fecha)', 'Jan (TBD)'), time: '10 AM – 1 PM', price: '$90', tile: '#F3E2CE 0 9px,#ECD3B4 9px 18px', ready: [[L('Detalles', 'Details'), true], [L('Fecha', 'Date'), false], [L('Boletos', 'Tickets'), true], [L('Fotos', 'Photos'), false]] as [string, boolean][] },
  ], [L]);

  const pastEvents = useMemo(() => [
    { name: L('Mercado Navideño', 'Holiday Market'), date: L('14 Dic 2024', 'Dec 14, 2024'), sold: 142, rev: '$3,840', rating: '4.9', tile: '#F3D9E2 0 9px,#E8BFCD 9px 18px' },
    { name: L('Clase de tamales', 'Tamales Class'), date: L('8 Dic 2024', 'Dec 8, 2024'), sold: 24, rev: '$1,200', rating: '5.0', tile: '#FCE3DC 0 9px,#F6CEC2 9px 18px' },
    { name: L('Noche de jazz', 'Jazz Night'), date: L('23 Nov 2024', 'Nov 23, 2024'), sold: 86, rev: '$2,580', rating: '4.7', tile: '#E4ECFB 0 9px,#D7E3F6 9px 18px' },
  ], [L]);

  const recRaw = useMemo(() => [
    { name: L('Martes de tacos en vivo', 'Live Taco Tuesdays'), cadence: L('Cada martes', 'Every Tuesday'), next: L('Próx: 14 oct', 'Next: Oct 14'), bg: '#FCEFD6', c: '#9A6A12' },
    { name: L('Brunch dominical', 'Sunday Brunch'), cadence: L('Cada domingo', 'Every Sunday'), next: L('Próx: 12 oct', 'Next: Oct 12'), bg: '#E3F5EA', c: '#1F8A4C' },
    { name: L('Cata mensual', 'Monthly Tasting'), cadence: L('Primer viernes', 'First Friday'), next: L('Próx: 1 nov', 'Next: Nov 1'), bg: '#EFEBFF', c: '#6D4DF6' },
  ], [L]);

  const promoters = useMemo(() => [
    { initials: 'CR', color: '#7B61FF', name: 'Carlos R.', code: 'CARLOS10', commission: '10%', sales: '$1,240', sold: 28 },
    { initials: 'LM', color: '#1F9D57', name: 'Lupita M.', code: 'LUPITA15', commission: '15%', sales: '$890', sold: 19 },
    { initials: 'DJ', color: '#E8954A', name: 'DJ Sonido', code: 'SONIDO', commission: '12%', sales: '$2,100', sold: 42 },
  ], []);

  const attendees = useMemo<Attendee[]>(() => [
    { initials: 'ML', color: '#7B61FF', name: 'Maria Lopez', tier: 'GA', tierBg: '#EFEBFF', tierC: '#6D4DF6', diet: L('Vegetariano', 'Vegetarian'), base: true },
    { initials: 'JT', color: '#2A5C8A', name: 'James Tate', tier: L('Pareja', 'Pair'), tierBg: '#E3F5EA', tierC: '#1F8A4C', diet: '', base: true },
    { initials: 'AF', color: '#E8954A', name: 'Anna Fischer', tier: 'GA', tierBg: '#EFEBFF', tierC: '#6D4DF6', diet: L('Sin gluten', 'Gluten-free'), base: true },
    { initials: 'DK', color: '#D6336C', name: 'Daniel Kim', tier: 'VIP', tierBg: '#FDE7EF', tierC: '#D6336C', diet: '', base: false },
    { initials: 'SR', color: '#1F9D57', name: 'Sofia Romano', tier: 'GA', tierBg: '#EFEBFF', tierC: '#6D4DF6', diet: L('Alergia nuez', 'Nut allergy'), base: false },
    { initials: 'PN', color: '#7B61FF', name: 'Priya Nair', tier: 'GA', tierBg: '#EFEBFF', tierC: '#6D4DF6', diet: L('Vegano', 'Vegan'), base: false },
  ], [L]);

  // ---------- derived: current managed event ----------
  // EMPTY_EVENT keeps the manage view from crashing when a real owner has no
  // events yet (the demo seed is never empty). cap:1 avoids divide-by-zero.
  const mgEv = events.find((e) => e.id === manageId) ?? events[0] ?? EMPTY_EVENT;
  const isCheckedIn = (a: Attendee) => (a.name in checkedIn ? checkedIn[a.name] : a.base);
  const checkedInCount = attendees.filter(isCheckedIn).length;
  const revenue = mgEv.sold * mgEv.priceN;

  // Real ticket sales for the managed event (event_tickets). Owner-scoped via
  // RLS; demo / no-uuid keeps null so the Boletos tab shows only the tier design.
  useEffect(() => {
    if (!persistable || !mgEv.dbId || !supabase) { setTicketRows(null); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!
        .from('event_tickets')
        .select('id,customer_name,qty,total,code,status,created_at')
        .eq('event_id', mgEv.dbId)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setTicketRows(error || !Array.isArray(data) ? [] : (data as unknown as TicketRow[]));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mgEv.dbId, admin.demo]);
  const ticketsSold = (ticketRows ?? []).reduce((n, t) => n + (t.qty || 0), 0);
  const ticketsRevenue = (ticketRows ?? []).reduce((n, t) => n + (Number(t.total) || 0), 0);

  // Real ticket tiers for the managed event (event_tiers, migration 0061). Owner CRUD
  // via RLS. Demo / no-uuid → null, and the Boletos tab shows the sample tier design.
  const [tierList, setTierList] = useState<EventTier[] | null>(null);
  const [tierEdit, setTierEdit] = useState<string | 'new' | null>(null); // which tier is open in the inline editor
  const [tierForm, setTierForm] = useState<{ name: string; price: string; capacity: string }>({ name: '', price: '', capacity: '' });
  const [tierBusy, setTierBusy] = useState(false);
  const reloadTiers = async () => {
    if (!mgEv.dbId || !supabase) return;
    const { data } = await supabase.from('event_tiers').select('id,name_es,name_en,price,capacity,sold,sort').eq('event_id', mgEv.dbId).order('sort');
    setTierList(Array.isArray(data) ? (data as unknown as EventTier[]) : []);
  };
  useEffect(() => {
    if (!persistable || !mgEv.dbId || !supabase) { setTierList(null); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!.from('event_tiers').select('id,name_es,name_en,price,capacity,sold,sort').eq('event_id', mgEv.dbId).order('sort');
      if (cancelled) return;
      setTierList(error || !Array.isArray(data) ? [] : (data as unknown as EventTier[]));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mgEv.dbId, admin.demo]);
  const openTierEdit = (t: EventTier | null) => {
    setTierEdit(t ? t.id : 'new');
    setTierForm(t ? { name: L(t.name_es, t.name_en), price: String(t.price), capacity: t.capacity == null ? '' : String(t.capacity) } : { name: '', price: '', capacity: '' });
  };
  const saveTier = async () => {
    if (!mgEv.dbId || !supabase || tierBusy) return;
    const name = tierForm.name.trim();
    if (!name) { flash(L('Ponle un nombre al nivel', 'Name the tier')); return; }
    const price = Number(tierForm.price) || 0;
    const capacity = tierForm.capacity.trim() === '' ? null : Math.max(0, Number(tierForm.capacity) || 0);
    setTierBusy(true);
    if (tierEdit === 'new') {
      await supabase.from('event_tiers').insert({ event_id: mgEv.dbId, name_es: name, name_en: name, price, capacity, sort: tierList?.length ?? 0 });
    } else if (tierEdit) {
      await supabase.from('event_tiers').update({ name_es: name, name_en: name, price, capacity }).eq('id', tierEdit);
    }
    setTierBusy(false); setTierEdit(null); await reloadTiers();
    flash(L('Nivel guardado', 'Tier saved'));
  };
  const deleteTier = async (id: string) => {
    if (!supabase) return;
    await supabase.from('event_tiers').delete().eq('id', id);
    setTierEdit(null); await reloadTiers();
    flash(L('Nivel eliminado', 'Tier removed'));
  };

  // Real door check-in: validate a ticket code (checkin_ticket RPC, migration 0061)
  // → flips it to used once; the buyer list below reflects the new status.
  const [checkinCode, setCheckinCode] = useState('');
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkinRes, setCheckinRes] = useState<{ ok: boolean; msg: string; buyer: string | null; qty: number | null; tier: string | null; already: boolean } | null>(null);
  const reloadTickets = async () => {
    if (!mgEv.dbId || !supabase) return;
    const { data } = await supabase.from('event_tickets').select('id,customer_name,qty,total,code,status,created_at').eq('event_id', mgEv.dbId).order('created_at', { ascending: false });
    setTicketRows(Array.isArray(data) ? (data as unknown as TicketRow[]) : []);
  };
  const runCheckin = async () => {
    const code = checkinCode.trim();
    if (!code || checkinBusy || !supabase) return;
    setCheckinBusy(true);
    const { data, error } = await supabase.rpc('checkin_ticket', { in_code: code });
    setCheckinBusy(false);
    if (error || !Array.isArray(data) || data.length === 0) {
      setCheckinRes({ ok: false, msg: 'error', buyer: null, qty: null, tier: null, already: false });
      return;
    }
    const r = data[0] as Record<string, unknown>;
    setCheckinRes({ ok: !!r.ok, msg: String(r.msg ?? ''), buyer: r.buyer ? String(r.buyer) : null, qty: r.qty != null ? Number(r.qty) : null, tier: r.tier ? String(r.tier) : null, already: !!r.already });
    setCheckinCode('');
    reloadTickets();
  };
  const usedQty = (ticketRows ?? []).filter((t) => t.status === 'used').reduce((n, t) => n + (t.qty || 0), 0);

  // Tiers to render: real ones for a signed-in owner, else the sample design.
  const TIER_COLORS = ['#7B61FF', '#1F9D57', '#D6336C', '#2F6FED', '#9A6A12'];
  const realTiers = persistable && tierList != null;
  const displayTiers = realTiers
    ? tierList!.map((t, i) => ({ id: t.id, label: L(t.name_es, t.name_en), priceN: Number(t.price), color: TIER_COLORS[i % TIER_COLORS.length], sold: t.sold, cap: t.capacity ?? Math.max(t.sold, 1), unlimited: t.capacity == null, tier: t }))
    : [
        { id: 'g', label: 'General', priceN: 85, color: '#7B61FF', sold: Math.round(mgEv.sold * 0.6), cap: Math.round(mgEv.cap * 0.6), unlimited: false, tier: null as EventTier | null },
        { id: 'p', label: L('Pareja', 'Pair'), priceN: 160, color: '#1F9D57', sold: Math.round(mgEv.sold * 0.25), cap: Math.round(mgEv.cap * 0.25), unlimited: false, tier: null as EventTier | null },
        { id: 'v', label: 'VIP', priceN: 250, color: '#D6336C', sold: Math.round(mgEv.sold * 0.15), cap: Math.max(1, Math.round(mgEv.cap * 0.15)), unlimited: false, tier: null as EventTier | null },
      ];
  const maxTierSold = Math.max(...displayTiers.map((x) => x.sold), 1);

  // ---------- shared UI helpers ----------
  const chip = (on: boolean) =>
    `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} className="relative h-[25px] w-[42px] flex-none cursor-pointer rounded-full transition-colors" style={{ background: on ? '#7B61FF' : '#D8D2E6' }} aria-pressed={on}>
      <span className="absolute top-[3px] h-[19px] w-[19px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.18)] transition-all" style={{ left: on ? '20px' : '3px' }} />
    </button>
  );

  const goManage = (id: number, mt: ManageTab = 'overview') => { setManageId(id); setManageTab(mt); setView('manage'); };
  const startWizard = () => { setDraft(newDraft()); setWizStep(0); setWizMax(0); setView('wizard'); };

  // ==================================================================
  // LIST — sub-tabs
  // ==================================================================
  const listTabs: [ListTab, string, number | null][] = [
    ['upcoming', L('Próximos', 'Upcoming'), null],
    ['drafts', L('Borradores', 'Drafts'), drafts.length],
    ['past', L('Pasados', 'Past'), null],
    ['recurring', L('Recurrentes', 'Recurring'), null],
    ['promoters', L('Promotores', 'Promoters'), null],
  ];

  // ---- Próximos ----
  const kpis = [
    { label: L('Próximos', 'Upcoming'), value: String(events.length), delta: null as string | null },
    { label: L('Boletos', 'Tickets'), value: '186', delta: '▲ 24%' },
    { label: L('Ingresos', 'Revenue'), value: '$14.2k', delta: '▲ 18%' },
  ];

  const upcomingView = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {kpis.map((k) => (
            <div key={k.label} className={`${cardCls} p-3`}>
              <div className="text-[9.5px] font-bold text-muted-2">{k.label}</div>
              <div className="mt-0.5 text-[18px] font-extrabold text-ink sm:text-[20px]">{k.value}</div>
              {k.delta && <div className="text-[9.5px] font-extrabold text-green">{k.delta}</div>}
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
          {events.map((e) => {
            const pct = Math.round((e.sold / e.cap) * 100);
            const barC = e.sold / e.cap > 0.85 ? '#E8954A' : '#7B61FF';
            return (
              <div key={e.id} className="overflow-hidden rounded-card-sm border border-hair bg-white shadow-card">
                <div className="relative h-24" style={{ background: `repeating-linear-gradient(135deg,${e.tile})` }}>
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 40%,rgba(0,0,0,.5))' }} />
                  <span className="absolute left-2.5 top-2.5 rounded-[9px] bg-white px-2.5 py-1 text-center shadow-cta-sm">
                    <span className="block text-[8px] font-extrabold text-pink-dark">{e.mon}</span>
                    <span className="block text-[16px] font-extrabold leading-none text-ink">{e.day}</span>
                  </span>
                  <span className="absolute right-2.5 top-2.5 rounded-[7px] px-2.5 py-1 text-[9px] font-extrabold" style={{ background: e.statusBg, color: e.statusC }}>{L(e.status[0], e.status[1])}</span>
                  <div className="absolute bottom-2.5 left-3">
                    <div className="text-[15px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{e.name}</div>
                    <div className="text-[10px] font-semibold text-white/85">{e.time} · {e.price}</div>
                  </div>
                </div>
                <div className="p-3.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-ink-2">{e.sold}/{e.cap} {L('vendidos', 'sold')}</span>
                    <span className="text-[10.5px] font-extrabold text-primary">{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-lilac-line">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barC }} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => goManage(e.id)} className="flex-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[11.5px] font-extrabold text-white shadow-cta-sm">{L('Gestionar', 'Manage')}</button>
                    <button onClick={() => goManage(e.id, 'checkin')} className="flex cursor-pointer items-center gap-1.5 rounded-btn border-[1.5px] border-lilac-line bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-ink">
                      <QrCode size={13} strokeWidth={2} className="text-primary-dark" />{L('Check-in', 'Check-in')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* desktop rail */}
      <div className="hidden flex-col gap-4 xl:sticky xl:top-[74px] xl:flex">
        <div className={`${cardCls} p-4`}>
          <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Este mes', 'This month')}</div>
          <div className="flex flex-col gap-2.5">
            {[
              { Icon: Ticket, c: '#6D4DF6', bg: '#F1EFFA', t: L('Boletos vendidos', 'Tickets sold'), r: '186' },
              { Icon: DollarSign, c: '#1F8A4C', bg: '#E3F5EA', t: L('Ingresos', 'Revenue'), r: '$14.2k' },
              { Icon: Users, c: '#2A5C8A', bg: '#E4ECFB', t: L('Asistentes', 'Attendees'), r: '212' },
              { Icon: RefreshCw, c: '#9A6A12', bg: '#FCEFD6', t: L('Recurrentes', 'Recurring'), r: '2' },
            ].map((s) => (
              <div key={s.t} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px]" style={{ background: s.bg }}>
                  <s.Icon size={15} strokeWidth={2.2} style={{ color: s.c }} />
                </span>
                <span className="flex-1 text-[12px] font-bold text-ink-soft">{s.t}</span>
                <span className="text-[13px] font-extrabold text-ink">{s.r}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-card-sm p-4 text-white shadow-band" style={{ background: 'linear-gradient(140deg,#6743E2,#8268FF)' }}>
          <div className="text-[13px] font-extrabold">💡 {L('Consejo', 'Tip')}</div>
          <div className="mt-1 text-[11.5px] font-semibold leading-snug text-white/85">
            {L('Invita promotores con un código: comparten tu evento y ganan comisión por boleto.', 'Invite promoters with a code: they share your event and earn commission per ticket.')}
          </div>
          <button onClick={() => setListTab('promoters')} className="mt-2.5 cursor-pointer rounded-[10px] bg-white px-3.5 py-2 text-[11.5px] font-extrabold text-primary-press">{L('Ver promotores', 'View promoters')}</button>
        </div>
      </div>
    </div>
  );

  // ---- Borradores ----
  const draftsView = (
    <div className="flex flex-col gap-4">
      <p className="text-[11.5px] font-medium leading-relaxed text-muted">{L('Termina de configurar antes de publicar. Cada evento necesita detalles, fecha, boletos y fotos.', 'Finish setup before publishing. Each needs details, date, tickets and photos.')}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {drafts.map((d) => {
          const done = d.ready.filter((r) => r[1]).length;
          const isReady = done === d.ready.length;
          return (
            <div key={d.name} className="overflow-hidden rounded-card-sm border border-hair bg-white shadow-card">
              <div className="relative h-20" style={{ background: `repeating-linear-gradient(135deg,${d.tile})` }}>
                <div className="absolute inset-0 bg-white/40" />
                <span className="absolute left-2.5 top-2.5 rounded-[7px] bg-amber-bg px-2.5 py-1 text-[9px] font-extrabold text-amber-ink">{L('Borrador', 'Draft')}</span>
                <span className="absolute right-2.5 top-2.5 rounded-[7px] px-2.5 py-1 text-[9px] font-extrabold" style={{ background: isReady ? '#E3F5EA' : '#F1EFFA', color: isReady ? '#1F8A4C' : '#9A96AE' }}>{done}/{d.ready.length} {L('listo', 'ready')}</span>
              </div>
              <div className="p-3.5">
                <div className="text-[14px] font-extrabold text-ink">{d.name}</div>
                <div className="mt-0.5 text-[11px] font-medium text-muted-2">{d.date} · {d.time} · {d.price}</div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {d.ready.map(([label, ok]) => (
                    <span key={label} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9.5px] font-bold" style={{ background: ok ? '#E3F5EA' : '#F7F6FC', color: ok ? '#1F8A4C' : '#9A96AE', borderColor: ok ? '#A7E3C0' : 'rgba(30,27,46,.08)' }}>
                      {ok ? '✓' : '○'} {label}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={startWizard} className="flex-1 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white py-2.5 text-[11.5px] font-extrabold text-ink">{L('Continuar', 'Continue')}</button>
                  <button
                    onClick={() => { if (isReady) { flash(L('Evento publicado', 'Event published')); setListTab('upcoming'); } else flash(L('Completa la lista para publicar', 'Complete the checklist to publish')); }}
                    className={`cursor-pointer rounded-btn px-4 py-2.5 text-[11.5px] font-extrabold text-white ${isReady ? 'bg-primary shadow-cta-sm' : 'bg-lilac-line'}`}
                  >
                    {L('Publicar', 'Publish')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ---- Pasados ----
  const pastView = (
    <div className="grid gap-2.5 md:grid-cols-2">
      {pastEvents.map((e) => (
        <div key={e.name} className="flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 opacity-90 shadow-card">
          <span className="h-12 w-12 flex-none rounded-[11px]" style={{ background: `repeating-linear-gradient(135deg,${e.tile})` }} />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-extrabold text-ink">{e.name}</div>
            <div className="mt-0.5 text-[10px] font-medium text-muted-2">{e.date} · {e.sold} {L('asistentes', 'attendees')}</div>
          </div>
          <div className="flex-none text-right">
            <div className="text-[13px] font-extrabold text-ink">{e.rev}</div>
            <div className="text-[9px] font-bold text-green">{e.rating} ★</div>
          </div>
        </div>
      ))}
    </div>
  );

  // ---- Recurrentes ----
  const recurringView = (
    <div className="flex flex-col gap-4">
      <p className="text-[11.5px] font-medium leading-relaxed text-muted">{L('Eventos que se repiten automáticamente en tu calendario.', 'Events that auto-repeat on your calendar.')}</p>
      <div className="grid gap-2.5 md:grid-cols-2">
        {recRaw.map((r, i) => {
          const on = recurState[i];
          return (
            <div key={r.name} className="flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 shadow-card" style={{ opacity: on ? 1 : 0.6 }}>
              <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[11px]" style={{ background: r.bg }}>
                <RefreshCw size={18} strokeWidth={2} style={{ color: r.c }} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-extrabold text-ink">{r.name}</div>
                <div className="mt-0.5 text-[10px] font-medium text-muted-2">{r.cadence} · {r.next}</div>
              </div>
              <Toggle on={on} onClick={() => setRecurState((s) => ({ ...s, [i]: !on }))} />
            </div>
          );
        })}
      </div>
      <button onClick={startWizard} className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 py-3 text-[12.5px] font-extrabold text-primary-dark">+ {L('Nuevo recurrente', 'New recurring')}</button>
    </div>
  );

  // ---- Promotores ----
  const promotersView = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-btn-lg bg-lilac-2 p-3">
        <Megaphone size={16} strokeWidth={2} className="flex-none text-primary-dark" />
        <div className="flex-1">
          <div className="text-[11.5px] font-extrabold text-ink">{L('Promotores y afiliados', 'Promoters & affiliates')}</div>
          <div className="mt-0.5 text-[10px] font-medium leading-snug text-ink-3">{L('Comparten un código y ganan comisión por boleto vendido.', 'They share a code and earn commission per ticket.')}</div>
        </div>
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {promoters.map((p) => (
          <div key={p.name} className="flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 shadow-card">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: p.color }}>{p.initials}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-extrabold text-ink">{p.name}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-muted-2">
                <span className="rounded bg-lilac-2 px-1.5 py-px font-extrabold text-primary-dark">{p.code}</span>
                <span>· {p.commission} {L('comisión', 'commission')}</span>
              </div>
            </div>
            <div className="flex-none text-right">
              <div className="text-[13px] font-extrabold text-ink">{p.sales}</div>
              <div className="text-[9px] font-bold text-muted-2">{p.sold} {L('vendidos', 'sold')}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => flash(L('Invitación de promotor enviada', 'Promoter invite sent'))} className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 py-3 text-[12.5px] font-extrabold text-primary-dark">+ {L('Invitar promotor', 'Invite promoter')}</button>
    </div>
  );

  const listBody = (
    <div className="pb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
          {listTabs.map(([k, label, n]) => (
            <button key={k} onClick={() => setListTab(k)} className={chip(listTab === k)}>
              {label}
              {n != null && <span className={`ml-1.5 font-extrabold ${listTab === k ? 'text-white/80' : 'text-muted-2'}`}>{n}</span>}
            </button>
          ))}
        </div>
        <button onClick={startWizard} className="hidden flex-none cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-3.5 py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm sm:flex">
          <Plus size={15} strokeWidth={2.6} />{L('Crear evento', 'Create event')}
        </button>
      </div>

      {listTab === 'upcoming' && upcomingView}
      {listTab === 'drafts' && draftsView}
      {listTab === 'past' && pastView}
      {listTab === 'recurring' && recurringView}
      {listTab === 'promoters' && promotersView}

      {/* mobile create button */}
      <button onClick={startWizard} className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[14px] font-extrabold text-white shadow-cta sm:hidden">
        <Plus size={16} strokeWidth={2.6} />{L('Crear evento', 'Create event')}
      </button>
    </div>
  );

  // ==================================================================
  // MANAGE DETAIL
  // ==================================================================
  const manageTabs: [ManageTab, string, number | null][] = [
    ['overview', L('Resumen', 'Overview'), null],
    ['attendees', L('Asistentes', 'Attendees'), mgEv.sold],
    ['checkin', L('Check-in', 'Check-in'), null],
    ['tickets', L('Boletos', 'Tickets'), null],
    ['settings', L('Ajustes', 'Settings'), null],
  ];

  const heroCard = (
    <div className="overflow-hidden rounded-card-sm border border-hair bg-white shadow-card">
      <div className="relative h-24" style={{ background: `repeating-linear-gradient(135deg,${mgEv.tile})` }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.5))' }} />
        <span className="absolute right-2.5 top-2.5 rounded-[7px] bg-green-bg px-2.5 py-1 text-[9px] font-extrabold text-green-dark">{L('Vendiendo', 'Selling')}</span>
        <div className="absolute bottom-2.5 left-3">
          <div className="text-[15px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{mgEv.name}</div>
          <div className="text-[10px] font-semibold text-white/85">{mgEv.time} · {mgEv.price}</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 p-3">
        {[
          { v: persistable ? `${ticketsSold}` : `${mgEv.sold}/${mgEv.cap}`, l: L('Vendidos', 'Sold') },
          { v: `$${(persistable ? ticketsRevenue : revenue).toLocaleString()}`, l: L('Ingresos', 'Revenue') },
          { v: persistable ? `${usedQty}/${ticketsSold}` : `${checkedInCount}/${mgEv.sold}`, l: L('Ingresaron', 'Checked in') },
          { v: persistable ? '—' : '3', l: L('Espera', 'Waitlist') },
        ].map((s) => (
          <div key={s.l} className="rounded-[10px] bg-lilac-3 px-1 py-2 text-center">
            <div className="text-[14px] font-extrabold text-ink">{s.v}</div>
            <div className="mt-0.5 text-[8.5px] font-semibold text-muted-2">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ---- Resumen ----
  const salesBars = [3, 5, 4, 8, 6, 12, 9, 14, 11, 18, 22, 16];
  const maxBar = Math.max(...salesBars);
  const overviewView = (
    <div className="grid items-start gap-3 xl:grid-cols-2">
      <div className={`${cardCls} p-3.5`}>
        <div className="mb-2.5 text-[12.5px] font-extrabold text-ink">{L('Ventas por nivel', 'Sales by tier')}</div>
        {displayTiers.length === 0 && <div className="py-3 text-[11.5px] font-semibold text-muted-2">{L('Aún no hay niveles de boleto.', 'No ticket tiers yet.')}</div>}
        {displayTiers.map((r) => (
          <div key={r.id} className="py-1.5">
            <div className="mb-1.5 flex justify-between">
              <span className="text-[11.5px] font-bold text-ink">{r.label} <span className="font-semibold text-muted-2">${r.priceN}</span></span>
              <span className="text-[11px] font-bold text-muted-2">{r.sold} · ${(r.sold * r.priceN).toLocaleString()}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-lilac-line">
              <div className="h-full rounded-full" style={{ width: `${Math.round((r.sold / maxTierSold) * 100)}%`, background: r.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className={`${cardCls} p-3.5`}>
        <div className="mb-2.5 text-[12.5px] font-extrabold text-ink">{L('Línea de ventas', 'Sales timeline')}</div>
        <div className="flex h-[70px] items-end gap-[5px]">
          {salesBars.map((v, i) => (
            <div key={i} className="flex-1 rounded-t-[4px]" style={{ height: `${Math.round((v / maxBar) * 60) + 6}px`, background: i === salesBars.length - 2 ? '#7B61FF' : '#D9CFF6' }} />
          ))}
        </div>
        <div className="mt-2 text-[9.5px] font-semibold text-muted-2">{L('Pico de ventas hace 2 días tras el email.', 'Sales peaked 2 days ago after the email.')}</div>
      </div>
    </div>
  );

  // ---- Asistentes ----
  const filteredAttendees = attendees.filter((a) => a.name.toLowerCase().includes(attendeeQuery.trim().toLowerCase()));
  const attendeesView = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 rounded-btn border border-hair bg-white px-3 py-2.5">
        <Search size={15} strokeWidth={2.2} className="text-muted-2" />
        <input value={attendeeQuery} onChange={(e) => setAttendeeQuery(e.target.value)} placeholder={L('Buscar asistentes…', 'Search attendees…')} className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-ink outline-none placeholder:text-muted-2" />
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {filteredAttendees.map((a) => {
          const inn = isCheckedIn(a);
          return (
            <div key={a.name} className="flex items-center gap-3 rounded-btn-lg border border-hair bg-white p-3">
              <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: a.color }}>{a.initials}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-extrabold text-ink">{a.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="rounded px-1.5 py-px text-[8px] font-extrabold" style={{ background: a.tierBg, color: a.tierC }}>{a.tier}</span>
                  {a.diet && <span className="text-[9px] font-semibold text-muted-2">{a.diet}</span>}
                </div>
              </div>
              <span className="flex-none rounded-md px-2 py-1 text-[9px] font-extrabold" style={{ background: inn ? '#E3F5EA' : '#F1EFFA', color: inn ? '#1F8A4C' : '#9A96AE' }}>{inn ? L('Ingresó', 'Checked in') : L('Confirmado', 'Going')}</span>
            </div>
          );
        })}
        {filteredAttendees.length === 0 && <div className="col-span-full py-8 text-center text-[12px] font-semibold text-muted">{L('Sin resultados', 'No results')}</div>}
      </div>
    </div>
  );

  // ---- Check-in ----
  const checkinBanner = checkinRes && (
    <div className={`mt-3 rounded-btn-lg px-3 py-2.5 text-left ${checkinRes.ok ? 'bg-[#123a26]' : checkinRes.already ? 'bg-[#3a3212]' : 'bg-[#3a1420]'}`}>
      <div className={`text-[13px] font-extrabold ${checkinRes.ok ? 'text-[#7BE0A8]' : checkinRes.already ? 'text-amber' : 'text-pink'}`}>
        {checkinRes.ok ? L('✓ Admitido', '✓ Admitted') : checkinRes.already ? L('Ya había ingresado', 'Already checked in') : checkinRes.msg === 'reembolsado' ? L('Boleto reembolsado', 'Ticket refunded') : L('Código no válido', 'Invalid code')}
      </div>
      {checkinRes.buyer && <div className="mt-0.5 text-[11px] font-semibold text-white/75">{checkinRes.buyer}{checkinRes.tier ? ` · ${checkinRes.tier}` : ''}{checkinRes.qty ? ` · ${checkinRes.qty} ${checkinRes.qty === 1 ? L('boleto', 'ticket') : L('boletos', 'tickets')}` : ''}</div>}
    </div>
  );
  const checkinView = persistable ? (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[320px_1fr]">
      <div className="rounded-card p-5" style={{ background: '#1E1B2E' }}>
        <div className="text-center text-[11px] font-extrabold uppercase tracking-[.06em] text-white/60">{L('Validar boleto', 'Validate ticket')}</div>
        <div className="mt-3 flex gap-2">
          <input
            value={checkinCode}
            onChange={(e) => setCheckinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') runCheckin(); }}
            placeholder={L('Código del boleto', 'Ticket code')}
            className="min-w-0 flex-1 rounded-btn bg-white/10 px-3 py-2.5 text-center font-mono text-[15px] font-extrabold uppercase tracking-[.14em] text-white outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-white/40 focus:bg-white/15"
          />
          <button onClick={runCheckin} disabled={checkinBusy || !checkinCode.trim()} className="flex-none cursor-pointer rounded-btn bg-primary px-4 py-2.5 text-[12px] font-extrabold text-white disabled:opacity-40">{L('Validar', 'Check')}</button>
        </div>
        {checkinBanner}
        <div className="mt-3 text-center text-[10.5px] font-semibold text-white/50">{L('El invitado muestra el código de su boleto (Mi cuenta → Mis boletos).', 'The guest shows the code from their ticket (My account → My tickets).')}</div>
        <div className="mt-4 flex justify-center gap-6 border-t border-white/10 pt-4">
          <div className="text-center"><div className="text-[18px] font-extrabold text-[#7BE0A8]">{usedQty}</div><div className="mt-0.5 text-[9px] font-semibold text-white/55">{L('Ingresaron', 'Checked in')}</div></div>
          <div className="text-center"><div className="text-[18px] font-extrabold text-white">{ticketsSold}</div><div className="mt-0.5 text-[9px] font-semibold text-white/55">{L('Vendidos', 'Sold')}</div></div>
          <div className="text-center"><div className="text-[18px] font-extrabold text-amber">{Math.max(0, ticketsSold - usedQty)}</div><div className="mt-0.5 text-[9px] font-semibold text-white/55">{L('Faltan', 'Remaining')}</div></div>
        </div>
      </div>
      <div>
        <div className="mb-2.5 px-0.5 text-[12px] font-extrabold text-ink">{L('Boletos', 'Tickets')} · {ticketsSold}</div>
        {(ticketRows ?? []).length === 0 ? (
          <div className="rounded-btn-lg border border-hair bg-white py-10 text-center text-[12px] font-semibold text-muted-2">{L('Aún no hay boletos vendidos.', 'No tickets sold yet.')}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {(ticketRows ?? []).map((t) => {
              const used = t.status === 'used';
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-btn-lg border border-hair bg-white p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-extrabold text-ink">{t.customer_name || L('Cliente', 'Customer')}</div>
                    <div className="mt-0.5 font-mono text-[10.5px] font-bold tracking-[.1em] text-muted-2">{t.code} · {t.qty} {t.qty === 1 ? L('boleto', 'ticket') : L('boletos', 'tickets')}</div>
                  </div>
                  <span className={`flex-none rounded-md px-2 py-1 text-[9px] font-extrabold ${used ? 'bg-green-bg text-green-dark' : 'bg-lilac-2 text-ink-2'}`}>{used ? L('Ingresó', 'In') : L('Válido', 'Valid')}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  ) : (
    // demo (not signed in): the sample scan design stays explorable
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[300px_1fr]">
      <div className="rounded-card p-5 text-center" style={{ background: '#1E1B2E' }}>
        <div className="text-[11px] font-extrabold uppercase tracking-[.06em] text-white/60">{L('Validar boleto', 'Validate ticket')}</div>
        <div className="mx-auto my-4 flex h-[180px] w-[180px] items-center justify-center rounded-tile bg-white p-3.5"><QrGrid /></div>
        <div className="text-[12px] font-bold text-white/80">{L('Inicia sesión con tu negocio para validar boletos reales.', 'Sign in with your business to validate real tickets.')}</div>
      </div>
      <div>
        <div className="mb-2.5 px-0.5 text-[12px] font-extrabold text-ink">{L('Lista de check-in', 'Check-in list')}</div>
        <div className="flex flex-col gap-2">
          {attendees.map((a) => {
            const inn = isCheckedIn(a);
            return (
              <div key={a.name} className="flex items-center gap-3 rounded-btn-lg border border-hair bg-white p-2.5">
                <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold text-white" style={{ background: a.color }}>{a.initials}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-extrabold text-ink">{a.name}</div>
                  <div className="mt-0.5 text-[9.5px] font-medium text-muted-2">{a.tier}{inn && ` · ${L('ingresó', 'checked in')}`}</div>
                </div>
                {inn ? (
                  <button onClick={() => setCheckedIn((s) => ({ ...s, [a.name]: false }))} className="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-full bg-green-bg" aria-label={L('Deshacer', 'Undo')}>
                    <Check size={13} strokeWidth={3} className="text-green" />
                  </button>
                ) : (
                  <button onClick={() => { setCheckedIn((s) => ({ ...s, [a.name]: true })); flash(L('Ingreso registrado', 'Checked in')); }} className="flex-none cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-[10px] font-extrabold text-white">{L('Ingresar', 'Check in')}</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ---- Boletos ----
  const tierInput = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[13px] font-bold text-ink outline-none focus:border-primary';
  const tierFormCard = (
    <div className="rounded-btn-lg border-[1.5px] border-primary bg-lilac-3 p-3.5">
      <div className="flex flex-col gap-2.5">
        <input value={tierForm.name} onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))} placeholder={L('Nombre (General, VIP…)', 'Name (General, VIP…)')} className={tierInput} />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-bold text-muted-2">{L('Precio $ · 0 = gratis', 'Price $ · 0 = free')}</label>
            <input value={tierForm.price} onChange={(e) => setTierForm((f) => ({ ...f, price: e.target.value.replace(/[^0-9.]/g, '') }))} inputMode="decimal" placeholder="0" className={tierInput} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-bold text-muted-2">{L('Cupo · vacío = sin límite', 'Capacity · blank = unlimited')}</label>
            <input value={tierForm.capacity} onChange={(e) => setTierForm((f) => ({ ...f, capacity: e.target.value.replace(/[^0-9]/g, '') }))} inputMode="numeric" placeholder="∞" className={tierInput} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={saveTier} disabled={tierBusy} className="flex-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[12px] font-extrabold text-white disabled:opacity-50">{tierBusy ? L('Guardando…', 'Saving…') : L('Guardar', 'Save')}</button>
        <button onClick={() => setTierEdit(null)} className="cursor-pointer rounded-btn border border-hair bg-white px-4 py-2.5 text-[12px] font-extrabold text-ink-soft">{L('Cancelar', 'Cancel')}</button>
        {tierEdit !== 'new' && tierEdit && <button onClick={() => deleteTier(tierEdit)} className="cursor-pointer rounded-btn bg-pink-bg px-4 py-2.5 text-[12px] font-extrabold text-pink-dark">{L('Eliminar', 'Remove')}</button>}
      </div>
    </div>
  );
  const ticketsView = (
    <div className="flex flex-col gap-3">
      {/* Real ticket sales bought by customers (event_tickets). Shows when the
          owner's event has at least one purchase; demo events show only tiers. */}
      {ticketRows && ticketRows.length > 0 && (
        <div className={`${cardCls} p-3.5`}>
          <div className="mb-2.5 flex items-center gap-2">
            <Ticket size={15} strokeWidth={2.2} className="text-primary-dark" />
            <span className="text-[12.5px] font-extrabold text-ink">{L('Boletos vendidos', 'Tickets sold')}</span>
            <span className="ml-auto text-[11px] font-bold text-muted-2">{ticketsSold} · ${ticketsRevenue.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-2">
            {ticketRows.map((t) => {
              const st = TICKET_STATUS[t.status] ?? TICKET_STATUS.confirmed;
              return (
                <div key={t.id} className="flex items-center gap-2.5 border-t border-hair pt-2 first:border-0 first:pt-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-extrabold text-ink">{t.customer_name || L('Cliente', 'Customer')}</span>
                    <span className="block truncate text-[10px] font-semibold text-muted-2">{t.qty} {t.qty === 1 ? L('boleto', 'ticket') : L('boletos', 'tickets')} · {L('código', 'code')} {t.code}</span>
                  </span>
                  {t.total != null && Number(t.total) > 0 && <span className="flex-none text-[12px] font-extrabold text-ink">${Number(t.total).toLocaleString()}</span>}
                  <span className={`flex-none rounded-md px-2 py-1 text-[9px] font-extrabold ${st.cls}`}>{L(st.es, st.en)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid gap-2.5 md:grid-cols-2">
        {displayTiers.map((tk) => {
          if (realTiers && tierEdit === tk.id) return <div key={tk.id}>{tierFormCard}</div>;
          const pct = tk.unlimited ? 0 : Math.round((tk.sold / Math.max(tk.cap, 1)) * 100);
          return (
            <div key={tk.id} className="rounded-btn-lg border border-hair bg-white p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: tk.color }} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-ink">{tk.label}</span>
                <span className="flex-none text-[13px] font-extrabold text-ink">{tk.priceN > 0 ? `$${tk.priceN}` : L('Gratis', 'Free')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-lilac-line">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tk.color }} />
                </div>
                <span className="whitespace-nowrap text-[10px] font-bold text-muted-2">{tk.unlimited ? `${tk.sold} · ${L('sin límite', 'unlimited')}` : `${tk.sold}/${tk.cap}`}</span>
              </div>
              {realTiers && tk.tier && (
                <div className="mt-2.5 flex gap-2 border-t border-hair pt-2.5">
                  <button onClick={() => openTierEdit(tk.tier)} className="cursor-pointer text-[11px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
                  <button onClick={() => deleteTier(tk.id)} className="ml-auto cursor-pointer text-[11px] font-extrabold text-pink-dark">{L('Eliminar', 'Remove')}</button>
                </div>
              )}
            </div>
          );
        })}
        {realTiers && tierEdit === 'new' && <div>{tierFormCard}</div>}
      </div>
      {(!realTiers || tierEdit !== 'new') && (
        <button
          onClick={() => (realTiers ? openTierEdit(null) : flash(L('Inicia sesión con tu negocio para crear niveles', 'Sign in with your business to create tiers')))}
          className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 py-3 text-[12.5px] font-extrabold text-primary-dark"
        >
          + {L('Agregar nivel', 'Add tier')}
        </button>
      )}
    </div>
  );

  // ---- Ajustes ----
  const settingsRows: [string, string][] = [
    [L('Lista de espera', 'Waitlist'), L('Acepta inscritos cuando se llene.', 'Accept signups when full.')],
    [L('Transferir boletos', 'Allow transfers'), L('Los invitados pueden ceder su boleto.', 'Guests can transfer their ticket.')],
    [L('Recordatorio 24h', '24h reminder'), L('Email y push antes del evento.', 'Email + push before the event.')],
    [L('Reembolsos', 'Refunds'), L('Hasta 48h antes del evento.', 'Up to 48h before the event.')],
    [L('Mostrar asistentes', 'Show attendee count'), L('Visible en la página pública.', 'Visible on the public page.')],
  ];
  const settingsView = (
    <div className="flex flex-col gap-4">
      <div className={`${cardCls} px-3.5`}>
        {settingsRows.map(([title, sub], i) => (
          <div key={title} className={`flex items-center justify-between gap-3 py-3 ${i < settingsRows.length - 1 ? 'border-b border-hair' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold text-ink">{title}</div>
              <div className="mt-0.5 text-[10px] font-medium leading-snug text-muted-2">{sub}</div>
            </div>
            <Toggle on={!!settingState[i]} onClick={() => setSettingState((s) => ({ ...s, [i]: !s[i] }))} />
          </div>
        ))}
      </div>
      <button
        onClick={() => {
          // Real owner → delete the event row; demo → local flash only (unchanged).
          if (persistable && mgEv.dbId && supabase) {
            void supabase.from('events').delete().eq('id', mgEv.dbId).then(() => {
              setEvents((xs) => xs.filter((x) => x.id !== mgEv.id));
              flash(L('Evento cancelado', 'Event cancelled'));
              setView('list');
            });
          } else {
            flash(L('Evento cancelado', 'Event cancelled'));
          }
        }}
        className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-pink-bg bg-white py-3 text-[12.5px] font-extrabold text-pink-dark"
      >{L('Cancelar evento', 'Cancel event')}</button>
    </div>
  );

  const managePage = (
    <ModulePage
      title={mgEv.name}
      subtitle={L('Gestionar evento', 'Manage event')}
      onBack={() => setView('list')}
      maxW={940}
    >
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 min-w-0 overflow-x-auto px-1">
        {manageTabs.map(([k, label, n]) => (
          <button key={k} onClick={() => setManageTab(k)} className={chip(manageTab === k)}>
            {label}
            {n != null && <span className={`ml-1.5 font-extrabold ${manageTab === k ? 'text-white/80' : 'text-muted-2'}`}>{n}</span>}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[320px_1fr]">
        <div className="xl:sticky xl:top-0">{heroCard}</div>
        <div>
          {manageTab === 'overview' && overviewView}
          {manageTab === 'attendees' && attendeesView}
          {manageTab === 'checkin' && checkinView}
          {manageTab === 'tickets' && ticketsView}
          {manageTab === 'settings' && settingsView}
        </div>
      </div>
    </ModulePage>
  );

  // ==================================================================
  // WIZARD — Detalles → Boletos → Fecha/lugar → Revisar
  // ==================================================================
  const upD = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const typeTiles: Record<string, string> = { clase: '#F3E2CE 0 9px,#ECD3B4 9px 18px', cata: '#F3D9E2 0 9px,#E8BFCD 9px 18px', cena: '#FCE3DC 0 9px,#F6CEC2 9px 18px', musica: '#E4ECFB 0 9px,#D7E3F6 9px 18px' };
  const draftTile = typeTiles[draft.type] || typeTiles.clase;
  const typeDefs: [string, string][] = [['clase', L('Clase/Taller', 'Class/Workshop')], ['cata', L('Cata', 'Tasting')], ['cena', L('Cena', 'Dinner')], ['musica', L('Música', 'Music')]];
  const typeLabel = (typeDefs.find((x) => x[0] === draft.type) || typeDefs[0])[1];
  const wizStepDefs: [string, string][] = [['details', L('Detalles', 'Details')], ['tickets', L('Boletos', 'Tickets')], ['dateloc', L('Fecha/lugar', 'Date/place')], ['review', L('Revisar', 'Review')]];

  const visDefs: [string, string][] = [['public', L('Público', 'Public')], ['followers', L('Seguidores', 'Followers first')], ['unlisted', L('No listado', 'Unlisted')]];
  const eReady = !!(draft.name && draft.date);

  const fieldCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary';
  const labelCls = 'mb-1.5 block text-[11px] font-extrabold text-ink-soft';

  const wizStep0 = (
    <div className="flex flex-col gap-3.5">
      <div>
        <label className={labelCls}>{L('Nombre del evento', 'Event name')} *</label>
        <input value={draft.name} onChange={(e) => upD({ name: e.target.value })} placeholder={L('Ej. Cena de Fin de Año', "e.g. New Year's Eve Dinner")} className={fieldCls} />
      </div>
      <div>
        <label className={labelCls}>{L('Descripción', 'Description')}</label>
        <textarea value={draft.desc} onChange={(e) => upD({ desc: e.target.value })} rows={3} placeholder={L('Qué incluye, quién presenta, qué esperar…', "What's included, who hosts, what to expect…")} className={`${fieldCls} resize-none text-[12px] font-medium leading-relaxed`} />
      </div>
      <div>
        <label className={labelCls}>{L('Tipo de evento', 'Event type')} *</label>
        <div className="no-scrollbar flex gap-2 min-w-0 overflow-x-auto pb-0.5">
          {typeDefs.map(([k, lab]) => <button key={k} onClick={() => upD({ type: k })} className={chip(draft.type === k)}>{lab}</button>)}
        </div>
      </div>
    </div>
  );

  const wizStep1 = (
    <div className="flex flex-col gap-3.5">
      <p className="text-[11px] font-medium leading-relaxed text-muted">{L('Crea el boleto de entrada general. Podrás agregar niveles (VIP, pareja…) y ajustar cupos después en Boletos.', 'Create the general-admission ticket. You can add tiers (VIP, pair…) and adjust capacity later in Tickets.')}</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelCls}>{L('Precio $', 'Price $')}</label>
          <input value={draft.price} onChange={(e) => upD({ price: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder={L('0 = gratis', '0 = free')} className={fieldCls} />
        </div>
        <div className="flex-1">
          <label className={labelCls}>{L('Cupo', 'Capacity')}</label>
          <input value={draft.capacity} onChange={(e) => upD({ capacity: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder={L('∞ sin límite', '∞ unlimited')} className={fieldCls} />
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-btn border border-hair bg-lilac-3 p-3">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-lilac"><Ticket size={15} strokeWidth={2} className="text-primary-dark" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-extrabold text-ink">{L('Entrada general', 'General admission')}</div>
          <div className="mt-0.5 text-[10px] font-medium text-muted-2">{draft.capacity ? `${draft.capacity} ${L('lugares', 'spots')}` : L('Sin límite', 'Unlimited')}</div>
        </div>
        <span className="text-[13px] font-extrabold text-ink">{Number(draft.price) > 0 ? `$${draft.price}` : L('Gratis', 'Free')}</span>
      </div>
    </div>
  );

  const wizStep2 = (
    <div className="flex flex-col gap-3.5">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelCls}>{L('Fecha', 'Date')} *</label>
          <input value={draft.date} onChange={(e) => upD({ date: e.target.value })} placeholder={L('31 dic 2025', 'Dec 31, 2025')} className={fieldCls} />
        </div>
        <div className="flex-1">
          <label className={labelCls}>{L('Hora', 'Time')}</label>
          <input value={draft.time} onChange={(e) => upD({ time: e.target.value })} placeholder="8 PM" className={fieldCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>{L('Ubicación', 'Location')}</label>
        <div className="flex items-center gap-2 rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 focus-within:border-primary">
          <MapPin size={15} strokeWidth={2.2} className="text-muted-2" />
          <input value={draft.location} onChange={(e) => upD({ location: e.target.value })} placeholder={L('En tu negocio o dirección', 'At your venue or address')} className="min-w-0 flex-1 bg-transparent py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted-2" />
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-field border border-hair bg-lilac-3 p-3">
        <div className="flex-1">
          <div className="text-[12.5px] font-bold text-ink">{L('¿Se repite?', 'Recurring?')}</div>
          <div className="mt-0.5 text-[10px] font-medium leading-snug text-muted-2">{L('Crea una serie semanal o mensual.', 'Create a weekly or monthly series.')}</div>
        </div>
        <Toggle on={draft.recurring} onClick={() => upD({ recurring: !draft.recurring })} />
      </div>
    </div>
  );

  const reviewRows: [string, string, boolean, number][] = [
    [L('Nombre', 'Name'), draft.name || '—', !!draft.name, 0],
    [L('Tipo', 'Type'), typeLabel, true, 0],
    [L('Boletos', 'Tickets'), `2 ${L('niveles · 48 lugares', 'tiers · 48 spots')}`, true, 1],
    [L('Fecha', 'Date'), draft.date ? draft.date + (draft.time ? ` · ${draft.time}` : '') : '—', !!draft.date, 2],
    [L('Ubicación', 'Location'), draft.location || L('Tu negocio', 'Your venue'), true, 2],
  ];
  const wizStep3 = (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3 rounded-field border p-3" style={{ background: eReady ? '#E3F5EA' : '#FCEFD6', borderColor: eReady ? '#A7E3C0' : '#FDE68A' }}>
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-white text-[14px] font-extrabold" style={{ color: eReady ? '#176B3A' : '#9A6A12' }}>{eReady ? '✓' : '⚠'}</span>
        <div className="flex-1">
          <div className="text-[12px] font-extrabold" style={{ color: eReady ? '#176B3A' : '#9A6A12' }}>{eReady ? L('Listo para publicar', 'Ready to publish') : L('Faltan datos', 'A few essentials missing')}</div>
          <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-ink-3">{eReady ? L('Los boletos se abren al publicar.', 'Tickets open when you publish.') : L('Agrega nombre y fecha antes de publicar.', 'Add a name and date before publishing.')}</div>
        </div>
      </div>
      <div className="overflow-hidden rounded-field border border-hair">
        {reviewRows.map(([k, v, ok, step], i) => (
          <div key={k} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < reviewRows.length - 1 ? 'border-b border-hair' : ''}`}>
            <span className="w-[74px] flex-none text-[10.5px] font-semibold text-muted-2">{k}</span>
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold" style={{ color: ok ? '#1E1B2E' : '#C0BBD0' }}>{v}</span>
            <button onClick={() => setWizStep(step)} className="flex-none cursor-pointer text-[10.5px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
          </div>
        ))}
      </div>
      <div>
        <label className={labelCls}>{L('Visibilidad', 'Visibility')}</label>
        <div className="no-scrollbar flex gap-2 min-w-0 overflow-x-auto">
          {visDefs.map(([k, lab]) => <button key={k} onClick={() => upD({ vis: k })} className={chip(draft.vis === k)}>{lab}</button>)}
        </div>
      </div>
    </div>
  );

  const wizTitles = [L('Detalles del evento', 'Event details'), L('Niveles de boleto', 'Ticket tiers'), L('Fecha y ubicación', 'Date & location'), L('Revisar y publicar', 'Review & publish')];

  const nextId = () => (events.length ? Math.max(...events.map((e) => e.id)) : 0) + 1;

  // Turn the wizard draft into a live event: optimistic local add always, plus a
  // real `create_event` RPC when a signed-in owner is present (demo = local only).
  const addFromDraft = () => {
    const d0 = new Date(draft.date); // date is free-text; best-effort parse
    const startsAt = Number.isNaN(d0.getTime()) ? new Date().toISOString() : d0.toISOString();
    const sd = new Date(startsAt);
    const [tileA, tileB] = draftTile.split(',').map((s) => s.trim().split(' ')[0]);
    const priceN = Number(draft.price) || 0;
    const priceLabel = priceN > 0 ? '$' + priceN : null; // null = free on the card
    const capN = draft.capacity.trim() === '' ? null : Math.max(0, Number(draft.capacity) || 0);
    const pCat = EVENT_CAT_MAP[draft.type] ?? 'familia';
    const local: EventRow = {
      id: nextId(),
      name: draft.name.trim() || L('Nuevo evento', 'New event'),
      mon: (es ? MON_ES : MON_EN)[sd.getMonth()],
      day: String(sd.getDate()).padStart(2, '0'),
      time: draft.time || fmtTime(sd),
      price: priceLabel ?? L('Gratis', 'Free'),
      priceN,
      sold: 0,
      cap: capN ?? 48,
      tile: draftTile,
      status: ['Vendiendo', 'Selling'],
      statusBg: '#E3F5EA',
      statusC: '#1F8A4C',
    };
    setEvents((xs) => [local, ...xs]);
    if (persistable && real && user && supabase) {
      (async () => {
        const { data: slug, error } = await supabase!.rpc('create_event', {
          p_title_es: draft.name.trim(),
          p_title_en: draft.name.trim(),
          p_venue_es: draft.location || '',
          p_venue_en: draft.location || '',
          p_cat: pCat,
          p_starts_at: startsAt,
          p_time_label_es: draft.time || '',
          p_time_label_en: draft.time || '',
          p_price_label: priceLabel,
          p_desc_es: draft.desc || '',
          p_desc_en: draft.desc || '',
          p_city: real.city || '',
          p_tile_a: tileA,
          p_tile_b: tileB,
          p_lat: null,
          p_lng: null,
        });
        // Give the new event a real "Entrada general" tier from the wizard's price so
        // it's immediately sellable (the owner adds VIP/etc. tiers in Boletos).
        if (!error && slug) {
          const { data: ev } = await supabase!.from('events').select('id').eq('slug', String(slug)).maybeSingle();
          const evId = (ev as { id: string } | null)?.id;
          if (evId) await supabase!.from('event_tiers').insert({ event_id: evId, name_es: 'Entrada general', name_en: 'General admission', price: priceN, capacity: capN, sort: 0 });
        }
        // Reconcile with the DB truth (real slug/id/going_count; backfills dbId).
        if (!error) { const rows = await fetchEvents(user.id); setEvents(rows); }
      })();
    }
  };

  const wizNext = () => {
    if (wizStep >= wizStepDefs.length - 1) { addFromDraft(); setView('success'); return; }
    const n = wizStep + 1; setWizStep(n); setWizMax((m) => Math.max(m, n));
  };
  const wizBack = () => { if (wizStep === 0) { setView('list'); return; } setWizStep((s) => s - 1); };

  const wizardPage = (
    <ModulePage
      title={L('Crear evento', 'Create event')}
      subtitle={`${typeLabel} · ${L('Paso ', 'Step ')}${wizStep + 1}${L(' de ', ' of ')}${wizStepDefs.length}`}
      onBack={() => setView('list')}
      backLabel={L('Cancelar', 'Cancel')}
      maxW={940}
      footer={
        <div className="flex items-center gap-3">
          <button onClick={wizBack} className="flex-none cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3.5 text-[12.5px] font-extrabold text-ink">
            {wizStep === 0 ? L('Cancelar', 'Cancel') : L('Atrás', 'Back')}
          </button>
          <button onClick={wizNext} className="flex-1 cursor-pointer rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta">
            {wizStep >= wizStepDefs.length - 1 ? L('Publicar evento', 'Publish event') : L('Continuar', 'Continue')}
          </button>
        </div>
      }
    >
      <div className="no-scrollbar mb-4 flex gap-2 min-w-0 overflow-x-auto pb-0.5">
        {wizStepDefs.map(([, label], i) => {
          const active = wizStep === i, done = i < wizStep || (i <= wizMax && i !== wizStep);
          return (
            <button key={i} onClick={() => { if (i <= wizMax) setWizStep(i); }} className="flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold" style={{ background: active ? '#7B61FF' : done ? '#EFEBFF' : '#F1EFFA', color: active ? '#fff' : done ? '#6D4DF6' : '#9A96AE' }}>
              <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white" style={{ background: active ? 'rgba(255,255,255,.25)' : done ? '#7B61FF' : '#D8D2E6' }}>{done ? '✓' : i + 1}</span>
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[300px_1fr]">
        <div className="overflow-hidden rounded-card-sm border border-hair bg-white shadow-card xl:sticky xl:top-0">
          <div className="relative h-24" style={{ background: `repeating-linear-gradient(135deg,${draftTile})` }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.45))' }} />
            <div className="absolute bottom-2.5 left-3">
              <div className="text-[14px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{draft.name || L('Nombre del evento', 'Event name')}</div>
              <div className="text-[10px] font-semibold text-white/85">{(draft.date || L('Fecha por definir', 'Date TBD'))}{draft.time ? ` · ${draft.time}` : ''}</div>
            </div>
          </div>
          <div className="p-3 text-[10.5px] font-semibold text-muted-2">{L('Vista previa · así se verá tu evento', 'Preview · how your event will look')}</div>
        </div>

        <div className={`${cardCls} p-4`}>
          <div className="mb-3.5 text-[13.5px] font-extrabold text-ink">{wizTitles[wizStep]}</div>
          {wizStep === 0 && wizStep0}
          {wizStep === 1 && wizStep1}
          {wizStep === 2 && wizStep2}
          {wizStep === 3 && wizStep3}
        </div>
      </div>
    </ModulePage>
  );

  // ==================================================================
  // SUCCESS
  // ==================================================================
  const successPage = (
    <ModulePage title={L('¡Publicado!', 'Published!')} onBack={() => { setView('list'); setListTab('upcoming'); }}>
    <div className="flex flex-col items-center px-2 pb-8 pt-6 text-center">
      <div className="mb-3.5 flex h-16 w-16 items-center justify-center rounded-card bg-green-bg">
        <Check size={32} strokeWidth={2.6} className="text-green" />
      </div>
      <div className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{(draft.name || L('Nuevo evento', 'New event'))} {L('está activo', 'is live')}</div>
      <div className="mt-2 max-w-[320px] text-[13px] font-medium leading-relaxed text-muted">{L('Los boletos están a la venta y el evento aparece en tu listado.', 'Tickets are on sale and the event is on your listing.')}</div>

      <div className="mt-5 w-full max-w-[420px] overflow-hidden rounded-card-sm border border-hair bg-white text-left shadow-card">
        <div className="relative h-[104px]" style={{ background: `repeating-linear-gradient(135deg,${draftTile})` }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.45))' }} />
          <div className="absolute bottom-2.5 left-3 text-[15px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{draft.name || L('Nuevo evento', 'New event')}</div>
        </div>
        <div className="flex items-center justify-between p-3.5">
          <div className="text-[11.5px] font-medium text-muted-2">{(draft.date || L('Fecha por definir', 'Date TBD'))}{draft.time ? ` · ${draft.time}` : ''}</div>
          <span className="flex-none rounded-lg bg-green-bg px-3 py-1.5 text-[10.5px] font-extrabold text-green-dark">{L('En venta', 'On sale')}</span>
        </div>
      </div>

      <div className="mt-5 flex w-full max-w-[420px] flex-col gap-2.5">
        <button onClick={() => { flash(L('Enlace del evento copiado', 'Event link copied')); }} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta">
          <Share2 size={16} strokeWidth={2.4} />{L('Compartir evento', 'Share event')}
        </button>
        <button onClick={() => { setView('list'); setListTab('upcoming'); }} className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3.5 text-[13.5px] font-extrabold text-ink">{L('Volver a eventos', 'Back to events')}</button>
      </div>
    </div>
    </ModulePage>
  );

  // ---------- render ----------
  // Manage detail, the add-event wizard and the success screen each take over
  // the viewport as a dedicated full-screen page (no cramped in-flow views).
  if (view === 'manage') return <>{managePage}<Toast msg={toast} /></>;
  if (view === 'wizard') return <>{wizardPage}<Toast msg={toast} /></>;
  if (view === 'success') return <>{successPage}<Toast msg={toast} /></>;

  return (
    <div className="relative">
      {isFree && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card-sm bg-amber-bg p-4">
          <span className="text-[20px]">🎟️</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold text-ink">{L('Eventos y boletos es parte del plan Verified.', 'Events & tickets is part of the Verified plan.')}</span>
            <span className="block text-[11.5px] font-semibold text-amber-ink">{L('Estás viendo una vista previa. Verifica tu negocio para vender boletos.', "You're viewing a preview. Verify your business to sell tickets.")}</span>
          </span>
          <button onClick={() => ctx.go('billing')} className="flex-none cursor-pointer rounded-[10px] bg-ink px-3.5 py-2 text-[12px] font-extrabold text-white">{L('Verificar', 'Verify')}</button>
        </div>
      )}

      {listBody}

      {isPremium && listTab === 'upcoming' && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card-sm p-4 text-white shadow-band" style={{ background: 'linear-gradient(140deg,#1E1B2E,#3A2E6E)' }}>
          <TrendingUp size={20} className="flex-none text-amber" />
          <span className="min-w-0 flex-1 text-[12px] font-semibold leading-snug text-white/80">{L('Tus eventos aparecen destacados en el feed de descubrimiento con Premium.', 'Your events get featured placement in the discovery feed with Premium.')}</span>
        </div>
      )}

      <Toast msg={toast} />
    </div>
  );
}

function newDraft(): EventDraft {
  return { name: '', desc: '', type: 'clase', date: '', time: '', location: '', price: '', capacity: '', recurring: false, vis: 'public' };
}

// Deterministic faux-QR grid (matches the prototype's check-in card).
function QrGrid() {
  const n = 11;
  const seed = new Set([0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 21, 23, 24, 26, 28, 30, 33, 35, 36, 38, 40, 42, 44, 47, 49, 51, 53, 55, 56, 58, 60, 62, 64, 66, 68, 70, 73, 75, 77, 79, 81, 83, 86, 88, 90, 92, 95, 97, 99, 101, 103, 105, 108, 110, 113, 115, 117, 119]);
  return (
    <div className="grid h-full w-full gap-[2px]" style={{ gridTemplateColumns: `repeat(${n},1fr)`, gridTemplateRows: `repeat(${n},1fr)` }}>
      {Array.from({ length: n * n }, (_, i) => (
        <span key={i} className="rounded-[1px]" style={{ background: seed.has(i) || i % 7 === 0 || i % 5 === 2 ? '#1E1B2E' : 'transparent' }} />
      ))}
    </div>
  );
}
