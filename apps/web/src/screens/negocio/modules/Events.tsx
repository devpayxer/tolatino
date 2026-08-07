'use client';

// Eventos y boletos / Events module (business dashboard). Ported from the
// Handoff v2 "Events Module" prototype. Three nested surfaces driven by real
// state: (1) the LIST with sub-tabs Próximos/Borradores/Pasados/Recurrentes/
// Promotores; (2) a MANAGE DETAIL view (hero stats + Resumen/Asistentes/
// Check-in/Boletos/Ajustes, with a QR + live check-in toggles); (3) a 4-step
// "add event" wizard (Detalles → Boletos → Fecha/lugar → Revisar) ending in a
// success screen. Mobile-first single column; on desktop the list gains a
// sticky rail and the manage/wizard panels widen into multi-column layouts.

import { useEffect, useMemo, useRef, useState } from 'react';
import { imgUrl, ANCHO } from '@/lib/img';
import { IconCheck as Check, IconCurrencyDollar as DollarSign, IconPhotoPlus as ImagePlus, IconMapPin as MapPin, IconSpeakerphone as Megaphone, IconNavigation as Navigation, IconPlus as Plus, IconQrcode as QrCode, IconRefresh as RefreshCw, IconSearch as Search, IconShare2 as Share2, IconTag as Tag, IconTicket as Ticket, IconTrash as Trash2, IconTrendingUp as TrendingUp, IconUsers as Users, IconX as X } from '@tabler/icons-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { escribir } from '@/lib/escribir';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useUrlTab } from '@/lib/urlView';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/state';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image';
import { searchAddress, censusGeocode, sameAddress, type Address } from '@/lib/geo';
import { EVENT_CATS, EVENT_CAT_BY_ID } from '@/data/fixtures';
import { Qr } from '@/components/Qr';
import { SectionTabs, type SectionTab } from '@/components/SectionTabs';
import { QrScanner, useBarcodeSupport } from '@/components/QrScanner';

const cardCls = 'rounded-card-sm border border-line bg-white ';

type View = 'list' | 'manage' | 'wizard' | 'success';
type ListTab = 'upcoming' | 'drafts' | 'past' | 'recurring' | 'promoters';
type ManageTab = 'overview' | 'attendees' | 'checkin' | 'tickets' | 'waitlist' | 'settings';

type EventRow = {
  id: number; dbId?: string; name: string; mon: string; day: string; time: string; price: string;
  priceN: number; sold: number; cap: number; tile: string; status: [string, string];
  statusBg: string; statusC: string; lifecycle?: string; startsMs?: number;
};

// A row from the public `events` table (migration 0002 + 0022), the columns the
// dashboard reads for the owner's own events.
type EventDbRow = {
  id: string; slug: string; title_es: string; title_en: string;
  venue_es: string | null; venue_en: string | null; cat: string; city: string;
  starts_at: string; time_label_es: string | null; time_label_en: string | null;
  price_label: string | null; going_count: number; desc_es: string | null; desc_en: string | null;
  tile_a: string | null; tile_b: string | null; status: string | null;
};

// A ticket a customer bought for this event (event_tickets) — the other side of
// the consumer's "Comprar boletos" action. customer_name is stored on insert.
type TicketRow = {
  id: string; customer_name: string | null; qty: number; admitted: number; total: number | null; code: string; status: string; created_at: string;
};
type EventTier = {
  id: string; name_es: string; name_en: string; price: number; capacity: number | null; sold: number; sort: number; visible: boolean; seat?: boolean;
};
const TICKET_STATUS: Record<string, { es: string; en: string; cls: string }> = {
  confirmed: { es: 'Confirmado', en: 'Confirmed', cls: 'bg-green-bg text-green-dark' },
  used:      { es: 'Usado',      en: 'Used',      cls: 'bg-lilac-2 text-ink-2' },
  refunded:  { es: 'Reembolsado', en: 'Refunded', cls: 'bg-lilac-2 text-ink-2' },
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
type EventTierDraft = { id: string; name: string; price: string; capacity: string; seat?: boolean };
type TableDraft = { id: string; cap: string; photo: string };
type AddonDraft = { id: string; es: string; price: string; required: boolean; seatedOnly: boolean };
type EventDraft = {
  name: string; desc: string; cat: string; coverUrl: string;
  date: string; startTime: string; endTime: string; online: boolean;
  venue: string; lat: number | null; lng: number | null;
  tiers: EventTierDraft[]; vis: string;
  // Seating (0113/0115): 'none' = general admission; 'seats' = numbered grid;
  // 'tables' = a list of tables (each with capacity + optional photo).
  seating: 'none' | 'seats' | 'tables'; seatRows: string; seatCols: string; tables: TableDraft[];
  addons: AddonDraft[];              // table packages (optional / mandatory)
  age: string; includes: string;    // key detail extras (attrs)
};
let tierSeq = 0;
const nextTid = () => 't' + (++tierSeq);
let subSeq = 0;
const nextSub = () => 's' + (++subSeq);

// Mirror of Panel.tsx's LISTING_ONLY default so publishing an event can flip the
// `events` module on while writing the FULL explicit module object (founder
// gating rule: never leave sibling modules absent, which reads as "off").
const LISTING_ONLY_MODS = { menu: false, services: false, bookings: false, products: false, rental: false, events: false, inmuebles: false, vehiculos: false, updates: true, staff: true };

export function EventsModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es, isFree, isPremium, ci } = ctx;
  void tab;

  // ---------- state ----------
  const [view, setView] = useState<View>('list');
  // Events list sub-tab mirrored to ?sub= (refresh-safe; Panel clears on switch).
  const [listTab, setListTab] = useUrlTab<ListTab>('sub', 'upcoming', (v) => ['upcoming', 'drafts', 'past', 'recurring', 'promoters'].includes(v));
  const [manageTab, setManageTab] = useState<ManageTab>('overview');
  const [manageId, setManageId] = useState(1);
  const [checkedIn, setCheckedIn] = useState<Record<string, boolean>>({});
  const [askCancel, setAskCancel] = useState(false); // two-step confirm for "Cancelar evento"
  const [cancelBusy, setCancelBusy] = useState(false);
  const [attendeeQuery, setAttendeeQuery] = useState('');
  const [ticketRows, setTicketRows] = useState<TicketRow[] | null>(null);
  // «No cargó» no es «no tienes». (Auditoría de Negocios, 2026-08-04.)
  const [falloEventos, setFalloEventos] = useState(false);
  const [wizStep, setWizStep] = useState(0);
  const [wizMax, setWizMax] = useState(0);
  const [wizBusy, setWizBusy] = useState(false); // publishing in flight (blocks double-submit)
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
  const app = useApp();

  // ---------- wizard: address autocomplete + cover upload state ----------
  const [addrResults, setAddrResults] = useState<Address[]>([]);
  const [addrSearching, setAddrSearching] = useState(false);
  const addrAbort = useRef<AbortController | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const pickedRef = useRef(false); // guards the address effect from re-searching after a pick

  // ---------- seed data (DEMO sample events) ----------
  const seedEvents = useMemo<EventRow[]>(() => [
    { id: 1, name: L('Cena de Halloween', 'Halloween Dinner'), mon: 'OCT', day: '31', time: '7 PM', price: '$140', priceN: 140, sold: 32, cap: 48, tile: '#FCE3DC 0 9px,#F6CEC2 9px 18px', status: [es ? 'Vendiendo' : 'Selling', 'Selling'], statusBg: '#E3F5EA', statusC: '#1F8A4C' },
    { id: 2, name: 'Sourdough 101', mon: 'NOV', day: '08', time: '10 AM', price: '$85', priceN: 85, sold: 14, cap: 16, tile: '#F3E2CE 0 9px,#ECD3B4 9px 18px', status: [es ? 'Casi lleno' : 'Almost full', 'Almost full'], statusBg: '#FCEFD6', statusC: '#9A6A12' },
    { id: 3, name: L('Cata de vinos', 'Wine Tasting'), mon: 'NOV', day: '15', time: '6 PM', price: '$45', priceN: 45, sold: 22, cap: 30, tile: '#F3D9E2 0 9px,#E8BFCD 9px 18px', status: [es ? 'Vendiendo' : 'Selling', 'Selling'], statusBg: '#E3F5EA', statusC: '#1F8A4C' },
    { id: 4, name: L('Noche de Lotería', 'Lotería Night'), mon: 'NOV', day: '22', time: '5 PM', price: '$10', priceN: 10, sold: 14, cap: 16, tile: '#EAE2F8 0 9px,#DCCEF2 9px 18px', status: [es ? 'Vendiendo' : 'Selling', 'Selling'], statusBg: '#E3F5EA', statusC: '#1F8A4C' },
  ], [es, L]);

    // El estado inicial NO puede ser de ejemplo: se pinta antes de saber si
  // hay negocio real, así que un dueño ve un instante el catálogo de otro.
  // Quien decide es el cargador de abajo. (Auditoría de Negocios, 2026-08-04.)
  const [events, setEvents] = useState<EventRow[]>([]);

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
    const life = r.status ?? 'published';
    // Badge reflects the real lifecycle: cancelled / draft override the sold-through state.
    const badge: [[string, string], string, string] =
      life === 'cancelled' ? [['Cancelado', 'Cancelled'], '#FDE7EF', '#D6336C']
      : life === 'draft'   ? [['Borrador', 'Draft'], '#FCEFD6', '#9A6A12']
      : almost             ? [['Casi lleno', 'Almost full'], '#FCEFD6', '#9A6A12']
      :                      [['Vendiendo', 'Selling'], '#E3F5EA', '#1F8A4C'];
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
      status: badge[0],
      statusBg: badge[1],
      statusC: badge[2],
      lifecycle: life,
      startsMs: valid ? d.getTime() : 0,
    };
  };

  // Pure fetch of the owner's events (callers own the setState).
  const fetchEvents = async (ownerId: string): Promise<EventRow[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('events')
      .select('id,slug,title_es,title_en,venue_es,venue_en,cat,city,starts_at,time_label_es,time_label_en,price_label,going_count,desc_es,desc_en,tile_a,tile_b,status')
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

  // Real aggregate totals for the KPIs + "Este mes" rail (owner_events_summary,
  // migration 0063) — replaces the hardcoded 186 / $14.2k / 212 placeholders.
  const [summary, setSummary] = useState<{ upcoming: number; ticketsSold: number; revenue: number; attendees: number } | null>(null);
  useEffect(() => {
    if (!persistable || !user || !supabase) { setSummary(null); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!.rpc('owner_events_summary');
      if (cancelled) return;
      const r = Array.isArray(data) && data[0] ? (data[0] as Record<string, unknown>) : null;
      setSummary(error || !r ? null : {
        upcoming: Number(r.upcoming ?? 0), ticketsSold: Number(r.tickets_sold ?? 0),
        revenue: Number(r.revenue ?? 0), attendees: Number(r.attendees ?? 0),
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, real?.id, admin.demo, events.length]);

  // Upcoming vs. past split. Real owners: by real start time (3h grace so an event
  // in progress stays "upcoming"). Demo: the seed is all upcoming; past uses the sample.
  const PAST_GRACE = 3 * 3600 * 1000;
  const nowMs = Date.now();
  const isUpcoming = (e: EventRow) => e.startsMs == null || e.startsMs >= nowMs - PAST_GRACE;
  const upcomingList = persistable ? events.filter(isUpcoming) : events;
  const pastList = persistable ? events.filter((e) => !isUpcoming(e)) : [];

  // Demo-only sample past events (a signed-in owner sees their real pastList).
  const pastEvents = useMemo(() => [
    { name: L('Mercado Navideño', 'Holiday Market'), date: L('14 Dic 2024', 'Dec 14, 2024'), sold: 142, rev: '$3,840', rating: '4.9', tile: '#F3D9E2 0 9px,#E8BFCD 9px 18px' },
    { name: L('Clase de tamales', 'Tamales Class'), date: L('8 Dic 2024', 'Dec 8, 2024'), sold: 24, rev: '$1,200', rating: '5.0', tile: '#FCE3DC 0 9px,#F6CEC2 9px 18px' },
    { name: L('Noche de jazz', 'Jazz Night'), date: L('23 Nov 2024', 'Nov 23, 2024'), sold: 86, rev: '$2,580', rating: '4.7', tile: '#E4ECFB 0 9px,#D7E3F6 9px 18px' },
  ], [L]);

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
        .select('id,customer_name,qty,admitted,total,code,status,created_at')
        .eq('event_id', mgEv.dbId)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setFalloEventos(!!error);
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
  const [tierForm, setTierForm] = useState<{ name: string; price: string; capacity: string; hidden: boolean; seat: boolean }>({ name: '', price: '', capacity: '', hidden: false, seat: false });
  // Layout editor for an ALREADY-created event (seating / tables+photos / packages
  // / program / tags). null until loaded from the DB. Saved via events.update (0115).
  type LayoutState = { seating: 'none' | 'seats' | 'tables'; rows: string; cols: string; tables: TableDraft[]; addons: AddonDraft[]; tags: string; program: { id: string; t: string; es: string }[]; age: string; includes: string };
  const [lay, setLay] = useState<LayoutState | null>(null);
  const [layBusy, setLayBusy] = useState(false);
  const layPhotoRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // Raw attrs as loaded, so saveLayout can MERGE (not clobber) keys the editor
  // doesn't expose — addr, scheduleEs/En, urgency, etc. would be lost otherwise.
  const layAttrsRaw = useRef<Record<string, unknown>>({});
  useEffect(() => {
    setLay(null);
    if (!persistable || !mgEv.dbId || !supabase) return;
    let off = false;
    void supabase.from('events').select('seating,attrs,addons').eq('id', mgEv.dbId).maybeSingle().then(({ data }) => {
      if (off || !data) return;
      const s = (data.seating ?? null) as { type?: string; rows?: number; cols?: number; tables?: { cap?: number; photo?: string }[] } | null;
      const a = (data.attrs ?? {}) as Record<string, unknown>;
      layAttrsRaw.current = a; // keep the full object to merge back on save
      const ad = Array.isArray(data.addons) ? (data.addons as Record<string, unknown>[]) : [];
      const lineup = Array.isArray(a.lineup) ? (a.lineup as Record<string, unknown>[]) : [];
      setLay({
        seating: s?.type === 'seats' ? 'seats' : s?.type === 'tables' ? 'tables' : 'none',
        rows: String(s?.rows ?? 6), cols: String(s?.cols ?? 9),
        tables: (s?.tables ?? []).map((t) => ({ id: nextSub(), cap: String(t.cap ?? 4), photo: String(t.photo ?? '') })),
        addons: ad.map((x) => ({ id: String(x.id ?? nextSub()), es: String(x.es ?? ''), price: String(x.price ?? ''), required: x.required === true, seatedOnly: x.applyTo === 'seated' })),
        tags: (Array.isArray(a.tags_es) ? (a.tags_es as string[]) : []).join(', '),
        program: lineup.map((l) => ({ id: nextSub(), t: String(l.t ?? ''), es: String(l.es ?? '') })),
        age: String(a.age_es ?? ''), includes: String(a.includes_es ?? ''),
      });
    });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mgEv.dbId, admin.demo]);
  const setLayF = (patch: Partial<LayoutState>) => setLay((l) => (l ? { ...l, ...patch } : l));
  const uploadLayPhoto = async (id: string, file: File | undefined) => {
    if (!file || !lay) return;
    try { const url = !persistable || !user || !supabase ? URL.createObjectURL(file) : await uploadImage(file, user.id, 900); setLayF({ tables: lay.tables.map((t) => (t.id === id ? { ...t, photo: url } : t)) }); }
    catch { flash(L('No se pudo subir la foto', 'Could not upload the photo')); }
  };
  const saveLayout = async () => {
    if (!lay || !mgEv.dbId || !supabase || layBusy) return;
    setLayBusy(true);
    const seating = lay.seating === 'tables'
      ? { type: 'tables', tables: lay.tables.filter((t) => Number(t.cap) > 0).map((t, i) => ({ n: i + 1, cap: Number(t.cap), ...(t.photo ? { photo: t.photo } : {}) })) }
      : lay.seating === 'seats'
        ? { type: 'seats', rows: Math.max(1, Math.min(20, Number(lay.rows) || 6)), cols: Math.max(1, Math.min(20, Number(lay.cols) || 9)) }
        : null;
    const tagArr = lay.tags.split(',').map((s) => s.trim()).filter(Boolean);
    const lineup = lay.program.filter((p) => p.t.trim() && p.es.trim()).map((p) => ({ t: p.t.trim(), es: p.es.trim(), en: p.es.trim() }));
    // MERGE onto the loaded attrs: strip the keys this editor owns, then re-add
    // them, so untouched keys (addr, scheduleEs/En, urgency…) survive the save.
    const base: Record<string, unknown> = { ...layAttrsRaw.current };
    for (const k of ['age_es', 'age_en', 'includes_es', 'includes_en', 'tags_es', 'tags_en', 'lineup']) delete base[k];
    const attrs = {
      ...base,
      ...(lay.age.trim() ? { age_es: lay.age.trim(), age_en: lay.age.trim() } : {}),
      ...(lay.includes.trim() ? { includes_es: lay.includes.trim(), includes_en: lay.includes.trim() } : {}),
      ...(tagArr.length ? { tags_es: tagArr, tags_en: tagArr } : {}),
      ...(lineup.length ? { lineup } : {}),
    };
    const addons = lay.addons.filter((a) => a.es.trim()).map((a) => ({ id: a.id, es: a.es.trim(), en: a.es.trim(), price: Number(a.price) || 0, required: a.required, applyTo: a.seatedOnly ? 'seated' : 'all' }));
    const { error } = await supabase.from('events').update({ seating, attrs, addons }).eq('id', mgEv.dbId);
    setLayBusy(false);
    flash(error ? L('No se pudo guardar', 'Could not save') : L('Guardado', 'Saved'));
  };
  const [tierBusy, setTierBusy] = useState(false);
  const reloadTiers = async () => {
    if (!mgEv.dbId || !supabase) return;
    const { data } = await supabase.from('event_tiers').select('id,name_es,name_en,price,capacity,sold,sort,visible,seat').eq('event_id', mgEv.dbId).order('sort');
    setTierList(Array.isArray(data) ? (data as unknown as EventTier[]) : []);
  };
  useEffect(() => {
    if (!persistable || !mgEv.dbId || !supabase) { setTierList(null); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!.from('event_tiers').select('id,name_es,name_en,price,capacity,sold,sort,visible,seat').eq('event_id', mgEv.dbId).order('sort');
      if (cancelled) return;
      setFalloEventos((f) => f || !!error);
      setTierList(error || !Array.isArray(data) ? [] : (data as unknown as EventTier[]));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mgEv.dbId, admin.demo]);
  const openTierEdit = (t: EventTier | null) => {
    setTierEdit(t ? t.id : 'new');
    setTierForm(t ? { name: L(t.name_es, t.name_en), price: String(t.price), capacity: t.capacity == null ? '' : String(t.capacity), hidden: t.visible === false, seat: !!t.seat } : { name: '', price: '', capacity: '', hidden: false, seat: false });
  };
  const saveTier = async () => {
    if (!mgEv.dbId || !supabase || tierBusy) return;
    const name = tierForm.name.trim();
    if (!name) { flash(L('Ponle un nombre al nivel', 'Name the tier')); return; }
    const price = Number(tierForm.price) || 0;
    const capacity = tierForm.capacity.trim() === '' ? null : Math.max(0, Number(tierForm.capacity) || 0);
    setTierBusy(true);
    const err = tierEdit === 'new'
      ? await escribir(supabase.from('event_tiers').insert({ event_id: mgEv.dbId, name_es: name, name_en: name, price, capacity, sort: tierList?.length ?? 0, visible: !tierForm.hidden, seat: tierForm.seat }), L('es', 'en') === 'en')
      : tierEdit
        ? await escribir(supabase.from('event_tiers').update({ name_es: name, name_en: name, price, capacity, visible: !tierForm.hidden, seat: tierForm.seat }).eq('id', tierEdit), L('es', 'en') === 'en')
        : null;
    setTierBusy(false);
    if (err) { flash(err); return; }   // la hoja se queda abierta con lo escrito
    setTierEdit(null); await reloadTiers();
    flash(L('Nivel guardado', 'Tier saved'));
  };
  const deleteTier = async (id: string) => {
    if (!supabase) return;
    const err = await escribir(supabase.from('event_tiers').delete().eq('id', id), L('es', 'en') === 'en');
    if (err) { flash(err); return; }
    setTierEdit(null); await reloadTiers();
    flash(L('Nivel eliminado', 'Tier removed'));
  };

  // Promo codes (event_promo_codes, migration 0065). Owner CRUD. Access codes unlock a
  // hidden tier (fully real); percent/amount adjust the reserved total (charging = payments).
  type PromoRow = { id: string; code: string; kind: string; value: number; tier_id: string | null; max_uses: number | null; used: number; active: boolean };
  const [promoRows, setPromoRows] = useState<PromoRow[] | null>(null);
  const [promoAdd, setPromoAdd] = useState(false);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoForm, setPromoForm] = useState<{ code: string; kind: 'percent' | 'amount' | 'access'; value: string; tierId: string; maxUses: string }>({ code: '', kind: 'percent', value: '', tierId: '', maxUses: '' });
  const reloadPromos = async () => {
    if (!mgEv.dbId || !supabase) return;
    const { data } = await supabase.from('event_promo_codes').select('id,code,kind,value,tier_id,max_uses,used,active').eq('event_id', mgEv.dbId).order('created_at');
    setPromoRows(Array.isArray(data) ? (data as unknown as PromoRow[]) : []);
  };
  useEffect(() => {
    if (!persistable || !mgEv.dbId || !supabase) { setPromoRows(null); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!.from('event_promo_codes').select('id,code,kind,value,tier_id,max_uses,used,active').eq('event_id', mgEv.dbId).order('created_at');
      if (!cancelled) setPromoRows(error || !Array.isArray(data) ? [] : (data as unknown as PromoRow[]));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mgEv.dbId, admin.demo]);
  const savePromo = async () => {
    if (!mgEv.dbId || !supabase || promoBusy) return;
    const code = promoForm.code.trim().toUpperCase();
    if (!code) { flash(L('Escribe un código', 'Enter a code')); return; }
    if (promoForm.kind === 'access' && !promoForm.tierId) { flash(L('Elige el nivel que desbloquea', 'Pick the tier it unlocks')); return; }
    const value = promoForm.kind === 'access' ? 0 : Number(promoForm.value) || 0;
    if (promoForm.kind !== 'access' && value <= 0) { flash(L('Pon un valor de descuento', 'Set a discount value')); return; }
    setPromoBusy(true);
    const { error } = await supabase.from('event_promo_codes').insert({
      event_id: mgEv.dbId, code, kind: promoForm.kind, value,
      tier_id: promoForm.tierId || null, max_uses: promoForm.maxUses.trim() === '' ? null : Math.max(1, Number(promoForm.maxUses) || 1),
    });
    setPromoBusy(false);
    if (error) { flash(/duplicate|unique/i.test(error.message) ? L('Ese código ya existe', 'That code already exists') : L('No se pudo guardar', "Couldn't save")); return; }
    setPromoAdd(false); setPromoForm({ code: '', kind: 'percent', value: '', tierId: '', maxUses: '' });
    await reloadPromos();
    flash(L('Código creado', 'Code created'));
  };
  const deletePromo = async (id: string) => {
    if (!supabase) return;
    await supabase.from('event_promo_codes').delete().eq('id', id);
    await reloadPromos();
    flash(L('Código eliminado', 'Code removed'));
  };

  // Real door check-in: validate a ticket code (checkin_ticket RPC, migration 0061)
  // → flips it to used once; the buyer list below reflects the new status.
  const [checkinCode, setCheckinCode] = useState('');
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkinRes, setCheckinRes] = useState<{ ok: boolean; msg: string; buyer: string | null; qty: number | null; admitted: number | null; tier: string | null; already: boolean; code: string } | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const scanSupported = useBarcodeSupport(); // camera scan only where BarcodeDetector exists
  const reloadTickets = async () => {
    if (!mgEv.dbId || !supabase) return;
    const { data } = await supabase.from('event_tickets').select('id,customer_name,qty,admitted,total,code,status,created_at').eq('event_id', mgEv.dbId).order('created_at', { ascending: false }).limit(500);
    // Tope: un evento con miles de asistentes se bajaba entero al navegador.
    setTicketRows(Array.isArray(data) ? (data as unknown as TicketRow[]) : []);
  };
  // Admit N guests of a (possibly group) ticket per scan (checkin_ticket, migration
  // 0065). codeArg comes from the camera scanner / a per-row +1 button; otherwise the
  // manual input. qtyArg admits that many (default 1).
  const runCheckin = async (codeArg?: string, qtyArg?: number) => {
    const code = (codeArg ?? checkinCode).trim().toUpperCase();
    if (!code || checkinBusy || !supabase) return;
    setCheckinBusy(true);
    const { data, error } = await supabase.rpc('checkin_ticket', { in_code: code, in_qty: qtyArg ?? 1 });
    setCheckinBusy(false);
    if (error || !Array.isArray(data) || data.length === 0) {
      setCheckinRes({ ok: false, msg: 'error', buyer: null, qty: null, admitted: null, tier: null, already: false, code });
      return;
    }
    const r = data[0] as Record<string, unknown>;
    setCheckinRes({ ok: !!r.ok, msg: String(r.msg ?? ''), buyer: r.buyer ? String(r.buyer) : null, qty: r.qty != null ? Number(r.qty) : null, admitted: r.admitted != null ? Number(r.admitted) : null, tier: r.tier ? String(r.tier) : null, already: !!r.already, code });
    if (!codeArg) setCheckinCode('');
    reloadTickets();
  };
  const admittedQty = (ticketRows ?? []).reduce((n, t) => n + (t.admitted || 0), 0);

  // Waitlist roster for the managed event (event_waitlist, migration 0065). Owner-scoped via RLS.
  type WaitRow = { id: string; customer_name: string | null; tier_id: string | null; status: string; created_at: string };
  const [waitRows, setWaitRows] = useState<WaitRow[] | null>(null);
  const [waitBusy, setWaitBusy] = useState(false);
  const reloadWaitlist = async () => {
    if (!mgEv.dbId || !supabase) return;
    const { data } = await supabase.from('event_waitlist').select('id,customer_name,tier_id,status,created_at').eq('event_id', mgEv.dbId).order('created_at');
    setWaitRows(Array.isArray(data) ? (data as unknown as WaitRow[]) : []);
  };
  useEffect(() => {
    if (!persistable || !mgEv.dbId || !supabase) { setWaitRows(null); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!.from('event_waitlist').select('id,customer_name,tier_id,status,created_at').eq('event_id', mgEv.dbId).order('created_at');
      if (!cancelled) setWaitRows(error || !Array.isArray(data) ? [] : (data as unknown as WaitRow[]));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mgEv.dbId, admin.demo]);
  const waitlistActive = (waitRows ?? []).filter((w) => w.status === 'active').length;
  const notifyWaitlist = async () => {
    if (!mgEv.dbId || !supabase || waitBusy) return;
    setWaitBusy(true);
    const { data, error } = await supabase.rpc('notify_waitlist', { in_event_id: mgEv.dbId, in_tier_id: null });
    setWaitBusy(false);
    if (error) { flash(L('No se pudo avisar', "Couldn't notify")); return; }
    await reloadWaitlist();
    flash(L(`Avisamos a ${Number(data) || 0}`, `Notified ${Number(data) || 0}`));
  };

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
    `tap-y flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;


  // Honest placeholder for features on the roadmap but not yet built (matches the
  // app's "Muy pronto" pattern) — never fake data dressed up as working.
  const comingSoon = (Icon: typeof RefreshCw, title: string, desc: string) => (
    <div className="flex flex-col items-center rounded-card-sm border border-line bg-white px-6 py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-tile bg-lilac-3"><Icon size={22} strokeWidth={2} className="text-primary-dark" /></span>
      <div className="text-[14px] font-extrabold text-ink">{title}</div>
      <div className="mt-1 max-w-[340px] text-[11.5px] font-medium leading-relaxed text-muted">{desc}</div>
      <span className="mt-3 rounded-full bg-amber-bg px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.05em] text-amber-ink">{L('Muy pronto', 'Coming soon')}</span>
    </div>
  );

  const goManage = (id: number, mt: ManageTab = 'overview') => { setManageId(id); setManageTab(mt); setView('manage'); };
  const startWizard = () => { setDraft(newDraft()); setWizStep(0); setWizMax(0); setView('wizard'); };

  // ==================================================================
  // LIST — sub-tabs
  // ==================================================================
  const listTabs: [ListTab, string, number | null][] = [
    ['upcoming', L('Próximos', 'Upcoming'), null],
    ['drafts', L('Borradores', 'Drafts'), null],
    ['past', L('Pasados', 'Past'), persistable ? pastList.length || null : null],
    ['recurring', L('Recurrentes', 'Recurring'), null],
    ['promoters', L('Promotores', 'Promoters'), null],
  ];

  // ---- Próximos ----
  // Real owner → live totals from owner_events_summary; demo → sample with deltas.
  const kpis = persistable
    ? [
        { label: L('Próximos', 'Upcoming'), value: String(summary?.upcoming ?? upcomingList.length), delta: null as string | null },
        { label: L('Boletos', 'Tickets'), value: String(summary?.ticketsSold ?? 0), delta: null as string | null },
        { label: L('Ingresos', 'Revenue'), value: `$${(summary?.revenue ?? 0).toLocaleString()}`, delta: null as string | null },
      ]
    : [
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

        {upcomingList.length === 0 && (
          <div className="rounded-card-sm border border-line bg-white py-12 text-center">
            <div className="text-[13.5px] font-extrabold text-ink">{L('Aún no tienes eventos próximos', 'No upcoming events yet')}</div>
            <div className="mt-1 text-[11.5px] font-medium text-muted-2">{L('Crea tu primer evento y ponlo en venta en minutos.', 'Create your first event and put it on sale in minutes.')}</div>
            <button onClick={startWizard} className="tap-y mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-4 py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm">
              <Plus size={15} stroke={2.6} />{L('Crear evento', 'Create event')}
            </button>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
          {upcomingList.map((e) => {
            const pct = Math.round((e.sold / e.cap) * 100);
            const barC = e.sold / e.cap > 0.85 ? '#E8954A' : '#7B61FF';
            return (
              <div key={e.id} className="overflow-hidden rounded-card-sm border border-line bg-white">
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
                    <button onClick={() => goManage(e.id)} className="tap-y tap-y flex-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[11.5px] font-extrabold text-white shadow-cta-sm">{L('Gestionar', 'Manage')}</button>
                    <button onClick={() => goManage(e.id, 'checkin')} className="tap-y flex cursor-pointer items-center gap-1.5 rounded-btn border-[1.5px] border-lilac-line bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-ink">
                      <QrCode size={13} stroke={2} className="text-primary-dark" />{L('Check-in', 'Check-in')}
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
          <div className="mb-3 text-[13px] font-extrabold text-ink">{persistable ? L('Tus totales', 'Your totals') : L('Este mes', 'This month')}</div>
          <div className="flex flex-col gap-2.5">
            {(persistable
              ? [
                  { Icon: Ticket, c: '#6D4DF6', bg: '#F1EFFA', t: L('Boletos vendidos', 'Tickets sold'), r: String(summary?.ticketsSold ?? 0) },
                  { Icon: DollarSign, c: '#1F8A4C', bg: '#E3F5EA', t: L('Ingresos', 'Revenue'), r: `$${(summary?.revenue ?? 0).toLocaleString()}` },
                  { Icon: Users, c: '#2A5C8A', bg: '#E4ECFB', t: L('Asistentes', 'Attendees'), r: String(summary?.attendees ?? 0) },
                ]
              : [
                  { Icon: Ticket, c: '#6D4DF6', bg: '#F1EFFA', t: L('Boletos vendidos', 'Tickets sold'), r: '186' },
                  { Icon: DollarSign, c: '#1F8A4C', bg: '#E3F5EA', t: L('Ingresos', 'Revenue'), r: '$14.2k' },
                  { Icon: Users, c: '#2A5C8A', bg: '#E4ECFB', t: L('Asistentes', 'Attendees'), r: '212' },
                  { Icon: RefreshCw, c: '#9A6A12', bg: '#FCEFD6', t: L('Recurrentes', 'Recurring'), r: '2' },
                ]
            ).map((s) => (
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
            {L('Pronto podrás invitar promotores con un código: comparten tu evento y ganan comisión por boleto.', 'Soon you\'ll invite promoters with a code: they share your event and earn commission per ticket.')}
          </div>
          <button onClick={() => setListTab('promoters')} className="tap-y mt-2.5 cursor-pointer rounded-[10px] bg-white px-3.5 py-2 text-[11.5px] font-extrabold text-primary-press">{L('Ver promotores', 'View promoters')}</button>
        </div>
      </div>
    </div>
  );

  // ---- Borradores ---- (draft-saving lands with the next phase; honest for now)
  const draftsView = comingSoon(
    ImagePlus,
    L('Guarda eventos como borrador', 'Save events as drafts'),
    L('Pronto podrás dejar un evento a medias y terminarlo después. Por ahora el asistente publica en un paso.', "Soon you'll be able to leave an event half-finished and complete it later. For now the wizard publishes in one pass."),
  );

  // ---- Pasados ---- real for a signed-in owner; sample when exploring in demo
  const pastView = persistable ? (
    pastList.length === 0 ? (
      <div className="rounded-card-sm border border-line bg-white py-12 text-center text-[12px] font-semibold text-muted-2">{L('Todavía no tienes eventos pasados.', 'No past events yet.')}</div>
    ) : (
      <div className="grid gap-2.5 md:grid-cols-2">
        {pastList.map((e) => (
          <button key={e.dbId ?? e.id} onClick={() => goManage(e.id)} className="flex cursor-pointer items-center gap-3 rounded-card-sm border border-line bg-white p-3 text-left opacity-90 hover:opacity-100">
            <span className="flex h-12 w-12 flex-none flex-col items-center justify-center rounded-[11px]" style={{ background: `repeating-linear-gradient(135deg,${e.tile})` }}>
              <span className="text-[8px] font-extrabold text-pink-dark">{e.mon}</span>
              <span className="text-[15px] font-extrabold leading-none text-ink">{e.day}</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-extrabold text-ink">{e.name}</div>
              <div className="mt-0.5 text-[10px] font-medium text-muted-2">{e.sold} {L('asistentes', 'attendees')}{e.lifecycle === 'cancelled' ? ` · ${L('Cancelado', 'Cancelled')}` : ''}</div>
            </div>
          </button>
        ))}
      </div>
    )
  ) : (
    <div className="grid gap-2.5 md:grid-cols-2">
      {pastEvents.map((e) => (
        <div key={e.name} className="flex items-center gap-3 rounded-card-sm border border-line bg-white p-3 opacity-90">
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

  // ---- Recurrentes ---- (auto-repeat series — roadmap, not yet built)
  const recurringView = comingSoon(
    RefreshCw,
    L('Eventos recurrentes', 'Recurring events'),
    L('Repite un evento cada semana o mes automáticamente, sin recrearlo cada vez. En camino.', 'Repeat an event every week or month automatically, without recreating it each time. On the way.'),
  );

  // ---- Promotores ---- (affiliate codes + commissions — needs payments first)
  const promotersView = comingSoon(
    Megaphone,
    L('Promotores y afiliados', 'Promoters & affiliates'),
    L('Da a tus promotores un código para compartir y págales comisión por boleto. Se habilita al conectar pagos.', 'Give promoters a code to share and pay them commission per ticket. Unlocks when payments are connected.'),
  );

  const listBody = (
    <div className="pb-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <SectionTabs
          className="min-w-0 flex-1"
          tabs={listTabs as SectionTab<typeof listTab>[]}
          value={listTab}
          onChange={setListTab}
        />
        <button onClick={startWizard} className="tap-y mb-1.5 hidden flex-none cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-3.5 py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm sm:flex">
          <Plus size={15} stroke={2.6} />{L('Crear evento', 'Create event')}
        </button>
      </div>

      {listTab === 'upcoming' && upcomingView}
      {listTab === 'drafts' && draftsView}
      {listTab === 'past' && pastView}
      {listTab === 'recurring' && recurringView}
      {listTab === 'promoters' && promotersView}

      {/* mobile create button */}
      <button onClick={startWizard} className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[14px] font-extrabold text-white shadow-cta sm:hidden">
        <Plus size={16} stroke={2.6} />{L('Crear evento', 'Create event')}
      </button>
    </div>
  );

  // ==================================================================
  // MANAGE DETAIL
  // ==================================================================
  const manageTabs: [ManageTab, string, number | null][] = [
    ['overview', L('Resumen', 'Overview'), null],
    ['attendees', L('Asistentes', 'Attendees'), persistable ? ticketsSold : mgEv.sold],
    ['checkin', L('Check-in', 'Check-in'), null],
    ['tickets', L('Boletos', 'Tickets'), null],
    ['waitlist', L('Lista de espera', 'Waitlist'), persistable ? (waitlistActive || null) : 3],
    ['settings', L('Ajustes', 'Settings'), null],
  ];

  const heroCard = (
    <div className="overflow-hidden rounded-card-sm border border-line bg-white">
      <div className="relative h-24" style={{ background: `repeating-linear-gradient(135deg,${mgEv.tile})` }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.5))' }} />
        <span className="absolute right-2.5 top-2.5 rounded-[7px] px-2.5 py-1 text-[9px] font-extrabold" style={{ background: mgEv.statusBg, color: mgEv.statusC }}>{L(mgEv.status[0], mgEv.status[1]) || L('Vendiendo', 'Selling')}</span>
        <div className="absolute bottom-2.5 left-3">
          <div className="text-[15px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{mgEv.name}</div>
          <div className="text-[10px] font-semibold text-white/85">{mgEv.time} · {mgEv.price}</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 p-3">
        {[
          { v: persistable ? `${ticketsSold}` : `${mgEv.sold}/${mgEv.cap}`, l: L('Vendidos', 'Sold') },
          { v: `$${(persistable ? ticketsRevenue : revenue).toLocaleString()}`, l: L('Ingresos', 'Revenue') },
          { v: persistable ? `${admittedQty}/${ticketsSold}` : `${checkedInCount}/${mgEv.sold}`, l: L('Ingresaron', 'Checked in') },
          { v: persistable ? String(waitlistActive) : '3', l: L('Espera', 'Waitlist') },
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
  // Real owner → a true last-14-days ticket-sales sparkline bucketed from
  // event_tickets.created_at; demo → the sample curve.
  const TL_DAYS = 14;
  const realTimeline = (() => {
    const buckets = new Array(TL_DAYS).fill(0) as number[];
    const midnight = new Date(nowMs); midnight.setHours(0, 0, 0, 0);
    const startMs = midnight.getTime() - (TL_DAYS - 1) * 86400000;
    for (const t of ticketRows ?? []) {
      const idx = Math.floor((new Date(t.created_at).getTime() - startMs) / 86400000);
      if (idx >= 0 && idx < TL_DAYS) buckets[idx] += t.qty || 0;
    }
    return buckets;
  })();
  const salesBars = persistable ? realTimeline : [3, 5, 4, 8, 6, 12, 9, 14, 11, 18, 22, 16];
  const maxBar = Math.max(...salesBars, 1);
  const timelineEmpty = persistable && salesBars.every((v) => v === 0);
  const overviewView = (
    <div className="grid items-start gap-3 xl:grid-cols-2">
      <div className={`${cardCls} p-3.5`}>
        <div className="mb-2.5 text-[12.5px] font-extrabold text-ink">{L('Ventas por nivel', 'Sales by tier')}</div>
        {displayTiers.length === 0 && <div className="py-3 text-[11.5px] font-semibold text-muted-2">{falloEventos ? L('No pudimos cargar los niveles. Revisa tu conexión.', "We couldn't load the tiers. Check your connection.") : L('Aún no hay niveles de boleto.', 'No ticket tiers yet.')}</div>}
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
        <div className="mb-2.5 text-[12.5px] font-extrabold text-ink">{L('Ventas · últimos 14 días', 'Sales · last 14 days')}</div>
        {timelineEmpty ? (
          <div className="py-6 text-center text-[11.5px] font-semibold text-muted-2">{L('Sin ventas en los últimos 14 días.', 'No sales in the last 14 days.')}</div>
        ) : (
          <>
            <div className="flex h-[70px] items-end gap-[5px]">
              {salesBars.map((v, i) => (
                <div key={i} className="flex-1 rounded-t-[4px]" style={{ height: `${Math.round((v / maxBar) * 60) + 6}px`, background: i === salesBars.length - 1 ? '#7B61FF' : '#D9CFF6' }} />
              ))}
            </div>
            <div className="mt-2 text-[9.5px] font-semibold text-muted-2">{persistable ? L('Boletos vendidos por día.', 'Tickets sold per day.') : L('Pico de ventas hace 2 días tras el email.', 'Sales peaked 2 days ago after the email.')}</div>
          </>
        )}
      </div>
    </div>
  );

  // ---- Asistentes ----
  const aq = attendeeQuery.trim().toLowerCase();
  const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'C';
  const ATT_COLORS = ['#7B61FF', '#1F9D57', '#E8954A', '#D6336C', '#2A5C8A'];
  // Real owner → the actual buyers from event_tickets; demo → the sample roster.
  const realAttendees = (ticketRows ?? []).map((t, i) => ({
    key: t.id, name: t.customer_name || L('Cliente', 'Customer'), color: ATT_COLORS[i % ATT_COLORS.length],
    code: t.code, qty: t.qty, used: t.status === 'used', refunded: t.status === 'refunded',
  })).filter((a) => a.name.toLowerCase().includes(aq) || a.code.toLowerCase().includes(aq));
  const filteredAttendees = attendees.filter((a) => a.name.toLowerCase().includes(aq));
  const attendeesView = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 rounded-btn border border-line bg-white px-3 py-2.5">
        <Search size={15} stroke={2.2} className="text-muted-2" />
        <input value={attendeeQuery} onChange={(e) => setAttendeeQuery(e.target.value)} placeholder={L('Buscar por nombre o código…', 'Search by name or code…')} className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-ink outline-none placeholder:text-muted-2" />
      </div>
      {persistable ? (
        <div className="grid gap-2.5 md:grid-cols-2">
          {realAttendees.map((a) => (
            <div key={a.key} className="flex items-center gap-3 rounded-btn-lg border border-line bg-white p-3">
              <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: a.color }}>{initialsOf(a.name)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-extrabold text-ink">{a.name}</div>
                <div className="mt-0.5 font-mono text-[9.5px] font-bold tracking-[.08em] text-muted-2">{a.code} · {a.qty} {a.qty === 1 ? L('boleto', 'ticket') : L('boletos', 'tickets')}</div>
              </div>
              <span className="flex-none rounded-md px-2 py-1 text-[9px] font-extrabold" style={{ background: a.used ? '#E3F5EA' : a.refunded ? '#FDE7EF' : '#F1EFFA', color: a.used ? '#1F8A4C' : a.refunded ? '#D6336C' : '#9A96AE' }}>{a.used ? L('Ingresó', 'Checked in') : a.refunded ? L('Reembolsado', 'Refunded') : L('Confirmado', 'Going')}</span>
            </div>
          ))}
          {realAttendees.length === 0 && <div className="col-span-full rounded-btn-lg border border-line bg-white py-10 text-center text-[12px] font-semibold text-muted-2">{aq ? L('Sin resultados', 'No results') : falloEventos ? L('No pudimos cargar tus asistentes. Revisa tu conexión.', "We couldn't load your attendees. Check your connection.") : L('Aún no hay asistentes. Aparecerán aquí cuando compren boletos.', 'No attendees yet. They show up here once they buy tickets.')}</div>}
        </div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {filteredAttendees.map((a) => {
            const inn = isCheckedIn(a);
            return (
              <div key={a.name} className="flex items-center gap-3 rounded-btn-lg border border-line bg-white p-3">
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
      )}
    </div>
  );

  // ---- Check-in ----
  const remaining = checkinRes && checkinRes.admitted != null && checkinRes.qty != null ? checkinRes.qty - checkinRes.admitted : 0;
  const checkinBanner = checkinRes && (
    <div className={`mt-3 rounded-btn-lg px-3 py-2.5 text-left ${checkinRes.ok ? 'bg-[#123a26]' : checkinRes.already ? 'bg-[#3a3212]' : 'bg-[#3a1420]'}`}>
      <div className={`text-[13px] font-extrabold ${checkinRes.ok ? 'text-[#7BE0A8]' : checkinRes.already ? 'text-amber' : 'text-pink'}`}>
        {checkinRes.ok ? L('✓ Admitido', '✓ Admitted') : checkinRes.already ? L('Ya había ingresado', 'Already checked in') : checkinRes.msg === 'reembolsado' ? L('Boleto reembolsado', 'Ticket refunded') : L('Código no válido', 'Invalid code')}
        {checkinRes.admitted != null && checkinRes.qty != null && checkinRes.qty > 1 ? ` · ${checkinRes.admitted}/${checkinRes.qty}` : ''}
      </div>
      {checkinRes.buyer && <div className="mt-0.5 text-[11px] font-semibold text-white/75">{checkinRes.buyer}{checkinRes.tier ? ` · ${checkinRes.tier}` : ''}</div>}
      {checkinRes.ok && remaining > 0 && (
        <button onClick={() => runCheckin(checkinRes.code, remaining)} className="tap-y mt-2 cursor-pointer rounded-btn bg-primary px-3 py-1.5 text-[11px] font-extrabold text-white">
          {L('Admitir los', 'Admit the')} {remaining} {L('restantes', 'remaining')}
        </button>
      )}
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
          <button onClick={() => runCheckin()} disabled={checkinBusy || !checkinCode.trim()} className="tap-y flex-none cursor-pointer rounded-btn bg-primary px-4 py-2.5 text-[12px] font-extrabold text-white disabled:opacity-40">{L('Validar', 'Check')}</button>
        </div>
        {scanSupported && (
          scanOpen ? (
            <div className="mt-3"><QrScanner onCode={(v) => { setScanOpen(false); void runCheckin(v); }} onClose={() => setScanOpen(false)} L={L} /></div>
          ) : (
            <button onClick={() => setScanOpen(true)} className="tap-y mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn bg-white/10 py-2.5 text-[12px] font-extrabold text-white">
              <QrCode size={15} stroke={2.2} /> {L('Escanear con cámara', 'Scan with camera')}
            </button>
          )
        )}
        {checkinBanner}
        <div className="mt-3 text-center text-[10.5px] font-semibold text-white/50">{L('El invitado muestra el código de su boleto (Mi cuenta → Mis boletos).', 'The guest shows the code from their ticket (My account → My tickets).')}</div>
        <div className="mt-4 flex justify-center gap-6 border-t border-white/10 pt-4">
          <div className="text-center"><div className="text-[18px] font-extrabold text-[#7BE0A8]">{admittedQty}</div><div className="mt-0.5 text-[9px] font-semibold text-white/55">{L('Ingresaron', 'Checked in')}</div></div>
          <div className="text-center"><div className="text-[18px] font-extrabold text-white">{ticketsSold}</div><div className="mt-0.5 text-[9px] font-semibold text-white/55">{L('Vendidos', 'Sold')}</div></div>
          <div className="text-center"><div className="text-[18px] font-extrabold text-amber">{Math.max(0, ticketsSold - admittedQty)}</div><div className="mt-0.5 text-[9px] font-semibold text-white/55">{L('Faltan', 'Remaining')}</div></div>
        </div>
      </div>
      <div>
        <div className="mb-2.5 px-0.5 text-[12px] font-extrabold text-ink">{L('Boletos', 'Tickets')} · {ticketsSold}</div>
        {(ticketRows ?? []).length === 0 ? (
          <div className="rounded-btn-lg border border-line bg-white py-10 text-center text-[12px] font-semibold text-muted-2">{falloEventos ? L('No pudimos cargar tus boletos. Revisa tu conexión.', "We couldn't load your tickets. Check your connection.") : L('Aún no hay boletos vendidos.', 'No tickets sold yet.')}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {(ticketRows ?? []).map((t) => {
              const fully = t.admitted >= t.qty;
              const partial = t.admitted > 0 && !fully;
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-btn-lg border border-line bg-white p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-extrabold text-ink">{t.customer_name || L('Cliente', 'Customer')}</div>
                    <div className="mt-0.5 font-mono text-[10.5px] font-bold tracking-[.1em] text-muted-2">{t.code} · {t.admitted}/{t.qty} {L('ingresaron', 'in')}</div>
                  </div>
                  {t.status === 'refunded' ? (
                    <span className="flex-none rounded-md bg-lilac-2 px-2 py-1 text-[9px] font-extrabold text-ink-2">{L('Reembolsado', 'Refunded')}</span>
                  ) : fully ? (
                    <span className="flex-none rounded-md bg-green-bg px-2 py-1 text-[9px] font-extrabold text-green-dark">{L('Ingresó', 'In')}</span>
                  ) : (
                    <button onClick={() => runCheckin(t.code, 1)} disabled={checkinBusy} className={`tap-y flex-none cursor-pointer rounded-md px-2.5 py-1 text-[9px] font-extrabold disabled:opacity-50 ${partial ? 'bg-amber-bg text-amber-ink' : 'bg-primary text-white'}`}>+1 {L('admitir', 'admit')}</button>
                  )}
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
        <div className="mx-auto my-4 flex h-[180px] w-[180px] items-center justify-center rounded-tile bg-white p-3.5"><Qr value="TOLATINO" size={150} /></div>
        <div className="text-[12px] font-bold text-white/80">{L('Inicia sesión con tu negocio para validar boletos reales.', 'Sign in with your business to validate real tickets.')}</div>
      </div>
      <div>
        <div className="mb-2.5 px-0.5 text-[12px] font-extrabold text-ink">{L('Lista de check-in', 'Check-in list')}</div>
        <div className="flex flex-col gap-2">
          {attendees.map((a) => {
            const inn = isCheckedIn(a);
            return (
              <div key={a.name} className="flex items-center gap-3 rounded-btn-lg border border-line bg-white p-2.5">
                <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold text-white" style={{ background: a.color }}>{a.initials}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-extrabold text-ink">{a.name}</div>
                  <div className="mt-0.5 text-[9.5px] font-medium text-muted-2">{a.tier}{inn && ` · ${L('ingresó', 'checked in')}`}</div>
                </div>
                {inn ? (
                  <button onClick={() => setCheckedIn((s) => ({ ...s, [a.name]: false }))} className="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-full bg-green-bg" aria-label={L('Deshacer', 'Undo')}>
                    <Check size={13} stroke={3} className="text-green" />
                  </button>
                ) : (
                  <button onClick={() => { setCheckedIn((s) => ({ ...s, [a.name]: true })); flash(L('Ingreso registrado', 'Checked in')); }} className="tap-y flex-none cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-[10px] font-extrabold text-white">{L('Ingresar', 'Check in')}</button>
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
        <button onClick={() => setTierForm((f) => ({ ...f, hidden: !f.hidden }))} className="flex items-center gap-2 text-left">
          <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border-[1.5px] ${tierForm.hidden ? 'border-primary bg-primary' : 'border-lilac-line bg-white'}`}>{tierForm.hidden && <Check size={13} stroke={3} className="text-white" />}</span>
          <span className="text-[11.5px] font-bold text-ink-soft">{L('Oculto — solo visible con código de acceso', 'Hidden — only shown with an access code')}</span>
        </button>
        <button onClick={() => setTierForm((f) => ({ ...f, seat: !f.seat }))} className="flex items-center gap-2 text-left">
          <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border-[1.5px] ${tierForm.seat ? 'border-primary bg-primary' : 'border-lilac-line bg-white'}`}>{tierForm.seat && <Check size={13} stroke={3} className="text-white" />}</span>
          <span className="text-[11.5px] font-bold text-ink-soft">{L('Requiere elegir asiento o mesa', 'Requires picking a seat or table')}</span>
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={saveTier} disabled={tierBusy} className="tap-y flex-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[12px] font-extrabold text-white disabled:opacity-50">{tierBusy ? L('Guardando…', 'Saving…') : L('Guardar', 'Save')}</button>
        <button onClick={() => setTierEdit(null)} className="tap-y cursor-pointer rounded-btn border border-line bg-white px-4 py-2.5 text-[12px] font-extrabold text-ink-soft">{L('Cancelar', 'Cancel')}</button>
        {tierEdit !== 'new' && tierEdit && <button onClick={() => deleteTier(tierEdit)} className="tap tap-y cursor-pointer rounded-btn bg-pink-bg px-4 py-2.5 text-[12px] font-extrabold text-pink-dark">{L('Eliminar', 'Remove')}</button>}
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
            <Ticket size={15} stroke={2.2} className="text-primary-dark" />
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
            <div key={tk.id} className="rounded-btn-lg border border-line bg-white p-3.5">
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

      {realTiers && (
        <div className="mt-4 border-t border-hair pt-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink">
            <Tag size={14} stroke={2.2} className="text-primary-dark" /> {L('Códigos promocionales', 'Promo codes')}
          </div>
          <div className="mb-2.5 text-[10.5px] font-medium leading-snug text-muted-2">{L('“Acceso” desbloquea un nivel oculto (real ya). Los descuentos ajustan el precio apartado; el cobro llega con pagos.', '“Access” unlocks a hidden tier (real now). Discounts adjust the reserved price; charging arrives with payments.')}</div>
          <div className="flex flex-col gap-2">
            {(promoRows ?? []).map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 rounded-btn-lg border border-line bg-white p-2.5">
                <span className="flex-none rounded bg-lilac-2 px-2 py-1 font-mono text-[11px] font-extrabold text-primary-dark">{p.code}</span>
                <div className="min-w-0 flex-1 text-[10.5px] font-bold text-muted-2">
                  {p.kind === 'access' ? L('Acceso', 'Access') : p.kind === 'percent' ? `${p.value}% ${L('desc.', 'off')}` : `$${p.value} ${L('desc.', 'off')}`}
                  {' · '}{p.used}{p.max_uses != null ? `/${p.max_uses}` : ''} {L('usos', 'uses')}
                </div>
                <button onClick={() => deletePromo(p.id)} className="flex-none cursor-pointer text-muted-2 hover:text-pink-dark" aria-label={L('Eliminar', 'Remove')}><Trash2 size={14} stroke={2} /></button>
              </div>
            ))}
          </div>
          {promoAdd ? (
            <div className="mt-2 rounded-btn-lg border-[1.5px] border-primary bg-lilac-3 p-3">
              <input value={promoForm.code} onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder={L('CÓDIGO', 'CODE')} className={`${tierInput} mb-2`} />
              <div className="mb-2 flex gap-1.5">
                {(['percent', 'amount', 'access'] as const).map((k) => (
                  <button key={k} onClick={() => setPromoForm((f) => ({ ...f, kind: k }))} className={chip(promoForm.kind === k)}>{k === 'percent' ? '%' : k === 'amount' ? '$' : L('Acceso', 'Access')}</button>
                ))}
              </div>
              {promoForm.kind === 'access' ? (
                <select value={promoForm.tierId} onChange={(e) => setPromoForm((f) => ({ ...f, tierId: e.target.value }))} className={`${tierInput} mb-2`}>
                  <option value="">{L('Nivel a desbloquear…', 'Tier to unlock…')}</option>
                  {(tierList ?? []).map((t) => <option key={t.id} value={t.id}>{L(t.name_es, t.name_en)}{t.visible ? '' : ` (${L('oculto', 'hidden')})`}</option>)}
                </select>
              ) : (
                <input value={promoForm.value} onChange={(e) => setPromoForm((f) => ({ ...f, value: e.target.value.replace(/[^0-9.]/g, '') }))} inputMode="decimal" placeholder={promoForm.kind === 'percent' ? L('% de descuento', '% off') : L('$ de descuento', '$ off')} className={`${tierInput} mb-2`} />
              )}
              <input value={promoForm.maxUses} onChange={(e) => setPromoForm((f) => ({ ...f, maxUses: e.target.value.replace(/[^0-9]/g, '') }))} inputMode="numeric" placeholder={L('Usos máx · vacío = ilimitado', 'Max uses · blank = unlimited')} className={`${tierInput} mb-2`} />
              <div className="flex gap-2">
                <button onClick={savePromo} disabled={promoBusy} className="tap-y flex-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[12px] font-extrabold text-white disabled:opacity-50">{promoBusy ? L('Guardando…', 'Saving…') : L('Crear código', 'Create code')}</button>
                <button onClick={() => setPromoAdd(false)} className="tap-y cursor-pointer rounded-btn border border-line bg-white px-4 py-2.5 text-[12px] font-extrabold text-ink-soft">{L('Cancelar', 'Cancel')}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setPromoAdd(true)} className="tap-y mt-2 w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 py-2.5 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar código', 'Add code')}</button>
          )}
        </div>
      )}
    </div>
  );

  // ---- Lista de espera ----
  const tierName = (id: string | null) => { const t = (tierList ?? []).find((x) => x.id === id); return t ? L(t.name_es, t.name_en) : L('Cualquiera', 'Any'); };
  const WAIT_STATUS: Record<string, [string, string, string]> = {
    active: ['En espera', 'Waiting', 'bg-amber-bg text-amber-ink'],
    notified: ['Avisado', 'Notified', 'bg-green-bg text-green-dark'],
    converted: ['Compró', 'Bought', 'bg-lilac-2 text-ink-2'],
  };
  const waitlistView = persistable ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-btn-lg bg-lilac-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-extrabold text-ink">{waitlistActive} {L('en espera', 'waiting')}</div>
          <div className="mt-0.5 text-[10px] font-medium leading-snug text-ink-3">{L('Avísales cuando se liberen lugares. Notifica — no aparta; el primero en comprar lo toma.', 'Tell them when spots free up. It notifies — it doesn\'t hold; first to buy takes it.')}</div>
        </div>
        <button onClick={notifyWaitlist} disabled={waitBusy || waitlistActive === 0} className="tap-y flex-none cursor-pointer rounded-btn bg-primary px-3.5 py-2 text-[12px] font-extrabold text-white shadow-cta-sm disabled:opacity-40">{waitBusy ? L('Avisando…', 'Notifying…') : L('Avisar a la lista', 'Notify the list')}</button>
      </div>
      {(waitRows ?? []).length === 0 ? (
        <div className="rounded-card-sm border border-line bg-white py-10 text-center text-[12px] font-semibold text-muted-2">{L('Nadie en lista de espera todavía.', 'No one on the waitlist yet.')}</div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {(waitRows ?? []).map((w) => {
            const st = WAIT_STATUS[w.status] ?? WAIT_STATUS.active;
            return (
              <div key={w.id} className="flex items-center gap-3 rounded-btn-lg border border-line bg-white p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-extrabold text-ink">{w.customer_name || L('Cliente', 'Customer')}</div>
                  <div className="mt-0.5 text-[10px] font-medium text-muted-2">{tierName(w.tier_id)}</div>
                </div>
                <span className={`flex-none rounded-md px-2 py-1 text-[9px] font-extrabold ${st[2]}`}>{L(st[0], st[1])}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  ) : (
    comingSoon(Users, L('Lista de espera', 'Waitlist'), L('Cuando un nivel se agota, los interesados entran a la lista y les avisas al liberarse lugares.', 'When a tier sells out, interested guests join the list and you notify them when spots free up.'))
  );

  // ---- Ajustes ----
  // These controls need payments (refunds/transfers) or notifications (reminders)
  // wired first, so we list them honestly as upcoming instead of faking toggles.
  const upcomingSettings: [string, string][] = [
    [L('Lista de espera', 'Waitlist'), L('Acepta inscritos cuando se llene.', 'Accept signups when full.')],
    [L('Transferir boletos', 'Allow transfers'), L('Los invitados pueden ceder su boleto.', 'Guests can transfer their ticket.')],
    [L('Recordatorio 24h', '24h reminder'), L('Email y push antes del evento.', 'Email + push before the event.')],
    [L('Reembolsos', 'Refunds'), L('Hasta 48h antes del evento.', 'Up to 48h before the event.')],
  ];
  const cancelEvent = async () => {
    if (cancelBusy) return;
    if (persistable && mgEv.dbId && supabase) {
      setCancelBusy(true);
      const { error } = await supabase.rpc('cancel_event', { in_event_id: mgEv.dbId });
      setCancelBusy(false);
      if (error) { flash(L('No se pudo cancelar', "Couldn't cancel")); return; }
      // Soft-cancel: keep the row (tickets preserved), reflect the new status locally.
      setEvents((xs) => xs.map((x) => (x.id === mgEv.id ? { ...x, lifecycle: 'cancelled', status: ['Cancelado', 'Cancelled'], statusBg: '#FDE7EF', statusC: '#D6336C' } : x)));
      flash(L('Evento cancelado — se avisó a los asistentes', 'Event cancelled — attendees notified'));
    } else {
      flash(L('Evento cancelado', 'Event cancelled'));
    }
    setAskCancel(false);
    setView('list');
  };
  const alreadyCancelled = mgEv.lifecycle === 'cancelled';
  const layInput = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[12.5px] font-semibold text-ink outline-none focus:border-primary';
  const layoutEditor = lay && (
    <div className={`${cardCls} p-3.5`}>
      <div className="mb-2 text-[12.5px] font-extrabold text-ink">{L('Mesas, paquetes y detalles', 'Tables, packages & details')}</div>

      {/* seating */}
      <div className="mb-1.5 text-[11px] font-extrabold text-muted-2">{L('Asientos', 'Seating')}</div>
      <div className="flex gap-2">
        {([['none', L('General', 'General')], ['seats', L('Asientos', 'Numbered')], ['tables', L('Mesas', 'Tables')]] as const).map(([k, lb]) => (
          <button key={k} onClick={() => setLayF({ seating: k })} className={`tap-y flex-1 cursor-pointer rounded-btn py-2 text-[11px] font-extrabold ${lay.seating === k ? 'bg-primary text-white' : 'border border-lilac-line bg-white text-ink-2'}`}>{lb}</button>
        ))}
      </div>
      {lay.seating === 'seats' && (
        <div className="mt-2 flex gap-2">
          <input value={lay.rows} onChange={(e) => setLayF({ rows: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder={L('Filas', 'Rows')} className={layInput} />
          <input value={lay.cols} onChange={(e) => setLayF({ cols: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder={L('Por fila', 'Per row')} className={layInput} />
        </div>
      )}
      {lay.seating === 'tables' && (
        <div className="mt-2 flex flex-col gap-2">
          {lay.tables.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2.5 rounded-btn-lg border border-line bg-white p-2">
              <button onClick={() => layPhotoRefs.current[t.id]?.click()} className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-tile border-[1.5px] border-dashed border-lilac-ring bg-lilac-3" style={t.photo ? { backgroundImage: `url(${imgUrl(t.photo, ANCHO.icono)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>{!t.photo && <ImagePlus size={15} stroke={2} className="text-primary-dark" />}</button>
              <input ref={(el) => { layPhotoRefs.current[t.id] = el; }} type="file" accept="image/*" hidden onChange={(e) => uploadLayPhoto(t.id, e.target.files?.[0])} />
              <div className="min-w-0 flex-1"><div className="text-[11px] font-extrabold text-ink">{L('Mesa', 'Table')} {i + 1}</div>
                <div className="mt-1 flex items-center gap-1.5"><span className="text-[10px] font-bold text-muted-2">{L('Personas', 'Seats')}</span><input value={t.cap} onChange={(e) => setLayF({ tables: lay.tables.map((x) => (x.id === t.id ? { ...x, cap: e.target.value.replace(/[^0-9]/g, '') } : x)) })} inputMode="numeric" className="w-14 rounded-field border-[1.5px] border-lilac-line px-2 py-1 text-[12px] font-bold outline-none focus:border-primary" /></div>
              </div>
              <button onClick={() => setLayF({ tables: lay.tables.filter((x) => x.id !== t.id) })} className="flex-none cursor-pointer text-muted-2 hover:text-pink-dark"><Trash2 size={15} stroke={2} /></button>
            </div>
          ))}
          <button onClick={() => setLayF({ tables: [...lay.tables, { id: nextSub(), cap: '4', photo: '' }] })} className="tap-y w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 py-2 text-[11.5px] font-extrabold text-primary-dark">+ {L('Agregar mesa', 'Add table')}</button>
        </div>
      )}

      {/* packages */}
      <div className="mb-1.5 mt-3 text-[11px] font-extrabold text-muted-2">{L('Paquetes', 'Packages')}</div>
      {lay.addons.map((a) => (
        <div key={a.id} className="mb-2 rounded-btn-lg border border-line bg-white p-2.5">
          <div className="flex gap-2"><input value={a.es} onChange={(e) => setLayF({ addons: lay.addons.map((x) => (x.id === a.id ? { ...x, es: e.target.value } : x)) })} placeholder={L('Ej. Paquete botella', 'e.g. Bottle package')} className={`${layInput} flex-1`} /><input value={a.price} onChange={(e) => setLayF({ addons: lay.addons.map((x) => (x.id === a.id ? { ...x, price: e.target.value.replace(/[^0-9.]/g, '') } : x)) })} inputMode="decimal" placeholder="$" className={`${layInput} w-20`} /><button onClick={() => setLayF({ addons: lay.addons.filter((x) => x.id !== a.id) })} className="flex-none cursor-pointer text-muted-2 hover:text-pink-dark"><Trash2 size={15} stroke={2} /></button></div>
          <div className="mt-2 flex gap-2"><button onClick={() => setLayF({ addons: lay.addons.map((x) => (x.id === a.id ? { ...x, required: !x.required } : x)) })} className={`tap-y rounded-full px-3 py-1 text-[10px] font-extrabold ${a.required ? 'bg-amber-bg text-amber-ink' : 'border border-lilac-line bg-white text-ink-2'}`}>{a.required ? L('✓ Obligatorio', '✓ Required') : L('Obligatorio', 'Required')}</button><button onClick={() => setLayF({ addons: lay.addons.map((x) => (x.id === a.id ? { ...x, seatedOnly: !x.seatedOnly } : x)) })} className={`tap-y rounded-full px-3 py-1 text-[10px] font-extrabold ${a.seatedOnly ? 'bg-lilac text-primary-dark' : 'border border-lilac-line bg-white text-ink-2'}`}>{a.seatedOnly ? L('✓ Solo mesas', '✓ Seated only') : L('Solo mesas', 'Seated only')}</button></div>
        </div>
      ))}
      <button onClick={() => setLayF({ addons: [...lay.addons, { id: nextSub(), es: '', price: '', required: false, seatedOnly: lay.seating !== 'none' }] })} className="tap-y w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 py-2 text-[11.5px] font-extrabold text-primary-dark">+ {L('Agregar paquete', 'Add package')}</button>

      {/* program */}
      <div className="mb-1.5 mt-3 text-[11px] font-extrabold text-muted-2">{L('Programa', 'Run of show')}</div>
      {lay.program.map((p) => (
        <div key={p.id} className="mb-2 flex gap-2">
          <input value={p.t} onChange={(e) => setLayF({ program: lay.program.map((x) => (x.id === p.id ? { ...x, t: e.target.value } : x)) })} placeholder="8:00" className={`${layInput} w-20`} />
          <input value={p.es} onChange={(e) => setLayF({ program: lay.program.map((x) => (x.id === p.id ? { ...x, es: e.target.value } : x)) })} placeholder={L('Qué pasa', 'What happens')} className={`${layInput} flex-1`} />
          <button onClick={() => setLayF({ program: lay.program.filter((x) => x.id !== p.id) })} className="flex-none cursor-pointer text-muted-2 hover:text-pink-dark"><Trash2 size={15} stroke={2} /></button>
        </div>
      ))}
      <button onClick={() => setLayF({ program: [...lay.program, { id: nextSub(), t: '', es: '' }] })} className="tap-y w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 py-2 text-[11.5px] font-extrabold text-primary-dark">+ {L('Agregar momento', 'Add moment')}</button>

      {/* tags + details */}
      <div className="mt-3 flex flex-col gap-2">
        <div><label className="mb-1 block text-[10px] font-bold text-muted-2">{L('Etiquetas (separadas por coma)', 'Tags (comma-separated)')}</label><input value={lay.tags} onChange={(e) => setLayF({ tags: e.target.value })} placeholder={L('Salsa, Baile, +21', 'Salsa, Dancing, 21+')} className={layInput} /></div>
        <div className="flex gap-2">
          <div className="flex-1"><label className="mb-1 block text-[10px] font-bold text-muted-2">{L('Edad', 'Age')}</label><input value={lay.age} onChange={(e) => setLayF({ age: e.target.value })} placeholder="+21" className={layInput} /></div>
          <div className="flex-1"><label className="mb-1 block text-[10px] font-bold text-muted-2">{L('Incluye', 'Includes')}</label><input value={lay.includes} onChange={(e) => setLayF({ includes: e.target.value })} placeholder={L('Cover y show', 'Cover & show')} className={layInput} /></div>
        </div>
      </div>

      <button onClick={saveLayout} disabled={layBusy} className="mt-3.5 w-full cursor-pointer rounded-btn-lg bg-primary py-3 text-[13px] font-extrabold text-white disabled:opacity-50">{layBusy ? L('Guardando…', 'Saving…') : L('Guardar cambios', 'Save changes')}</button>
    </div>
  );
  const settingsView = (
    <div className="flex flex-col gap-4">
      {layoutEditor}
      <div className={`${cardCls} p-3.5`}>
        <div className="mb-1 text-[12.5px] font-extrabold text-ink">{L('Más controles en camino', 'More controls on the way')}</div>
        <div className="mb-2.5 text-[10.5px] font-medium leading-snug text-muted-2">{L('Se habilitan al conectar pagos y notificaciones.', 'Unlock once payments and notifications are connected.')}</div>
        {upcomingSettings.map(([title, sub], i) => (
          <div key={title} className={`flex items-center justify-between gap-3 py-3 ${i < upcomingSettings.length - 1 ? 'border-b border-hair' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold text-ink">{title}</div>
              <div className="mt-0.5 text-[10px] font-medium leading-snug text-muted-2">{sub}</div>
            </div>
            <span className="flex-none rounded-full bg-amber-bg px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.04em] text-amber-ink">{L('Muy pronto', 'Soon')}</span>
          </div>
        ))}
      </div>
      {alreadyCancelled ? (
        <div className="rounded-btn-lg bg-pink-bg py-3 text-center text-[12.5px] font-extrabold text-pink-dark">{L('Este evento está cancelado.', 'This event is cancelled.')}</div>
      ) : askCancel ? (
        <div className="rounded-btn-lg border-[1.5px] border-pink-bg bg-white p-3.5">
          <div className="text-[12px] font-bold text-ink">{L('¿Cancelar este evento? Se avisará a quienes ya tienen boleto y dejará de venderse.', 'Cancel this event? Ticket holders will be notified and sales will stop.')}</div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setAskCancel(false)} className="tap-y flex-1 cursor-pointer rounded-btn border border-line bg-white py-2.5 text-[12px] font-extrabold text-ink-soft">{L('No, volver', 'No, go back')}</button>
            <button onClick={cancelEvent} disabled={cancelBusy} className="tap-y flex-1 cursor-pointer rounded-btn bg-pink-dark py-2.5 text-[12px] font-extrabold text-white disabled:opacity-50">{cancelBusy ? L('Cancelando…', 'Cancelling…') : L('Sí, cancelar', 'Yes, cancel')}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAskCancel(true)} className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-pink-bg bg-white py-3 text-[12.5px] font-extrabold text-pink-dark">{L('Cancelar evento', 'Cancel event')}</button>
      )}
    </div>
  );

  const managePage = (
    <ModulePage
      title={mgEv.name}
      subtitle={L('Gestionar evento', 'Manage event')}
      onBack={() => setView('list')}
      maxW={940}
    >
      <SectionTabs
        className="mb-4"
        tabs={manageTabs as SectionTab<typeof manageTab>[]}
        value={manageTab}
        onChange={setManageTab}
      />

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[320px_1fr]">
        <div className="xl:sticky xl:top-0">{heroCard}</div>
        <div>
          {manageTab === 'overview' && overviewView}
          {manageTab === 'attendees' && attendeesView}
          {manageTab === 'checkin' && checkinView}
          {manageTab === 'tickets' && ticketsView}
          {manageTab === 'waitlist' && waitlistView}
          {manageTab === 'settings' && settingsView}
        </div>
      </div>
    </ModulePage>
  );

  // ==================================================================
  // WIZARD — Detalles → Boletos → Fecha/lugar → Revisar
  // ==================================================================
  const upD = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }));

  // Address autocomplete: debounced searchAddress (our free geo pipeline), biased to
  // the current city; picking a suggestion captures the real lat/lng.
  useEffect(() => {
    if (pickedRef.current) { pickedRef.current = false; return; }
    const q = draft.venue.trim();
    if (draft.online || q.length < 3) { addrAbort.current?.abort(); setAddrResults([]); setAddrSearching(false); return; }
    setAddrSearching(true);
    const t = setTimeout(async () => {
      addrAbort.current?.abort();
      const ctrl = new AbortController(); addrAbort.current = ctrl;
      try { setAddrResults(await searchAddress(q, { lat: app.coords.lat, lng: app.coords.lng, city: app.city }, ctrl.signal)); }
      catch { if (!ctrl.signal.aborted) setAddrResults([]); }
      finally { if (!ctrl.signal.aborted) setAddrSearching(false); }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.venue, draft.online]);
  const chooseAddr = async (raw: Address) => {
    pickedRef.current = true;
    upD({ venue: raw.formatted, lat: raw.lat, lng: raw.lng });
    setAddrResults([]);
    if (raw.approx) {
      const exact = await censusGeocode(raw.formatted);
      if (exact && sameAddress(raw.formatted, exact.formatted)) { pickedRef.current = true; upD({ venue: exact.formatted, lat: exact.lat, lng: exact.lng }); }
    }
  };
  const pickCover = async (file: File | null | undefined) => {
    if (!file || !file.type.startsWith('image/') || coverBusy) return;
    setCoverBusy(true);
    try { const url = !persistable || !user || !supabase ? URL.createObjectURL(file) : await uploadImage(file, user.id, 1600); upD({ coverUrl: url }); }
    catch { flash(L('No se pudo subir la foto.', "Couldn't upload the photo.")); }
    setCoverBusy(false);
  };
  const addTier = () => upD({ tiers: [...draft.tiers, { id: nextTid(), name: '', price: '', capacity: '', seat: false }] });
  const setTierField = (id: string, patch: Partial<EventTierDraft>) => upD({ tiers: draft.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const removeTier = (id: string) => { if (draft.tiers.length > 1) upD({ tiers: draft.tiers.filter((t) => t.id !== id) }); };
  // Tables + packages (0113/0115)
  const addTable = () => upD({ tables: [...draft.tables, { id: nextSub(), cap: '4', photo: '' }] });
  const setTable = (id: string, patch: Partial<TableDraft>) => upD({ tables: draft.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const removeTable = (id: string) => upD({ tables: draft.tables.filter((t) => t.id !== id) });
  const tablePhotoRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const uploadTablePhoto = async (id: string, file: File | undefined) => {
    if (!file) return;
    try { const url = !persistable || !user || !supabase ? URL.createObjectURL(file) : await uploadImage(file, user.id, 900); setTable(id, { photo: url }); }
    catch { flash(L('No se pudo subir la foto', 'Could not upload the photo')); }
  };
  const addAddon = () => upD({ addons: [...draft.addons, { id: nextSub(), es: '', price: '', required: false, seatedOnly: draft.seating !== 'none' }] });
  const setAddon = (id: string, patch: Partial<AddonDraft>) => upD({ addons: draft.addons.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const removeAddon = (id: string) => upD({ addons: draft.addons.filter((a) => a.id !== id) });
  const to12h = (hhmm: string) => { if (!hhmm) return ''; const [h, m] = hhmm.split(':').map(Number); if (isNaN(h)) return ''; const ap = h >= 12 ? 'pm' : 'am'; return `${h % 12 || 12}:${String(m ?? 0).padStart(2, '0')} ${ap}`; };
  const wizTimeLabel = draft.startTime ? (draft.endTime ? `${to12h(draft.startTime)} – ${to12h(draft.endTime)}` : to12h(draft.startTime)) : '';
  const wizCat = EVENT_CAT_BY_ID[draft.cat] ?? EVENT_CATS[0];
  const wizCatName = L(wizCat.es, wizCat.en);
  const draftTile = `${wizCat.tile[0]} 0 9px,${wizCat.tile[1]} 9px 18px`;
  const wizStepDefs: [string, string][] = [['details', L('Detalles', 'Details')], ['dateloc', L('Fecha y lugar', 'Date & place')], ['tickets', L('Boletos', 'Tickets')], ['review', L('Revisar', 'Review')]];
  // ready to publish = name + date + at least one named ticket tier
  const eReady = !!draft.name.trim() && !!draft.date && draft.tiers.some((t) => t.name.trim());
  // per-step gate for the "Continuar" button
  const stepValid = wizStep === 0 ? !!draft.name.trim() : wizStep === 1 ? !!draft.date : wizStep === 2 ? draft.tiers.some((t) => t.name.trim()) : true;
  // price range for the preview + review
  const paidPrices = draft.tiers.map((t) => Number(t.price) || 0).filter((p) => p > 0);
  const priceSummary = paidPrices.length ? `${L('Desde', 'From')} $${Math.min(...paidPrices)}` : L('Gratis', 'Free');

  const fieldCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary';
  const labelCls = 'mb-1.5 block text-[11px] font-extrabold text-ink-soft';

  // ── Step 0 · Detalles: cover, name, description, category ──
  const wizStep0 = (
    <div className="flex flex-col gap-3.5">
      <div>
        <label className={labelCls}>{L('Foto de portada', 'Cover photo')}</label>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; pickCover(f); }} />
        <button onClick={() => coverInputRef.current?.click()} className="relative flex h-[132px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-card-sm border-[1.5px] border-dashed border-lilac-ring bg-lilac-3" style={draft.coverUrl ? { backgroundImage: `url(${draft.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `repeating-linear-gradient(135deg,${draftTile})` }}>
          {!draft.coverUrl && (
            <span className="flex flex-col items-center gap-1 text-primary-dark">
              <ImagePlus size={22} stroke={2} />
              <span className="text-[11px] font-extrabold">{coverBusy ? L('Subiendo…', 'Uploading…') : L('Sube una foto', 'Upload a photo')}</span>
            </span>
          )}
          {draft.coverUrl && (
            <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2.5 py-1 text-[10px] font-extrabold text-white">{coverBusy ? L('Subiendo…', 'Uploading…') : L('Cambiar', 'Change')}</span>
          )}
        </button>
      </div>
      <div>
        <label className={labelCls}>{L('Nombre del evento', 'Event name')} *</label>
        <input value={draft.name} onChange={(e) => upD({ name: e.target.value })} placeholder={L('Ej. Cena de Fin de Año', "e.g. New Year's Eve Dinner")} className={fieldCls} />
      </div>
      <div>
        <label className={labelCls}>{L('Descripción', 'Description')}</label>
        <textarea value={draft.desc} onChange={(e) => upD({ desc: e.target.value })} rows={3} placeholder={L('Qué incluye, quién presenta, qué esperar…', "What's included, who hosts, what to expect…")} className={`${fieldCls} resize-none text-[12px] font-medium leading-relaxed`} />
      </div>
      <div>
        <label className={labelCls}>{L('Categoría', 'Category')} *</label>
        <div className="flex flex-wrap gap-x-2 gap-y-[18px]">
          {EVENT_CATS.map((c) => <button key={c.id} onClick={() => upD({ cat: c.id })} className={chip(draft.cat === c.id)}>{L(c.es, c.en)}</button>)}
        </div>
      </div>
    </div>
  );

  // ── Step 1 · Fecha y lugar: real date + start/end time + geo address autofill ──
  const wizStep1 = (
    <div className="flex flex-col gap-3.5">
      <div>
        <label className={labelCls}>{L('Tipo de evento', 'Event type')}</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => upD({ online: false })} className={`tap-y flex-1 cursor-pointer rounded-btn py-2.5 text-[12px] font-extrabold ${!draft.online ? 'bg-primary text-white' : 'border border-lilac-line bg-white text-ink-2'}`}>{L('📍 Presencial', '📍 In person')}</button>
          <button type="button" onClick={() => upD({ online: true })} className={`tap-y flex-1 cursor-pointer rounded-btn py-2.5 text-[12px] font-extrabold ${draft.online ? 'bg-primary text-white' : 'border border-lilac-line bg-white text-ink-2'}`}>{L('💻 En línea', '💻 Online')}</button>
        </div>
      </div>
      <div>
        <label className={labelCls}>{L('Fecha', 'Date')} *</label>
        <input type="date" value={draft.date} onChange={(e) => upD({ date: e.target.value })} className={fieldCls} />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelCls}>{L('Empieza', 'Starts')}</label>
          <input type="time" value={draft.startTime} onChange={(e) => upD({ startTime: e.target.value })} className={fieldCls} />
        </div>
        <div className="flex-1">
          <label className={labelCls}>{L('Termina', 'Ends')}</label>
          <input type="time" value={draft.endTime} onChange={(e) => upD({ endTime: e.target.value })} className={fieldCls} />
        </div>
      </div>
      {draft.online ? (
        <div className="rounded-field border-[1.5px] border-lilac-line bg-lilac-3 px-3.5 py-3 text-[11.5px] font-semibold text-ink-2">
          {L('💻 Evento en línea — no se pide dirección. Comparte el enlace de acceso con los asistentes por mensaje después de la compra.', '💻 Online event — no address needed. Share the access link with attendees by message after purchase.')}
        </div>
      ) : (
        <div className="relative">
          <label className={labelCls}>{L('Dirección', 'Address')}</label>
          <div className="flex items-center gap-2 rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 focus-within:border-primary">
            <MapPin size={15} stroke={2.2} className={draft.lat != null ? 'text-green' : 'text-muted-2'} />
            <input value={draft.venue} onChange={(e) => upD({ venue: e.target.value, lat: null, lng: null })} placeholder={L('Escribe la calle y número…', 'Type the street address…')} className="min-w-0 flex-1 bg-transparent py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted-2" />
            {addrSearching && <RefreshCw size={14} className="animate-spin text-muted-2" />}
            {draft.lat != null && !addrSearching && <Check size={15} stroke={3} className="text-green" />}
          </div>
          {addrResults.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-[220px] w-full overflow-y-auto rounded-field border border-line-strong bg-white p-1 shadow-pop">
              {addrResults.map((a, i) => (
                <button key={`${a.formatted}-${i}`} onClick={() => chooseAddr(a)} className="flex w-full cursor-pointer items-start gap-2 rounded-field p-2.5 text-left hover:bg-app">
                  <MapPin size={14} className="mt-0.5 flex-none text-primary" stroke={2.4} />
                  <span className="min-w-0 text-[12.5px] font-bold text-ink-soft">
                    {a.formatted}
                    {a.verified && <span className="ml-1.5 rounded bg-green-bg px-1.5 py-px text-[9px] font-extrabold text-green-dark">✓ {L('Verificada', 'Verified')}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-1 text-[10px] font-semibold text-muted-2">{draft.lat != null ? L('📍 Ubicación fijada — se mostrará el mapa y "cómo llegar".', '📍 Location set — the map + directions will show.') : L('Elige una sugerencia para fijar el mapa.', 'Pick a suggestion to set the map.')}</div>
        </div>
      )}
    </div>
  );

  // ── Step 2 · Boletos: multi-tier builder ──
  const wizStep2 = (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-medium leading-relaxed text-muted">{L('Agrega uno o más niveles (General, VIP, Niños…). Precio 0 = gratis. Cupo vacío = sin límite.', 'Add one or more tiers (General, VIP, Kids…). Price 0 = free. Blank capacity = unlimited.')}</p>
      {draft.tiers.map((t, i) => (
        <div key={t.id} className="rounded-btn-lg border border-line bg-white p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-lilac"><Ticket size={13} stroke={2} className="text-primary-dark" /></span>
            <span className="text-[11px] font-extrabold text-muted-2">{L('Nivel', 'Tier')} {i + 1}</span>
            {draft.tiers.length > 1 && <button onClick={() => removeTier(t.id)} className="ml-auto cursor-pointer text-muted-2 hover:text-pink-dark" aria-label={L('Quitar', 'Remove')}><Trash2 size={15} stroke={2} /></button>}
          </div>
          <input value={t.name} onChange={(e) => setTierField(t.id, { name: e.target.value })} placeholder={L('Nombre (General, VIP…)', 'Name (General, VIP…)')} className={`${fieldCls} mb-2`} />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-bold text-muted-2">{L('Precio $', 'Price $')}</label>
              <input value={t.price} onChange={(e) => setTierField(t.id, { price: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder={L('0 = gratis', '0 = free')} className={fieldCls} />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-bold text-muted-2">{L('Cupo', 'Capacity')}</label>
              <input value={t.capacity} onChange={(e) => setTierField(t.id, { capacity: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="∞" className={fieldCls} />
            </div>
          </div>
          {draft.seating !== 'none' && (
            <button onClick={() => setTierField(t.id, { seat: !t.seat })} className="tap-y mt-2 flex w-full items-center gap-2 rounded-field bg-lilac-2 px-3 py-2 text-left">
              <span className={`relative h-[22px] w-[38px] flex-none rounded-full transition-colors ${t.seat ? 'bg-primary' : 'bg-muted-faint'}`}><span className="absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all" style={{ left: t.seat ? 19 : 3 }} /></span>
              <span className="text-[11.5px] font-extrabold text-ink">{draft.seating === 'tables' ? L('Requiere elegir mesa', 'Requires a table') : L('Requiere elegir asiento', 'Requires a seat')}</span>
            </button>
          )}
        </div>
      ))}
      <button onClick={addTier} className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 py-3 text-[12.5px] font-extrabold text-primary-dark">+ {L('Agregar otro nivel', 'Add another tier')}</button>

      {/* ── Asientos y mesas (0113/0115) ── */}
      <div className="mt-2 border-t border-hair pt-3">
        <div className="mb-1.5 text-[12.5px] font-extrabold text-ink">{L('Asientos', 'Seating')}</div>
        <div className="flex gap-2">
          {([['none', L('General', 'General')], ['seats', L('Asientos', 'Numbered')], ['tables', L('Mesas', 'Tables')]] as const).map(([k, lab]) => (
            <button key={k} onClick={() => upD({ seating: k })} className={`tap-y flex-1 cursor-pointer rounded-btn py-2.5 text-[11.5px] font-extrabold ${draft.seating === k ? 'bg-primary text-white' : 'border border-lilac-line bg-white text-ink-2'}`}>{lab}</button>
          ))}
        </div>

        {draft.seating === 'seats' && (
          <div className="mt-2.5 flex gap-2">
            <div className="flex-1"><label className="mb-1 block text-[10px] font-bold text-muted-2">{L('Filas', 'Rows')}</label><input value={draft.seatRows} onChange={(e) => upD({ seatRows: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" className={fieldCls} /></div>
            <div className="flex-1"><label className="mb-1 block text-[10px] font-bold text-muted-2">{L('Asientos por fila', 'Seats per row')}</label><input value={draft.seatCols} onChange={(e) => upD({ seatCols: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" className={fieldCls} /></div>
          </div>
        )}

        {draft.seating === 'tables' && (
          <div className="mt-2.5 flex flex-col gap-2">
            {draft.tables.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2.5 rounded-btn-lg border border-line bg-white p-2.5">
                <button onClick={() => tablePhotoRefs.current[t.id]?.click()} className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-tile border-[1.5px] border-dashed border-lilac-ring bg-lilac-3" style={t.photo ? { backgroundImage: `url(${imgUrl(t.photo, ANCHO.icono)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
                  {!t.photo && <ImagePlus size={16} stroke={2} className="text-primary-dark" />}
                </button>
                <input ref={(el) => { tablePhotoRefs.current[t.id] = el; }} type="file" accept="image/*" hidden onChange={(e) => uploadTablePhoto(t.id, e.target.files?.[0])} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-extrabold text-ink">{L('Mesa', 'Table')} {i + 1}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <label className="text-[10px] font-bold text-muted-2">{L('Personas', 'Seats')}</label>
                    <input value={t.cap} onChange={(e) => setTable(t.id, { cap: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" className="w-16 rounded-field border-[1.5px] border-lilac-line bg-white px-2 py-1.5 text-[12px] font-bold text-ink outline-none focus:border-primary" />
                    <span className="text-[9.5px] font-semibold text-muted-2">{t.photo ? L('· foto lista', '· photo set') : L('· toca la foto', '· tap photo')}</span>
                  </div>
                </div>
                <button onClick={() => removeTable(t.id)} className="flex-none cursor-pointer text-muted-2 hover:text-pink-dark" aria-label={L('Quitar', 'Remove')}><Trash2 size={15} stroke={2} /></button>
              </div>
            ))}
            <button onClick={addTable} className="tap-y w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 py-2.5 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar mesa', 'Add table')}</button>
          </div>
        )}
      </div>

      {/* ── Paquetes / complementos (0115) ── */}
      <div className="mt-2 border-t border-hair pt-3">
        <div className="mb-0.5 text-[12.5px] font-extrabold text-ink">{L('Paquetes', 'Packages')}</div>
        <p className="mb-2 text-[11px] font-medium leading-relaxed text-muted">{L('Complementos como “paquete de botella” para mesas. Márcalo obligatorio si es requisito para reservar.', 'Extras like a “bottle package” for tables. Mark it required if it’s a must to reserve.')}</p>
        {draft.addons.map((a) => (
          <div key={a.id} className="mb-2 rounded-btn-lg border border-line bg-white p-3">
            <div className="flex gap-2">
              <input value={a.es} onChange={(e) => setAddon(a.id, { es: e.target.value })} placeholder={L('Ej. Paquete botella', 'e.g. Bottle package')} className={`${fieldCls} flex-1`} />
              <input value={a.price} onChange={(e) => setAddon(a.id, { price: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="$" className={`${fieldCls} w-24`} />
              <button onClick={() => removeAddon(a.id)} className="flex-none cursor-pointer text-muted-2 hover:text-pink-dark" aria-label={L('Quitar', 'Remove')}><Trash2 size={15} stroke={2} /></button>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-[18px]">
              <button onClick={() => setAddon(a.id, { required: !a.required })} className={`tap-y rounded-full px-3 py-1.5 text-[10.5px] font-extrabold ${a.required ? 'bg-amber-bg text-amber-ink' : 'border border-lilac-line bg-white text-ink-2'}`}>{a.required ? L('✓ Obligatorio', '✓ Required') : L('Obligatorio', 'Required')}</button>
              <button onClick={() => setAddon(a.id, { seatedOnly: !a.seatedOnly })} className={`tap-y rounded-full px-3 py-1.5 text-[10.5px] font-extrabold ${a.seatedOnly ? 'bg-lilac text-primary-dark' : 'border border-lilac-line bg-white text-ink-2'}`}>{a.seatedOnly ? L('✓ Solo mesas/asientos', '✓ Seated only') : L('Solo mesas/asientos', 'Seated only')}</button>
            </div>
          </div>
        ))}
        <button onClick={addAddon} className="tap-y w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 py-2.5 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar paquete', 'Add package')}</button>
      </div>

      {/* ── Detalles opcionales ── */}
      <div className="mt-2 border-t border-hair pt-3">
        <div className="flex gap-2">
          <div className="flex-1"><label className="mb-1 block text-[10px] font-bold text-muted-2">{L('Edad', 'Age')}</label><input value={draft.age} onChange={(e) => upD({ age: e.target.value })} placeholder={L('Ej. +21', 'e.g. 21+')} className={fieldCls} /></div>
          <div className="flex-1"><label className="mb-1 block text-[10px] font-bold text-muted-2">{L('Incluye', 'Includes')}</label><input value={draft.includes} onChange={(e) => upD({ includes: e.target.value })} placeholder={L('Ej. Cover y show', 'e.g. Cover & show')} className={fieldCls} /></div>
        </div>
      </div>
    </div>
  );

  // ── Step 3 · Revisar ──
  const reviewRows: [string, string, boolean, number][] = [
    [L('Nombre', 'Name'), draft.name || '—', !!draft.name.trim(), 0],
    [L('Categoría', 'Category'), wizCatName, true, 0],
    [L('Fecha', 'Date'), draft.date ? draft.date + (wizTimeLabel ? ` · ${wizTimeLabel}` : '') : '—', !!draft.date, 1],
    [L('Lugar', 'Place'), draft.online ? L('En línea', 'Online') : draft.venue || '—', draft.online || !!draft.venue, 1],
    [L('Boletos', 'Tickets'), `${draft.tiers.length} ${draft.tiers.length === 1 ? L('nivel', 'tier') : L('niveles', 'tiers')} · ${priceSummary}`, true, 2],
  ];
  const wizStep3 = (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3 rounded-field border p-3" style={{ background: eReady ? '#E3F5EA' : '#FCEFD6', borderColor: eReady ? '#A7E3C0' : '#FDE68A' }}>
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-white text-[14px] font-extrabold" style={{ color: eReady ? '#176B3A' : '#9A6A12' }}>{eReady ? '✓' : '⚠'}</span>
        <div className="flex-1">
          <div className="text-[12px] font-extrabold" style={{ color: eReady ? '#176B3A' : '#9A6A12' }}>{eReady ? L('Listo para publicar', 'Ready to publish') : L('Faltan datos', 'A few essentials missing')}</div>
          <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-ink-3">{eReady ? L('Se pondrá en venta al publicar.', 'It goes on sale when you publish.') : L('Agrega nombre, fecha y al menos un boleto.', 'Add a name, date and at least one ticket.')}</div>
        </div>
      </div>
      <div className="overflow-hidden rounded-field border border-line">
        {reviewRows.map(([k, v, ok, step], i) => (
          <div key={k} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < reviewRows.length - 1 ? 'border-b border-hair' : ''}`}>
            <span className="w-[74px] flex-none text-[10.5px] font-semibold text-muted-2">{k}</span>
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold" style={{ color: ok ? '#1E1B2E' : '#C0BBD0' }}>{v}</span>
            <button onClick={() => setWizStep(step)} className="flex-none cursor-pointer text-[10.5px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
          </div>
        ))}
      </div>
    </div>
  );

  const wizTitles = [L('Detalles del evento', 'Event details'), L('Fecha y ubicación', 'Date & location'), L('Niveles de boleto', 'Ticket tiers'), L('Revisar y publicar', 'Review & publish')];

  const nextId = () => (events.length ? Math.max(...events.map((e) => e.id)) : 0) + 1;

  // Turn the wizard draft into a live event: optimistic local add always, plus a
  // real `create_event` RPC when a signed-in owner is present (demo = local only).
  // ISO start/end from the date + native time inputs (local → UTC).
  const startsAtISO = () => { const d = new Date(`${draft.date}T${draft.startTime || '00:00'}`); return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(); };
  const endsAtISO = () => { if (!draft.endTime || !draft.date) return null; const d = new Date(`${draft.date}T${draft.endTime}`); return isNaN(d.getTime()) ? null : d.toISOString(); };

  // Publish: one atomic create_event_full RPC (event + ALL tiers + cover + geo).
  // Async + returns success so the wizard only shows "published" when it truly is.
  const addFromDraft = async (): Promise<boolean> => {
    const startsAt = startsAtISO();
    const sd = new Date(startsAt);
    const tiers = draft.tiers
      .filter((t) => t.name.trim())
      .map((t) => ({ name: t.name.trim(), price: Number(t.price) || 0, capacity: t.capacity.trim(), seat: draft.seating !== 'none' && !!t.seat }));
    // Seating map (0113/0115): tables carry capacity + optional photo; seats a grid.
    const seatingJson = draft.seating === 'tables'
      ? { type: 'tables', tables: draft.tables.filter((t) => Number(t.cap) > 0).map((t, i) => ({ n: i + 1, cap: Number(t.cap), ...(t.photo ? { photo: t.photo } : {}) })) }
      : draft.seating === 'seats'
        ? { type: 'seats', rows: Math.max(1, Math.min(20, Number(draft.seatRows) || 6)), cols: Math.max(1, Math.min(20, Number(draft.seatCols) || 9)) }
        : null;
    // Packages / add-ons (0115): required = mandatory; seatedOnly → applyTo 'seated'.
    const addonsJson = draft.addons.filter((a) => a.es.trim()).map((a) => ({
      id: a.id, es: a.es.trim(), en: a.es.trim(), price: Number(a.price) || 0,
      required: a.required, applyTo: a.seatedOnly ? 'seated' : 'all',
    }));
    const attrsJson = {
      ...(draft.age.trim() ? { age_es: draft.age.trim(), age_en: draft.age.trim() } : {}),
      ...(draft.includes.trim() ? { includes_es: draft.includes.trim(), includes_en: draft.includes.trim() } : {}),
    };
    const paid = tiers.map((t) => t.price).filter((p) => p > 0);
    const priceLabel = paid.length ? '$' + Math.min(...paid) : null;
    const local: EventRow = {
      id: nextId(),
      name: draft.name.trim() || L('Nuevo evento', 'New event'),
      mon: (es ? MON_ES : MON_EN)[sd.getMonth()],
      day: String(sd.getDate()).padStart(2, '0'),
      time: wizTimeLabel || fmtTime(sd),
      price: priceLabel ?? L('Gratis', 'Free'),
      priceN: paid.length ? Math.min(...paid) : 0,
      sold: 0,
      cap: 48,
      tile: draftTile,
      status: ['Vendiendo', 'Selling'],
      statusBg: '#E3F5EA',
      statusC: '#1F8A4C',
    };
    // Demo mode: local only, always "succeeds".
    if (!(persistable && real && user && supabase)) { setEvents((xs) => [local, ...xs]); return true; }
    // Real owner: optimistic insert, then persist. On failure roll the phantom
    // row back and report it — NEVER show "published" for an event that isn't.
    setEvents((xs) => [local, ...xs]);
    const { error } = await supabase.rpc('create_event_full', {
      p_title: draft.name.trim(),
      p_desc: draft.desc || '',
      p_cat: draft.cat,
      p_starts_at: startsAt,
      p_ends_at: endsAtISO(),
      p_time_label_es: wizTimeLabel,
      p_time_label_en: wizTimeLabel,
      p_venue: draft.online ? L('Evento en línea', 'Online event') : draft.venue,
      p_city: real.city || '',
      p_lat: draft.online ? null : draft.lat,
      p_lng: draft.online ? null : draft.lng,
      p_cover_url: draft.coverUrl || null,
      p_tile_a: wizCat.tile[0],
      p_tile_b: wizCat.tile[1],
      p_tiers: tiers,
      p_seating: seatingJson,
      p_attrs: attrsJson,
      p_addons: addonsJson,
    });
    if (error) {
      setEvents((xs) => xs.filter((x) => x.id !== local.id)); // undo the optimistic row
      flash(L('No se pudo publicar el evento. Revisa los datos e intenta de nuevo.', 'Could not publish the event. Check the details and try again.'));
      return false;
    }
    // Turn ON the events module so the client BizDetail "Eventos" tab appears
    // (founder gating rule: tab shows only if module active AND has content — now
    // both are true). Write the full explicit object, preserving other modules.
    const mods = { ...LISTING_ONLY_MODS, ...(real.modules ?? {}), events: true };
    if (!(real.modules && real.modules.events)) { void admin.update({ modules: mods }); }
    // Reconcile with the DB truth (real slug/id/going_count; backfills dbId).
    const rows = await fetchEvents(user.id); setEvents(rows);
    return true;
  };

  const wizNext = async () => {
    if (wizStep >= wizStepDefs.length - 1) { if (!eReady || wizBusy) return; setWizBusy(true); const ok = await addFromDraft(); setWizBusy(false); if (ok) setView('success'); return; }
    if (!stepValid) return;
    const n = wizStep + 1; setWizStep(n); setWizMax((m) => Math.max(m, n));
  };
  const wizBack = () => { if (wizStep === 0) { setView('list'); return; } setWizStep((s) => s - 1); };
  const canAdvance = wizStep >= wizStepDefs.length - 1 ? eReady : stepValid;

  const wizardPage = (
    <ModulePage
      title={L('Crear evento', 'Create event')}
      subtitle={`${wizCatName} · ${L('Paso ', 'Step ')}${wizStep + 1}${L(' de ', ' of ')}${wizStepDefs.length}`}
      onBack={() => setView('list')}
      backLabel={L('Cancelar', 'Cancel')}
      maxW={940}
      footer={
        <div className="flex items-center gap-3">
          <button onClick={wizBack} className="flex-none cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3.5 text-[12.5px] font-extrabold text-ink">
            {wizStep === 0 ? L('Cancelar', 'Cancel') : L('Atrás', 'Back')}
          </button>
          <button onClick={wizNext} disabled={!canAdvance || wizBusy} className="flex-1 cursor-pointer rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta disabled:cursor-not-allowed disabled:opacity-40">
            {wizStep >= wizStepDefs.length - 1 ? (wizBusy ? L('Publicando…', 'Publishing…') : L('Publicar evento', 'Publish event')) : L('Continuar', 'Continue')}
          </button>
        </div>
      }
    >
      <div className="-my-1.5 py-1.5 no-scrollbar mb-4 flex gap-2 min-w-0 overflow-x-auto pb-0.5">
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
        <div className="overflow-hidden rounded-card-sm border border-line bg-white xl:sticky xl:top-0">
          <div className="relative h-24" style={draft.coverUrl ? { backgroundImage: `url(${draft.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `repeating-linear-gradient(135deg,${draftTile})` }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.55))' }} />
            <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-extrabold text-primary-dark">{wizCatName}</span>
            <div className="absolute bottom-2.5 left-3 right-3">
              <div className="truncate text-[14px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{draft.name || L('Nombre del evento', 'Event name')}</div>
              <div className="text-[10px] font-semibold text-white/85">{(draft.date || L('Fecha por definir', 'Date TBD'))}{wizTimeLabel ? ` · ${wizTimeLabel}` : ''}{draft.online ? ` · ${L('En línea', 'Online')}` : ''}</div>
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
        <Check size={32} stroke={2.6} className="text-green" />
      </div>
      <div className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{(draft.name || L('Nuevo evento', 'New event'))} {L('está activo', 'is live')}</div>
      <div className="mt-2 max-w-[320px] text-[13px] font-medium leading-relaxed text-muted">{L('Los boletos están a la venta y el evento aparece en tu listado.', 'Tickets are on sale and the event is on your listing.')}</div>

      <div className="mt-5 w-full max-w-[420px] overflow-hidden rounded-card-sm border border-line bg-white text-left">
        <div className="relative h-[104px]" style={{ background: `repeating-linear-gradient(135deg,${draftTile})` }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.45))' }} />
          <div className="absolute bottom-2.5 left-3 text-[15px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{draft.name || L('Nuevo evento', 'New event')}</div>
        </div>
        <div className="flex items-center justify-between p-3.5">
          <div className="text-[11.5px] font-medium text-muted-2">{(draft.date || L('Fecha por definir', 'Date TBD'))}{wizTimeLabel ? ` · ${wizTimeLabel}` : ''}</div>
          <span className="flex-none rounded-lg bg-green-bg px-3 py-1.5 text-[10.5px] font-extrabold text-green-dark">{L('En venta', 'On sale')}</span>
        </div>
      </div>

      <div className="mt-5 flex w-full max-w-[420px] flex-col gap-2.5">
        <button onClick={() => { const url = typeof window !== 'undefined' ? `${window.location.origin}/eventos` : ''; if (typeof navigator !== 'undefined' && navigator.clipboard && url) void navigator.clipboard.writeText(url); flash(L('Enlace de eventos copiado', 'Events link copied')); }} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta">
          <Share2 size={16} stroke={2.4} />{L('Compartir eventos', 'Share events')}
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
          <button onClick={() => ctx.go('billing')} className="tap-y flex-none cursor-pointer rounded-[10px] bg-ink px-3.5 py-2 text-[12px] font-extrabold text-white">{L('Verificar', 'Verify')}</button>
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
  return {
    name: '', desc: '', cat: 'musica', coverUrl: '',
    date: '', startTime: '', endTime: '', online: false,
    venue: '', lat: null, lng: null,
    tiers: [{ id: nextTid(), name: 'Entrada general', price: '', capacity: '', seat: false }], vis: 'public',
    seating: 'none', seatRows: '6', seatCols: '9', tables: [], addons: [], age: '', includes: '',
  };
}
