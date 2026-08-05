'use client';

// Eventos (`/eventos`) — Handoff v2: featured banner (purple band), filter
// chips + date chips, event grid with real "Voy" state, detail + tickets.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCalendarPlus as CalendarPlus, IconCheck as Check, IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight, IconMapPin as MapPin, IconNavigation as Navigation, IconShare2 as Share2, IconBuildingStore as Store, IconTag as Tag, IconTicket as Ticket, IconArmchair as Armchair, IconStar as Star, IconStarFilled as StarFilled, IconClock as Clock, IconInfoCircle as InfoCircle, IconUsers as Users } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { useMyActivity } from '@/lib/myActivity';
import { useUrlDetail } from '@/lib/urlView';
import { startMarketplacePayment } from '@/lib/stripe';
import { CheckoutSheet } from '@/components/CheckoutSheet';
import { Qr } from '@/components/Qr';
import { Card, Chip, Overlay, OverlayTitle, Paginacion, PrimaryBtn, SkeletonList } from '@/components/ui';
import { SearchChip } from '@/components/AppHeader';
import { eventTile, EVENT_CATS, EVENT_CAT_BY_ID, type EventItem } from '@/data/fixtures';
import { ReportButton } from '@/components/ReportButton';
import { useLiveData, fetchEventBySlug, searchEvents, eventItemFromPub, fetchEventsByOwner, validatePromo, fetchSeatClaims, fetchEventReviews, postEventReview, type PubEvent, type PubTier, type EventReview } from '@/lib/live';

const PAGE_SIZE = 9;
// Base tab title for the list state — MUST match the static metadata in
// app/(cliente)/eventos/page.tsx so closing an event restores a consistent title.
const LIST_TITLE = "Eventos cerca de ti — To'Latino";


// ── event-detail helpers (full date, calendar, share, directions) ──
const WD_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const WD_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MO_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fullDate = (iso: string): [string, string] => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return ['', ''];
  return [`${WD_ES[d.getDay()]}, ${d.getDate()} de ${MO_ES[d.getMonth()]}`, `${WD_EN[d.getDay()]}, ${MO_EN[d.getMonth()]} ${d.getDate()}`];
};
const pad2 = (n: number) => String(n).padStart(2, '0');
const icsStamp = (d: Date) => `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}00Z`;
// Build + download a standards ICS file — works with Google/Apple/Outlook, no dependency.
const addToCalendar = (o: { title: string; start: string; end: string | null; location: string; desc: string }) => {
  const start = new Date(o.start);
  if (isNaN(start.getTime())) return;
  const end = o.end && !isNaN(new Date(o.end).getTime()) ? new Date(o.end) : new Date(start.getTime() + 2 * 3600 * 1000);
  const esc = (s: string) => s.replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ToLatino//Eventos//ES', 'BEGIN:VEVENT',
    `UID:${start.getTime()}@tolatino`, `DTSTAMP:${icsStamp(new Date())}`, `DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`,
    `SUMMARY:${esc(o.title)}`, `LOCATION:${esc(o.location)}`, `DESCRIPTION:${esc(o.desc)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'evento.ics'; a.click();
  URL.revokeObjectURL(url);
};
// OpenStreetMap directions (no Google billing, per the stack).
const mapsUrl = (lat: number | null, lng: number | null, venue: string) =>
  lat != null && lng != null
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(venue)}`;
// A zero-dependency embedded OSM map (no MapLibre bundle, no Google billing). The
// bbox longitude span is widened by 1/cos(lat) so the pin stays visually centered.
const mapEmbedUrl = (lat: number, lng: number) => {
  const dLat = 0.004;
  const dLng = 0.004 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map((n) => n.toFixed(6)).join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
};
// friendly ES/EN copy for a buy_event_tickets(_multi) error — the RPC names the
// offending tier after a colon (e.g. "sold out: VIP"), which we surface.
const buyErr = (msg: string, L: (a: string, b: string) => string): string => {
  const tier = (msg.split(':')[1] ?? '').trim();
  const s = tier ? ` (${tier})` : '';
  if (/seat taken/i.test(msg)) return L(`Ese asiento ya se ocupó${s} — elige otro`, `That seat was taken${s} — pick another`);
  if (/seats required|seat count mismatch|pick one table|table too small|bad seat|bad table/i.test(msg)) return L('Revisa tu selección de asientos', 'Check your seat selection');
  if (/sold out/i.test(msg)) return L(`Agotado${s} — elige otro nivel`, `Sold out${s} — pick another tier`);
  if (/sales closed/i.test(msg)) return L(`La venta ya cerró${s}`, `Sales are closed${s}`);
  if (/not on sale/i.test(msg)) return L(`Aún no está en venta${s}`, `Not on sale yet${s}`);
  if (/auth/i.test(msg)) return L('Inicia sesión para comprar', 'Sign in to buy');
  if (/cancelled/i.test(msg)) return L('El evento fue cancelado', 'The event was cancelled');
  if (/no tickets|tier not found|not on sale.*event/i.test(msg)) return L('Elige al menos un boleto', 'Pick at least one ticket');
  if (/promo/i.test(msg)) return L('El código promocional ya no es válido', 'The promo code is no longer valid');
  if (/event not found|event not on sale/i.test(msg)) return L('Este evento ya no está disponible', 'This event is no longer available');
  // Any other error → friendly copy (never surface raw DB text to buyers).
  return L('No se pudo completar la compra. Intenta de nuevo.', "Couldn't complete the purchase. Try again.");
};
// Upsert <meta name="description"> — the client half of per-event metadata (browser
// tab/history + Googlebot's JS render; NOT social unfurls, which need SSR).
function setMetaDesc(content: string) {
  if (typeof document === 'undefined') return;
  let m = document.querySelector('meta[name="description"]');
  if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'description'); document.head.appendChild(m); }
  m.setAttribute('content', content);
}

// Seat/table picker (0113). Numbered seats: STAGE bar + rows A.. × cols 1.. with
// free/picked/taken states. Tables: BAR bar + capacity-aware grid, single-select.
// The DB's unique(event_id,seat) is the true arbiter; this is the friendly UI.
function SeatPicker({
  seating, taken, selected, needed, onToggle, onDone, onClose, L,
}: {
  seating: NonNullable<PubEvent['seating']>; taken: string[]; selected: string[]; needed: number;
  onToggle: (id: string) => void; onDone: () => void; onClose: () => void;
  L: (es: string, en: string) => string;
}) {
  const isTables = seating.type === 'tables';
  const ok = isTables ? selected.length === 1 : selected.length === needed;
  return (
    <>
      <OverlayTitle title={isTables ? L('Elige tu mesa', 'Pick your table') : L('Elige tus asientos', 'Pick your seats')} onClose={onClose} />
      {!isTables && seating.type === 'seats' && (
        <>
          <div className="mb-3 rounded-btn bg-ink py-2 text-center text-[10px] font-extrabold uppercase tracking-[.22em] text-white/85">{L('Escenario', 'Stage')}</div>
          {/* Scrolls horizontally on wide maps instead of clipping/overflowing the
              page (mobile non-negotiable). w-max keeps natural width; mx-auto centers
              it when it fits. Seats are 36px for a comfortable tap. */}
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="mx-auto flex w-max flex-col gap-1.5">
              {Array.from({ length: seating.rows }, (_, r) => {
                const letter = String.fromCharCode(65 + r);
                return (
                  <div key={letter} className="flex items-center gap-1.5">
                    <span className="w-3 flex-none text-[10px] font-extrabold text-muted-2">{letter}</span>
                    <div className="flex gap-1.5">
                      {Array.from({ length: seating.cols }, (_, c) => {
                        const id = `${letter}${c + 1}`;
                        const isTaken = taken.includes(id); const isSel = selected.includes(id);
                        return (
                          <button
                            key={id} onClick={() => onToggle(id)} disabled={isTaken} aria-label={id}
                            className={`h-9 w-9 flex-none rounded-[7px] text-[10px] font-extrabold transition-colors ${
                              isTaken ? 'cursor-not-allowed bg-lilac-2 text-muted-faint'
                              : isSel ? 'bg-primary text-white shadow-cta-sm'
                              : 'cursor-pointer border-[1.5px] border-lilac-line bg-white text-ink-soft hover:border-primary'}`}
                          >{c + 1}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-[10.5px] font-bold text-muted-2">
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-[4px] border-[1.5px] border-lilac-line bg-white" />{L('Libre', 'Free')}</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-[4px] bg-primary" />{L('Elegido', 'Picked')}</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-[4px] bg-lilac-2" />{L('Ocupado', 'Taken')}</span>
          </div>
        </>
      )}
      {isTables && seating.type === 'tables' && (
        <>
          <div className="mb-3 rounded-btn bg-ink py-2 text-center text-[10px] font-extrabold uppercase tracking-[.22em] text-white/85">{L('Barra', 'Bar')}</div>
          <div className="grid grid-cols-2 gap-2.5">
            {seating.tables.map((t) => {
              const id = `T${t.n}`; const isTaken = taken.includes(id) || t.cap < needed; const isSel = selected.includes(id);
              return (
                <button
                  key={id} onClick={() => onToggle(id)} disabled={isTaken}
                  className={`flex flex-col overflow-hidden rounded-field border-[1.5px] text-left ${
                    isTaken ? 'cursor-not-allowed border-hair bg-lilac-2/60 opacity-55'
                    : isSel ? 'border-primary bg-lilac-3 shadow-cta-sm'
                    : 'cursor-pointer border-lilac-line bg-white hover:border-primary'}`}
                >
                  {t.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photo} alt="" className="h-[76px] w-full flex-none object-cover" />
                  )}
                  <span className="flex items-center gap-2.5 px-3 py-2.5">
                    <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[13px] font-extrabold ${isSel ? 'bg-primary text-white' : 'bg-lilac-2 text-primary-dark'}`}>{t.n}</span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-extrabold text-ink">{L('Mesa', 'Table')} {t.n}</span>
                      <span className="block text-[10.5px] font-bold text-muted-2">{t.cap} {L('personas', 'people')}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <PrimaryBtn className="mt-5" disabled={!ok} onClick={onDone}>
        {ok ? L('Confirmar', 'Confirm') : isTables ? L('Elige una mesa', 'Pick a table') : L(`Elige ${needed} ${needed === 1 ? 'asiento' : 'asientos'}`, `Pick ${needed} ${needed === 1 ? 'seat' : 'seats'}`)}
      </PrimaryBtn>
    </>
  );
}

export function EventosScreen() {
  const { L, lang } = useLang();
  const app = useApp();
  const { events: EVENTS, refresh: refreshLive, loading: liveLoading } = useLiveData();
  const { user } = useAuth();
  const router = useRouter();
  const act = useMyActivity();
  const [cat, setCat] = useState<string>('all'); // 'all' | 'free' | an EVENT_CATS id
  const [date, setDate] = useState<'all' | string>('all');
  // Detail is an OBJECT, not an index (Negocios pattern) — so a deep-linked or
  // server-only search result (neither is an index into EVENTS) opens correctly.
  const [detailEv, setDetailEv] = useState<EventItem | null>(null);
  const [pub, setPub] = useState<PubEvent | null>(null); // rich detail (tiers/organizer) for a live event
  const [pubLoading, setPubLoading] = useState(false);
  const [tierQty, setTierQty] = useState<Record<string, number>>({}); // per-tier selection
  const [buying, setBuying] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [boughtCode, setBoughtCode] = useState<string | null>(null);
  const [boughtTickets, setBoughtTickets] = useState<{ code: string; name: [string, string] }[]>([]);
  const [page, setPage] = useState(1);
  const [serverEvents, setServerEvents] = useState<EventItem[] | null>(null); // server FTS results while searching
  // promo (migration 0065): access codes unlock a hidden tier; %/$ discounts adjust
  // the snapshotted total (charging lands with payments).
  const [promoInput, setPromoInput] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [promoApplied, setPromoApplied] = useState('');
  const [unlockedTiers, setUnlockedTiers] = useState<PubTier[]>([]);
  const [checkout, setCheckout] = useState<{ clientSecret: string; pendingId: string; amount: number; returnPath: string } | null>(null);
  const [discount, setDiscount] = useState<{ kind: 'percent' | 'amount'; value: number; tierId: string | null } | null>(null);
  // organizer profile sheet
  const [orgOpen, setOrgOpen] = useState(false);
  const [orgEvents, setOrgEvents] = useState<EventItem[] | null>(null);
  const [toast, setToast] = useState('');
  // Seat/table selection (0113). `seatSel` holds seat ids ('A1') or one table ('T3').
  const [seatSel, setSeatSel] = useState<string[]>([]);
  const [seatTaken, setSeatTaken] = useState<string[]>([]);
  const [seatOpen, setSeatOpen] = useState(false);
  const [evReviews, setEvReviews] = useState<EventReview[] | null>(null);
  const [addonSel, setAddonSel] = useState<string[]>([]); // chosen OPTIONAL package ids
  const [revOpen, setRevOpen] = useState(false); // write-review form open
  const [revRating, setRevRating] = useState(5);
  const [revBody, setRevBody] = useState('');
  const [revBusy, setRevBusy] = useState(false);
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 2200);
  };
  const resetPromo = () => { setPromoInput(''); setPromoMsg(null); setPromoApplied(''); setUnlockedTiers([]); setDiscount(null); };
  // The open event lives in the URL (?e=<slug>) so a refresh reopens it, the link is
  // shareable, and the browser Back button closes it. `detailEv` mirrors the URL.
  const { value: evSlug, open: openEv, close: closeEv } = useUrlDetail('e');
  // Set the detail + reset its sub-state, WITHOUT touching the URL (used by both the
  // click path and the URL-driven resolve below, so history isn't pushed twice).
  const applyDetail = (e: EventItem) => { setDetailEv(e); setTierQty({}); setBuying(false); setOrderDone(false); setBoughtCode(null); setBoughtTickets([]); resetPromo(); };
  const openDetail = (e: EventItem) => { applyDetail(e); if (e.slug) openEv(e.slug); };  // click → push ?e= (real events only)
  const closeDetail = () => { setDetailEv(null); setOrderDone(false); setBoughtCode(null); setBoughtTickets([]); resetPromo(); closeEv(); };
  // Sync detailEv when the URL changes WITHOUT a click — deep link, refresh, or
  // Back/Forward. Resolve the slug from the loaded lists first, else fetch it.
  useEffect(() => {
    if (evSlug == null) { setDetailEv(null); return; }
    if (detailEv && detailEv.slug === evSlug) return; // already open via a card click
    const local = [...EVENTS, ...(serverEvents ?? [])].find((x) => x.slug === evSlug);
    if (local) { applyDetail(local); return; }
    let cancelled = false;
    void fetchEventBySlug(evSlug).then((pv) => {
      if (cancelled) return;
      if (pv) applyDetail(eventItemFromPub(pv));
      else { flash(L('Este evento ya no está disponible', 'This event is no longer available')); closeEv(); }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evSlug]);

  const catLabel = (id: string): string => { const c = EVENT_CAT_BY_ID[id]; return c ? L(c.es, c.en) : id; };
  const B = (t: [string, string]) => L(t[0], t[1]); // render a Bi tuple in the active language
  const sl = app.search.trim().toLowerCase();
  const rawQ = app.search.trim();
  // Attendee count without double-counting: live events (slug) already bake the
  // user's RSVP into `going` from the DB, so trust it; only fixture events get the
  // local optimistic +1. Detail uses the fresh `pub.going` when it has loaded.
  const dateKey = (e: EventItem) => (e.iso ? e.iso.slice(0, 10) : `${e.dEs}-${e.day}`);
  const goingCount = (e: EventItem) => (e.slug ? e.going : e.going + (app.going[e.id] ? 1 : 0));

  // Server-side event search (migration 0064): real relevance + fuzzy across the
  // whole radius (not just the ~50-event geo slice), with category/free pushed into
  // SQL so a filtered search can't under-return. Debounced; falls back to the client
  // geo list when the box is empty / offline.
  useEffect(() => {
    if (!rawQ) { setServerEvents(null); return; }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void searchEvents({
        q: rawQ, lat: app.coords?.lat ?? null, lng: app.coords?.lng ?? null,
        cat: cat !== 'all' && cat !== 'free' ? cat : null,
        free: cat === 'free' ? true : null, limit: 60,
      }).then((rows) => { if (!cancelled) setServerEvents(rows); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [rawQ, cat, app.coords?.lat, app.coords?.lng]);

  // (Deep link /eventos?e=<slug> is now handled by useUrlDetail('e') + the resolve
  // effect above — it keeps the URL in sync while the detail is open, so refresh
  // reopens it and Back closes it, instead of stripping the param on mount.)

  // While searching, the server already applied q + cat/free; the client only layers
  // the date chip on top. Empty query → the client filters the geo EVENTS list.
  const usingServer = sl.length > 0 && serverEvents != null;
  const list = useMemo(() => {
    let l = usingServer ? serverEvents!.slice() : EVENTS.slice();
    if (!usingServer) {
      if (sl) l = l.filter((e) => `${e.tEs} ${e.tEn} ${e.lEs} ${e.lEn}`.toLowerCase().includes(sl));
      if (cat === 'free') l = l.filter((e) => e.free);
      else if (cat !== 'all') l = l.filter((e) => e.cat === cat);
    }
    if (date !== 'all') l = l.filter((e) => dateKey(e) === date);
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sl, cat, date, EVENTS, serverEvents, usingServer]);

  // Date chips reflect the ACTIVE list (server results when searching), so a chip
  // always maps to a visible result.
  const dateSrc = usingServer ? (serverEvents ?? []) : EVENTS;
  const dates = useMemo(() => {
    const seen = new Set<string>();
    return dateSrc.filter((e) => {
      const k = dateKey(e);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).map((e) => ({ key: dateKey(e), dEs: e.dEs, day: e.day }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateSrc]);

  // Featured hero: only on the default, unfiltered view — never while searching or
  // filtering (otherwise an unrelated event shows above "Sin resultados"). It's the
  // first of the ACTIVE list, and excluded from the grid below so it isn't duplicated.
  const fe = (usingServer || !!sl || cat !== 'all' || date !== 'all') ? null : list[0];
  const feOn = fe ? (fe.slug ? act.goingSlugs.has(fe.slug) : !!app.going[fe.id]) : false;

  // Pagination over the filtered list (minus the featured hero when it's shown).
  useEffect(() => { setPage(1); }, [sl, cat, date, serverEvents]);
  // A donde sube la vista al cambiar de página (ver <Paginacion>).
  const listaRef = useRef<HTMLDivElement | null>(null);
  const gridList = fe ? list.slice(1) : list;
  const totalPages = Math.max(1, Math.ceil(gridList.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageList = gridList.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
  const detail = detailEv;
  const detailOn = detail ? (detail.slug ? act.goingSlugs.has(detail.slug) : !!app.going[detail.id]) : false;

  // Load the rich event (tiers, organizer, full date, geo) when a live event opens.
  const detailSlug = detail?.slug;
  useEffect(() => {
    if (!detailSlug) { setPub(null); return; }
    let cancelled = false;
    setPub(null); setPubLoading(true);
    fetchEventBySlug(detailSlug).then((p) => { if (!cancelled) { setPub(p); setPubLoading(false); } });
    setSeatSel([]); setSeatTaken([]); setEvReviews(null); setAddonSel([]);
    void fetchSeatClaims(detailSlug).then((s) => { if (!cancelled) setSeatTaken(s); });
    void fetchEventReviews(detailSlug).then((r) => { if (!cancelled) setEvReviews(r); });
    return () => { cancelled = true; };
  }, [detailSlug]);
  const reloadPub = () => { if (detailSlug) void fetchEventBySlug(detailSlug).then(setPub); };
  const reloadSeats = () => { if (detailSlug) void fetchSeatClaims(detailSlug).then(setSeatTaken); };

  // While an event is open, reflect it in the tab title + meta description (browser
  // history + Googlebot's JS render — NOT social unfurls, which need SSR). Restores
  // the list defaults on close/unmount so the base title stays consistent.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (detail) {
      const title = L(detail.tEs, detail.tEn);
      const place = L(detail.lEs, detail.lEn);
      document.title = `${title} — To'Latino`;
      setMetaDesc(L(`${title} en ${place}. Consigue tu lugar en To’Latino.`, `${title} at ${place}. Get your spot on To’Latino.`));
    } else {
      document.title = LIST_TITLE;
      setMetaDesc(L('Conciertos, ferias, talleres y fiestas de la comunidad latina cerca de ti. Consigue boletos, en español.', 'Concerts, fairs, workshops and parties from the Latino community near you. Get tickets, in Spanish.'));
    }
    return () => { if (typeof document !== 'undefined') document.title = LIST_TITLE; };
  }, [detail, L]);

  // tiers = the event's visible tiers + any hidden tier unlocked by an access code.
  const tiers = useMemo(() => {
    const base = pub?.tiers ?? [];
    return [...base, ...unlockedTiers.filter((u) => !base.some((t) => t.id === u.id))];
  }, [pub, unlockedTiers]);
  const hasTiers = tiers.length > 0;
  const cancelled = pub?.status === 'cancelled'; // event_by_slug still resolves cancelled events so we can say so
  const eventPast = pub ? new Date(pub.endsAt ?? new Date(new Date(pub.startsAt).getTime() + 3 * 3600 * 1000).toISOString()) < new Date() : false;
  const tierRemaining = (t: PubTier) => (t.remaining == null ? Infinity : t.remaining);
  const selectedTiers = tiers.filter((t) => (tierQty[t.id] ?? 0) > 0);
  const orderTotal = selectedTiers.reduce((s, t) => s + t.price * (tierQty[t.id] ?? 0), 0);
  const orderQty = selectedTiers.reduce((s, t) => s + (tierQty[t.id] ?? 0), 0);
  const anyPaid = selectedTiers.some((t) => t.price > 0);
  // discount only affects the RESERVED total (snapshot); real charging lands with payments.
  const discountAmount = (() => {
    if (!discount) return 0;
    const gross = selectedTiers.reduce((s, t) => (discount.tierId == null || discount.tierId === t.id ? s + t.price * (tierQty[t.id] ?? 0) : s), 0);
    if (gross <= 0) return 0;
    return discount.kind === 'percent' ? gross * (discount.value / 100) : Math.min(gross, discount.value);
  })();
  const netTotal = Math.max(0, orderTotal - discountAmount);
  // Seats (0113): how many of the selected tickets require a seat/table, and
  // whether the current pick satisfies the event's seat map.
  const seatedQty = selectedTiers.reduce((s, t) => s + (t.seat ? (tierQty[t.id] ?? 0) : 0), 0);
  const seatingType = pub?.seating?.type ?? null;
  const needsSeats = seatedQty > 0 && !!pub?.seating;
  const seatsOk = !needsSeats
    || (seatingType === 'tables' ? seatSel.length === 1 : seatSel.length === seatedQty);
  // Table packages / add-ons (0115): applicable when scope matches; required are
  // always charged, optional only when the buyer picks them. Server re-prices.
  const applicableAddons = (pub?.addons ?? []).filter((a) => a.applyTo === 'all' || (a.applyTo === 'seated' && seatedQty > 0));
  const chosenAddons = applicableAddons.filter((a) => a.required || addonSel.includes(a.id));
  const addonTotal = chosenAddons.reduce((s, a) => s + a.price, 0);
  const toggleAddon = (id: string) => setAddonSel((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  // Paid tickets whose organizer has connected Stripe → charge online (card).
  // The buyer pays the DISCOUNTED subtotal + a 5% service fee (matches what the
  // server re-prices and Stripe charges — the promo IS applied online too, so the
  // preview must use netTotal, not the gross orderTotal, or it over-states the charge).
  // Add-ons make an otherwise-free order paid; charge online when the organizer takes cards.
  const orderHasCost = anyPaid || addonTotal > 0;
  const payOnline = orderHasCost && !!pub?.acceptsPayments;
  const onlineCharge = +(((netTotal + addonTotal) * 1.05)).toFixed(2);
  const cashTotal = +((netTotal + addonTotal)).toFixed(2);

  // Write-a-review eligibility: the buyer must hold a ticket to THIS event (the
  // server post_event_review RPC enforces the same rule). Upsert-based, so this
  // doubles as editing an existing review. Eventbrite/Yelp attendee-verified bar.
  const hasTicketForEvent = !!detailSlug && act.tickets.some((t) => t.events?.slug === detailSlug);
  const submitReview = async () => {
    if (!detailSlug || revBusy) return;
    if (!user) { flash(L('Inicia sesión para reseñar', 'Sign in to review')); return; }
    setRevBusy(true);
    const { error } = await postEventReview(detailSlug, revRating, revBody.trim());
    setRevBusy(false);
    if (error) { flash(L('No se pudo publicar tu reseña', 'Could not post your review')); return; }
    setRevOpen(false); setRevBody('');
    const r = await fetchEventReviews(detailSlug); setEvReviews(r);
    flash(L('¡Gracias por tu reseña!', 'Thanks for your review!'));
  };

  // "Voy" toggle. Live events (with a slug) write attendance via the API — never
  // as a guest (route to /entrar). Fixture events (no slug) keep the local demo
  // behavior. Optimistic app.going keeps the count/label instant either way.
  const rsvpToggle = (e: EventItem) => {
    if (e.slug) {
      if (!user) {
        router.push('/entrar');
        return;
      }
      // refresh the live events after the RSVP writes so the "asisten" count
      // (baked into event.going by the DB) reflects the change without a reload.
      Promise.resolve(act.rsvp(e.slug, !act.goingSlugs.has(e.slug))).then(() => refreshLive());
      return;
    }
    app.toggleGoing(e.id);
  };

  const setQ = (id: string, n: number, max: number) => {
    setTierQty((m) => ({ ...m, [id]: Math.max(0, Math.min(max, n)) }));
    setSeatSel([]); // any qty change invalidates the seat pick (design behavior)
  };
  // Toggle a numbered seat: cap at seatedQty, dropping the oldest when exceeded.
  const toggleSeat = (id: string) => {
    if (seatTaken.includes(id)) return;
    setSeatSel((cur) => {
      if (cur.includes(id)) return cur.filter((s) => s !== id);
      if (seatingType === 'tables') return [id]; // single-select
      const next = [...cur, id];
      return next.length > seatedQty ? next.slice(next.length - seatedQty) : next;
    });
  };

  // Buy the selected tiers in ONE atomic order (buy_event_tickets_multi, migration
  // 0064): every tier is locked + capacity-checked before any ticket is issued, so a
  // tier selling out mid-order can't leave a partial purchase. Surfaces the reason
  // (naming the sold-out tier) on failure.
  const buyNow = async () => {
    if (!pub || buying) return;
    if (pub.status === 'cancelled') { flash(L('Evento cancelado', 'Event cancelled')); return; }
    if (!user) { router.push('/entrar'); return; }
    if (selectedTiers.length === 0) { flash(L('Elige al menos un boleto', 'Pick at least one ticket')); return; }
    if (needsSeats && !seatsOk) { setSeatOpen(true); return; }
    const items = selectedTiers.map((t) => ({ tierId: t.id, qty: tierQty[t.id] ?? 0 }));
    const seats = needsSeats ? seatSel : undefined;
    // Only the chosen OPTIONAL ids — the server always adds required packages.
    const addonIds = applicableAddons.filter((a) => !a.required && addonSel.includes(a.id)).map((a) => a.id);

    // Paid tickets → charge the buyer's card inside OUR own branded sheet (checkout
    // propio SIEMPRE — never Stripe's hosted page). Destination charge to the
    // organizer's connected account minus the To'Latino fee; tickets are issued by
    // the webhook once payment succeeds. Free tiers keep the instant-issue path.
    if (payOnline) {
      setBuying(true);
      const { clientSecret, pendingId, amount, error } = await startMarketplacePayment({ kind: 'ticket', slug: pub.slug, items, promo: promoApplied || undefined, seats, addonIds });
      setBuying(false);
      if (clientSecret && pendingId) {
        setCheckout({ clientSecret, pendingId, amount: amount ?? 0, returnPath: typeof window !== 'undefined' ? window.location.pathname : '/eventos/' });
        return;
      }
      // A seat someone else just took → refresh the map and send them back to pick again.
      if (error === 'seat_taken') { reloadSeats(); setSeatSel([]); setSeatOpen(true); flash(L('Un asiento se acaba de ocupar. Elige otro.', 'A seat was just taken. Pick another.')); return; }
      flash(error ? buyErr(error, L) : L('No se pudo iniciar el pago', 'Could not start payment'));
      return;
    }
    // Paid ticket but the organizer hasn't connected payouts → can't sell online.
    if (anyPaid && !pub.acceptsPayments) {
      flash(L('Venta de boletos no disponible por ahora', 'Ticket sales unavailable right now'));
      return;
    }

    setBuying(true);
    const { error, codes, tickets } = await act.buyTicketsMulti(pub.slug, items, promoApplied || undefined, seats, addonIds);
    setBuying(false);
    if (error) {
      if (/seat taken/i.test(error)) { reloadSeats(); setSeatSel([]); setSeatOpen(true); flash(L('Un asiento se acaba de ocupar. Elige otro.', 'A seat was just taken. Pick another.')); return; }
      reloadPub(); flash(buyErr(error, L)); return;
    }
    // label each issued code with its tier for the success screen
    const named = (tickets ?? []).map((tk) => {
      const t = tiers.find((x) => x.id === tk.tierId);
      return { code: tk.code, name: (t ? t.name : ['Boleto', 'Ticket']) as [string, string] };
    });
    setBoughtTickets(named);
    setBoughtCode(codes?.[0] ?? null);
    setOrderDone(true);
    reloadPub();
  };

  // Apply a promo code: access → unlock a hidden tier; percent/amount → snapshot discount.
  const applyPromo = async () => {
    if (!pub || promoBusy) return;
    const code = promoInput.trim();
    if (!code) return;
    setPromoBusy(true);
    const res = await validatePromo(pub.slug, code);
    setPromoBusy(false);
    if (!res.ok) {
      // The RPC's msg is Spanish-only; localize client-side (Spanish-first, EN secondary).
      const m = (res.msg || '').toLowerCase();
      const text = m.includes('agot') ? L('Código agotado', 'Code fully used')
        : (m.includes('no disponible') || m.includes('evento')) ? L('Evento no disponible', 'Event not available')
        : (m.includes('ingresa') || m.includes('vac')) ? L('Ingresa un código', 'Enter a code')
        : L('Código no válido', 'Invalid code');
      setPromoMsg({ ok: false, text });
      return;
    }
    setPromoApplied(code);
    setPromoMsg({ ok: true, text: L(res.kind === 'access' ? 'Boleto desbloqueado' : 'Código aplicado', res.kind === 'access' ? 'Ticket unlocked' : 'Code applied') });
    if (res.kind === 'access') { setUnlockedTiers((xs) => (xs.some((t) => t.id === res.tier.id) ? xs : [...xs, res.tier])); setDiscount(null); }
    else { setDiscount({ kind: res.kind, value: res.value, tierId: res.tierId }); }
  };

  // Waitlist toggle on a sold-out tier ("Avísame si se libera" — we notify, don't hold).
  const toggleWaitlist = (t: PubTier) => {
    if (!pub) return;
    if (!user) { router.push('/entrar'); return; }
    if (act.waitlistTierIds.has(t.id)) void act.leaveWaitlist(pub.slug, t.id);
    else { void act.joinWaitlist(pub.slug, t.id); flash(L('Te avisamos si se libera un lugar', "We'll tell you if a spot opens")); }
  };

  // Organizer profile: their other upcoming events.
  const openOrganizer = () => {
    if (!detail?.slug) return;
    setOrgOpen(true); setOrgEvents(null);
    void fetchEventsByOwner(detail.slug).then(setOrgEvents);
  };
  const openOrgEvent = (e: EventItem) => { setOrgOpen(false); openDetail(e); };

  // Native share when available (mobile), else copy the link. Builds a deep link to
  // THIS event (/eventos/?e=<slug>) using the current pathname, so the basePath is
  // correct on both the Cloudflare root and the /tolatino GitHub Pages preview.
  const doShare = async (title: string, slug?: string) => {
    let url = '';
    if (typeof window !== 'undefined') {
      const base = `${window.location.origin}${window.location.pathname}`;
      url = slug ? `${base}?e=${encodeURIComponent(slug)}` : base;
    }
    const text = L('Mira este evento en To’Latino', 'Check out this event on To’Latino');
    try {
      if (typeof navigator !== 'undefined' && navigator.share) { await navigator.share({ title, text, url }); return; }
      if (typeof navigator !== 'undefined' && navigator.clipboard) { await navigator.clipboard.writeText(`${title} — ${url}`); flash(L('Enlace copiado', 'Link copied')); }
    } catch { /* user cancelled the share sheet */ }
  };

  const goingBtn = (e: EventItem, big = false) => {
    const on = e.slug ? act.goingSlugs.has(e.slug) : !!app.going[e.id];
    return (
      <button
        onClick={(ev) => {
          ev.stopPropagation();
          rsvpToggle(e);
        }}
        className={`flex-none cursor-pointer rounded-full px-4 py-2 text-[12.5px] font-extrabold ${big ? 'px-5' : ''} ${
          on ? 'bg-green-bg text-green-dark' : 'bg-primary text-white shadow-cta-sm'
        }`}
      >
        {on ? L('Voy ✓', 'Going ✓') : L('Voy', 'Going')}
      </button>
    );
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[20px] font-extrabold tracking-[-.02em] text-ink lg:text-[26px]">{L('Eventos en tu zona', 'Events near you')}</h1>
        <div className="mt-0.5 text-[12.5px] font-semibold text-muted">
          {L('Descubre, asiste y compra boletos para eventos de tu comunidad latina.', 'Discover, attend and buy tickets for your Latino community.')}
        </div>
      </div>

      <SearchChip count={list.length} className="mb-3.5" />

      {/* featured — only when the city actually has an event */}
      {fe && (
      <div
        className="relative mb-[22px] flex cursor-pointer flex-col items-start gap-[18px] overflow-hidden rounded-[22px] p-[22px] shadow-band md:flex-row md:items-center md:gap-[26px] md:p-[28px]"
        // Con portada, la foto va DEBAJO del mismo morado de siempre, ahora
        // translúcido: el destacado se ve como en Eventbrite sin perder la
        // identidad de la tarjeta ni la legibilidad del texto blanco encima.
        // Sin portada se queda exactamente como estaba.
        style={{
          background: fe.cover
            ? `linear-gradient(150deg,rgba(103,67,226,.84),rgba(130,104,255,.68)), center/cover url(${fe.cover})`
            : 'linear-gradient(150deg,#6743E2,#8268FF)',
        }}
        onClick={() => openDetail(fe)}
      >
        <span className="flex h-[68px] w-[68px] flex-none flex-col items-center justify-center rounded-2xl bg-white">
          <span className="text-[10.5px] font-extrabold uppercase text-primary-dark">{fe.dEs}</span>
          <span className="text-[26px] font-extrabold leading-none text-ink">{fe.day}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-1.5 inline-block rounded-full bg-[rgba(255,255,255,.2)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.05em] text-white">
            {L('Destacado', 'Featured')}
          </span>
          <span className="block text-[22px] font-extrabold tracking-[-.02em] text-white md:text-[28px]">{L(fe.tEs, fe.tEn)}</span>
          <span className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-[rgba(255,255,255,.85)]">
            <MapPin size={13} stroke={2.4} />
            {L(fe.lEs, fe.lEn)} · {goingCount(fe)} {L('asisten', 'going')}
          </span>
        </span>
        <button
          onClick={(ev) => {
            ev.stopPropagation();
            if (feOn) rsvpToggle(fe);
            else openDetail(fe);
          }}
          className={`relative flex-none cursor-pointer rounded-[13px] px-6 py-[13px] text-[14px] font-extrabold ${
            feOn ? 'bg-[rgba(255,255,255,.22)] text-white' : 'bg-white text-primary-press'
          }`}
        >
          {feOn ? L('Voy ✓', 'Going ✓') : L('Comprar boleto', 'Get ticket')}
        </button>
      </div>
      )}

      {/* filter chips — all pro categories, horizontally scrollable */}
      <div className="no-scrollbar -mx-3.5 mb-3 flex gap-2 overflow-x-auto px-3.5">
        {[['all', L('Todos', 'All')], ['free', L('Gratis', 'Free')], ...EVENT_CATS.map((c) => [c.id, L(c.es, c.en)] as [string, string])].map(([k, lab]) => (
          <Chip key={k} active={cat === k} onClick={() => setCat(k)}>
            {lab}
          </Chip>
        ))}
      </div>

      {/* date chips */}
      <div className="no-scrollbar -mx-3.5 mb-5 flex gap-2 overflow-x-auto px-3.5">
        <button
          onClick={() => setDate('all')}
          className={`flex min-w-[54px] flex-none cursor-pointer items-center justify-center rounded-tile px-3 py-[9px] text-[12.5px] font-extrabold ${
            date === 'all' ? 'bg-primary text-white shadow-cta-sm' : 'bg-white text-ink-soft shadow-[inset_0_0_0_1px_rgba(30,27,46,.08)]'
          }`}
        >
          {L('Todas', 'All')}
        </button>
        {dates.map((d) => (
          <button
            key={d.key}
            onClick={() => setDate(d.key)}
            className={`flex min-w-[54px] flex-none cursor-pointer flex-col items-center rounded-tile px-3 py-[7px] ${
              date === d.key ? 'bg-primary text-white shadow-cta-sm' : 'bg-white text-ink shadow-[inset_0_0_0_1px_rgba(30,27,46,.08)]'
            }`}
          >
            <span className={`text-[9.5px] font-extrabold uppercase ${date === d.key ? 'text-white/80' : 'text-muted'}`}>{d.dEs}</span>
            <span className="text-[15px] font-extrabold leading-tight">{d.day}</span>
          </button>
        ))}
      </div>

      {/* Explora por categoría — a category grid on the default (unfiltered) view,
          Eventbrite-style. Only categories that actually have events near you. */}
      {cat === 'all' && date === 'all' && !sl && !liveLoading && EVENTS.length > 0 && (() => {
        const withCounts = EVENT_CATS
          .map((c) => ({ c, n: EVENTS.filter((e) => e.cat === c.id).length }))
          .filter((x) => x.n > 0);
        return withCounts.length > 1 ? (
          <div className="mb-5">
            <div className="mb-2.5 text-[13.5px] font-extrabold text-ink">{L('Explora por categoría', 'Explore by category')}</div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
              {withCounts.map(({ c, n }) => (
                <button
                  key={c.id}
                  onClick={() => { setCat(c.id); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="group flex items-center gap-2.5 overflow-hidden rounded-card border border-hair bg-white p-2.5 text-left transition-shadow hover:shadow-card"
                >
                  <span className="h-11 w-11 flex-none rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${c.tile[0]} 0 8px,${c.tile[1]} 8px 16px)` }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-extrabold text-ink">{L(c.es, c.en)}</span>
                    <span className="block text-[10.5px] font-bold text-muted-2">{n} {n === 1 ? L('evento', 'event') : L('eventos', 'events')}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* grid */}
      {liveLoading ? (
        <SkeletonList count={6} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" />
      ) : list.length === 0 ? (
        <Card className="p-10 text-center">
          {EVENTS.length === 0 ? (
            <>
              <div className="text-[15px] font-extrabold text-ink">{L(`Todavía no hay eventos en ${app.cityShort}`, `No events in ${app.cityShort} yet`)}</div>
              <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Sé el primero en crear uno para tu comunidad.', 'Be the first to create one for your community.')}</div>
            </>
          ) : (
            <>
              <div className="text-[15px] font-extrabold text-ink">{L('Sin resultados', 'No results')}</div>
              <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Prueba quitar algunos filtros.', 'Try removing some filters.')}</div>
            </>
          )}
        </Card>
      ) : (
        <div ref={listaRef} data-lista className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pageList.map((e) => (
            <Card
              key={e.slug ?? e.id}
              className="overflow-hidden transition-shadow hover:shadow-card-lg"
              onClick={() => openDetail(e)}
            >
              <div className="relative h-[110px] bg-cover bg-center" style={{ background: e.cover ? `center/cover url(${e.cover})` : eventTile(e) }}>
                <span className="absolute left-3 top-3 flex h-[46px] w-[46px] flex-col items-center justify-center rounded-btn bg-white shadow-card">
                  <span className="text-[9px] font-extrabold uppercase text-primary-dark">{e.dEs}</span>
                  <span className="text-[17px] font-extrabold leading-none text-ink">{e.day}</span>
                </span>
                <span
                  className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold"
                  style={{ background: e.free ? '#E3F5EA' : '#FCEFD6', color: e.free ? '#1F8A4C' : '#9A6A12' }}
                >
                  {e.free ? L('Gratis', 'Free') : e.price}
                </span>
              </div>
              <div className="p-3.5">
                <div className="text-[10px] font-extrabold uppercase tracking-[.05em] text-muted">{catLabel(e.cat)}</div>
                <div className="mt-1 text-[15px] font-extrabold text-ink">{L(e.tEs, e.tEn)}</div>
                <div className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-muted">
                  <MapPin size={12} stroke={2.4} />
                  {L(e.lEs, e.lEn)}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-hair pt-3">
                  <span className="text-[11.5px] font-bold text-muted-2">
                    {goingCount(e)} {L('asisten', 'going')}
                  </span>
                  {goingBtn(e)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Paginacion page={curPage} totalPages={totalPages} onChange={setPage} listaRef={listaRef} />

      {/* event detail + tickets */}
      <Overlay open={!!detail} onClose={closeDetail} width={480}>
        {detail && !orderDone && (
          <>
            <div className="relative -m-4 mb-3 h-[130px] rounded-t-panel md:-m-5 md:mb-3 md:rounded-t-card" style={{ background: pub?.coverUrl ? `center/cover url(${pub.coverUrl})` : eventTile(detail) }}>
              <span className="absolute left-4 top-4 flex h-[52px] w-[52px] flex-col items-center justify-center rounded-btn bg-white shadow-card">
                <span className="text-[9.5px] font-extrabold uppercase text-primary-dark">{detail.dEs}</span>
                <span className="text-[19px] font-extrabold leading-none text-ink">{detail.day}</span>
              </span>
            </div>
            <OverlayTitle title={L(detail.tEs, detail.tEn)} onClose={closeDetail} />

            {cancelled && (
              <div className="mb-2 rounded-field bg-pink-bg px-3.5 py-2.5 text-[12.5px] font-extrabold text-pink-dark">
                {L('Este evento fue cancelado por el organizador.', 'This event was cancelled by the organizer.')}
              </div>
            )}
            {!cancelled && eventPast && (
              <div className="mb-2 rounded-field bg-lilac-2 px-3.5 py-2.5 text-[12.5px] font-extrabold text-ink-soft">
                {L('Este evento ya terminó.', 'This event has ended.')}
              </div>
            )}

            {/* full date · time */}
            <div className="text-[13px] font-extrabold text-ink">
              {pub ? B(fullDate(pub.startsAt)) : ''}{pub && L(detail.timeEs, detail.timeEn) ? ' · ' : ''}{L(detail.timeEs, detail.timeEn)}
            </div>
            {/* venue + directions */}
            <a
              href={mapsUrl(pub?.lat ?? null, pub?.lng ?? null, L(detail.lEs, detail.lEn))}
              target="_blank" rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1.5 text-[12.5px] font-bold text-primary-dark"
            >
              <MapPin size={13} stroke={2.4} />
              <span className="min-w-0 flex-1 truncate">{L(detail.lEs, detail.lEn)}</span>
              <Navigation size={12} stroke={2.4} className="flex-none" />
              <span className="flex-none">{L('Cómo llegar', 'Directions')}</span>
            </a>
            {/* embedded venue map (zero-dep OSM) — only when we have coordinates */}
            {pub?.lat != null && pub?.lng != null && (
              <div className="mt-2 overflow-hidden rounded-card border-[1.5px] border-lilac-line">
                <iframe title={L('Mapa del lugar', 'Venue map')} src={mapEmbedUrl(pub.lat, pub.lng)} loading="lazy" className="block h-[168px] w-full" style={{ border: 0 }} />
              </div>
            )}
            {/* organizer + attendee count */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] font-bold text-muted-2">
              {pub && <span>{L('Por', 'By')} <button onClick={openOrganizer} className="cursor-pointer font-extrabold text-primary-dark hover:underline">{pub.organizer}</button></span>}
              <span>· {pub ? pub.going : goingCount(detail)} {L('asisten', 'going')}</span>
              <span>· {catLabel(detail.cat)}</span>
            </div>

            {/* add-to-calendar · share */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => addToCalendar({ title: L(detail.tEs, detail.tEn), start: pub?.startsAt ?? '', end: pub?.endsAt ?? null, location: L(detail.lEs, detail.lEn), desc: L(detail.descEs, detail.descEn) })}
                disabled={!pub}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-2.5 text-[12px] font-extrabold text-ink-soft disabled:opacity-40"
              >
                <CalendarPlus size={15} stroke={2.2} /> {L('Calendario', 'Calendar')}
              </button>
              <button
                onClick={() => doShare(L(detail.tEs, detail.tEn), detail.slug)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-2.5 text-[12px] font-extrabold text-ink-soft"
              >
                <Share2 size={15} stroke={2.2} /> {L('Compartir', 'Share')}
              </button>
              {detail.slug && (
                <ReportButton type="event" id={detail.slug} variant="icon"
                  className="h-[42px] w-[42px] flex-none rounded-btn-lg border-[1.5px] border-lilac-line bg-white" />
              )}
            </div>

            <div className="mt-3 border-t border-hair pt-3">
              <div className="mb-1.5 text-[13.5px] font-extrabold text-ink">{L('Acerca del evento', 'About the event')}</div>
              <div className="text-[13.5px] font-medium leading-[1.55] text-ink-soft">{L(detail.descEs, detail.descEn)}</div>
              {/* topic tags (events.attrs) */}
              {(() => {
                const tags = pub ? (lang === 'es' ? pub.attrs.tagsEs : pub.attrs.tagsEn) ?? pub.attrs.tagsEs ?? [] : [];
                return tags.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {tags.map((tg) => (
                      <span key={tg} className="rounded-full bg-lilac-2 px-2.5 py-1 text-[10.5px] font-extrabold text-primary-dark">{tg}</span>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>

            {/* "Lo que puedes esperar" — age / includes / schedule from attrs */}
            {pub && (() => {
              const rows = [
                { Icon: Clock, t: L('Horario', 'Schedule'), v: L(pub.attrs.scheduleEs ?? '', pub.attrs.scheduleEn ?? pub.attrs.scheduleEs ?? '') },
                { Icon: Users, t: L('Edad', 'Age'), v: L(pub.attrs.ageEs ?? '', pub.attrs.ageEn ?? pub.attrs.ageEs ?? '') },
                { Icon: InfoCircle, t: L('Incluye', 'Includes'), v: L(pub.attrs.includesEs ?? '', pub.attrs.includesEn ?? pub.attrs.includesEs ?? '') },
              ].filter((r) => r.v.trim());
              return rows.length > 0 ? (
                <div className="mt-3 border-t border-hair pt-3">
                  <div className="mb-2 text-[13.5px] font-extrabold text-ink">{L('Lo que puedes esperar', 'What to expect')}</div>
                  <div className="flex flex-col gap-2.5">
                    {rows.map((r) => (
                      <div key={r.t} className="flex items-start gap-2.5">
                        <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-lilac-2"><r.Icon size={16} stroke={2.2} className="text-primary-dark" /></span>
                        <span className="min-w-0"><span className="block text-[12.5px] font-extrabold text-ink">{r.t}</span><span className="block text-[12px] font-medium leading-snug text-ink-soft">{r.v}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* "Programa" — run-of-show timeline (attrs.lineup) */}
            {pub && Array.isArray(pub.attrs.lineup) && pub.attrs.lineup.length > 0 && (
              <div className="mt-3 border-t border-hair pt-3">
                <div className="mb-2 text-[13.5px] font-extrabold text-ink">{L('Programa', 'Run of show')}</div>
                <div className="flex flex-col">
                  {pub.attrs.lineup.map((it, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="w-[52px] flex-none pt-0.5 text-right text-[11px] font-extrabold text-primary-dark">{it.t}</span>
                      <span className="relative flex flex-none flex-col items-center">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                        {i < pub.attrs.lineup!.length - 1 && <span className="w-[1.5px] flex-1 bg-lilac-line" />}
                      </span>
                      <span className="min-w-0 flex-1 pb-3.5">
                        <span className="block text-[12.5px] font-extrabold text-ink">{L(it.es, it.en)}</span>
                        {(it.desEs || it.desEn) && <span className="block text-[11.5px] font-medium leading-snug text-muted">{L(it.desEs ?? '', it.desEn ?? it.desEs ?? '')}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* "Organizado por" — host card with rating + events + follow-through */}
            {pub && (
              <div className="mt-3 flex items-center gap-3 rounded-card border border-hair bg-white p-3">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-lilac-2 text-[14px] font-extrabold text-primary-dark">
                  {pub.organizer.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[13px] font-extrabold text-ink">
                    <span className="truncate">{pub.organizer}</span>
                    {pub.organizerVerified && <Check size={13} stroke={3} className="flex-none text-primary" />}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-2">
                    {pub.organizerRating != null && <span className="flex items-center gap-0.5"><StarFilled size={11} className="text-amber" />{pub.organizerRating.toFixed(1)}</span>}
                    <span>· {pub.organizerEvents} {L('eventos', 'events')}</span>
                  </div>
                </div>
                <button onClick={openOrganizer} className="flex-none cursor-pointer rounded-full border-[1.5px] border-lilac-line bg-white px-3.5 py-1.5 text-[11.5px] font-extrabold text-primary-dark">
                  {L('Ver', 'View')}
                </button>
              </div>
            )}

            {/* "Reseñas" — event reviews (attendee-verified). Shows when there are
                reviews OR the buyer holds a ticket (so they can leave the first one). */}
            {pub && (( evReviews && evReviews.length > 0) || hasTicketForEvent) && (
              <div className="mt-3 border-t border-hair pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13.5px] font-extrabold text-ink">{L('Reseñas', 'Reviews')}</span>
                  {pub.reviewAvg != null && pub.reviewCount ? (
                    <span className="flex items-center gap-1 text-[12px] font-extrabold text-ink">
                      <StarFilled size={13} className="text-amber" />{pub.reviewAvg.toFixed(1)}
                      <span className="font-bold text-muted-2">({pub.reviewCount})</span>
                    </span>
                  ) : null}
                </div>
                {/* Attendee CTA / inline form */}
                {hasTicketForEvent && (revOpen ? (
                  <div className="mb-3 rounded-card-sm border border-lilac-line bg-lilac-3 p-3">
                    <div className="mb-2 flex items-center gap-1.5">
                      {Array.from({ length: 5 }, (_, s) => (
                        <button key={s} type="button" aria-label={`${s + 1}`} onClick={() => setRevRating(s + 1)} className="cursor-pointer p-0.5">
                          {s < revRating ? <StarFilled size={24} className="text-amber" /> : <Star size={24} stroke={2} className="text-muted-faint" />}
                        </button>
                      ))}
                    </div>
                    <textarea value={revBody} onChange={(e) => setRevBody(e.target.value)} rows={3} maxLength={600} placeholder={L('Cuenta cómo estuvo el evento (opcional)', 'Tell others how the event was (optional)')} className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[13px] font-medium text-ink outline-none focus:border-primary" />
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setRevOpen(false)} className="flex-none cursor-pointer rounded-btn border border-lilac-line bg-white px-4 py-2 text-[12px] font-extrabold text-ink-2">{L('Cancelar', 'Cancel')}</button>
                      <button type="button" onClick={submitReview} disabled={revBusy} className="flex-1 cursor-pointer rounded-btn bg-primary py-2 text-[12.5px] font-extrabold text-white disabled:opacity-50">{revBusy ? L('Publicando…', 'Posting…') : L('Publicar reseña', 'Post review')}</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setRevOpen(true)} className="mb-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-btn border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 py-2.5 text-[12px] font-extrabold text-primary-dark">
                    <Star size={14} stroke={2.4} /> {L('Escribir una reseña', 'Write a review')}
                  </button>
                ))}
                {evReviews && evReviews.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {evReviews.slice(0, 4).map((rv, i) => (
                      <div key={rv.id || i} className="rounded-card-sm border border-hair bg-white p-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-lilac-2 text-[10px] font-extrabold text-primary-dark">{rv.initials}</span>
                          <span className="min-w-0 flex-1 truncate text-[12px] font-extrabold text-ink">{rv.name}</span>
                          <span className="flex flex-none gap-0.5">
                            {Array.from({ length: 5 }, (_, s) => s < rv.rating
                              ? <StarFilled key={s} size={11} className="text-amber" />
                              : <Star key={s} size={11} stroke={2} className="text-muted-faint" />)}
                          </span>
                        </div>
                        {L(rv.body[0], rv.body[1]).trim() && <div className="mt-1.5 text-[12px] font-medium leading-snug text-ink-soft">{L(rv.body[0], rv.body[1])}</div>}
                        <div className="mt-1.5 flex justify-end"><ReportButton type="event_review" id={rv.id} /></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-card-sm border border-dashed border-hair bg-app/50 py-4 text-center text-[12px] font-semibold text-muted-2">{L('Sé el primero en reseñar este evento.', 'Be the first to review this event.')}</div>
                )}
              </div>
            )}

            {/* tickets (tiers) vs free RSVP */}
            {detail.slug && hasTiers ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-1.5 text-[13.5px] font-extrabold text-ink">
                  <Ticket size={16} stroke={2.2} className="text-primary" /> {L('Boletos', 'Tickets')}
                </div>
                <div className="flex flex-col gap-2">
                  {tiers.map((t) => {
                    const left = tierRemaining(t);
                    const soldOut = left <= 0;
                    const q = tierQty[t.id] ?? 0;
                    const max = Math.min(10, left === Infinity ? 10 : left);
                    return (
                      <div key={t.id} className={`rounded-field border-[1.5px] px-3.5 py-2.5 ${soldOut ? 'border-hair bg-lilac-2/40 opacity-70' : 'border-lilac-line bg-white'}`}>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-extrabold text-ink">{B(t.name)}</div>
                            <div className="text-[11.5px] font-bold text-muted-2">
                              {t.price > 0 ? `$${t.price.toFixed(2)}` : L('Gratis', 'Free')}
                              {t.remaining != null && !soldOut && t.remaining <= 10 ? ` · ${t.remaining} ${L('disponibles', 'left')}` : ''}
                            </div>
                          </div>
                          {soldOut ? (
                            <button
                              onClick={() => toggleWaitlist(t)}
                              className={`flex-none cursor-pointer rounded-full px-3 py-1.5 text-[10.5px] font-extrabold ${act.waitlistTierIds.has(t.id) ? 'bg-green-bg text-green-dark' : 'bg-primary text-white shadow-cta-sm'}`}
                            >
                              {act.waitlistTierIds.has(t.id) ? L('En espera ✓', 'Waiting ✓') : L('Avísame', 'Notify me')}
                            </button>
                          ) : (
                            <span className="flex flex-none items-center gap-2.5 rounded-full bg-lilac-2 px-2 py-1">
                              <button onClick={() => setQ(t.id, q - 1, max)} disabled={q <= 0} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-[15px] font-extrabold text-ink disabled:opacity-40">−</button>
                              <span className="w-4 text-center text-[13px] font-extrabold">{q}</span>
                              <button onClick={() => setQ(t.id, q + 1, max)} disabled={q >= max} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-[15px] font-extrabold text-ink disabled:opacity-40">+</button>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {tiers.some((t) => tierRemaining(t) <= 0) && (
                  <div className="mt-2 text-[10.5px] font-semibold leading-snug text-muted-2">
                    {L('¿Agotado? Toca “Avísame” y te avisamos si se libera — no lo apartamos, el primero en comprar lo toma.', "Sold out? Tap “Notify me” and we'll tell you if a spot opens — we don't hold it, first to buy takes it.")}
                  </div>
                )}

                {/* promo code (access unlocks a hidden tier; %/$ adjust the reserved total) */}
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary">
                      <Tag size={14} stroke={2.2} className="flex-none text-muted-2" />
                      <input
                        value={promoInput}
                        onChange={(e) => { setPromoInput(e.target.value); setPromoMsg(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') applyPromo(); }}
                        placeholder={L('Código promocional', 'Promo code')}
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-[12.5px] font-bold uppercase text-ink outline-none placeholder:font-semibold placeholder:normal-case placeholder:text-muted-2"
                      />
                    </div>
                    <button onClick={applyPromo} disabled={promoBusy || !promoInput.trim()} className="flex-none cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white px-4 py-2.5 text-[12px] font-extrabold text-primary-dark disabled:opacity-40">
                      {promoBusy ? '…' : L('Aplicar', 'Apply')}
                    </button>
                  </div>
                  {promoMsg && (
                    <div className={`mt-1 text-[10.5px] font-bold ${promoMsg.ok ? 'text-green-dark' : 'text-pink-dark'}`}>{promoMsg.ok ? '✓ ' : ''}{promoMsg.text}</div>
                  )}
                </div>

                {orderQty > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1 rounded-field bg-lilac-2 px-3.5 py-2 text-[12.5px] font-bold text-ink-2">
                    <div className="flex items-center justify-between">
                      <span>{orderQty} {orderQty === 1 ? L('boleto', 'ticket') : L('boletos', 'tickets')}</span>
                      {orderHasCost ? (
                        <span className="flex items-center gap-1.5">
                          {discountAmount > 0 && <span className="text-[11px] font-semibold text-muted-2 line-through">${(orderTotal + addonTotal).toFixed(2)}</span>}
                          <span className="text-[14px] font-extrabold text-ink">${cashTotal.toFixed(2)}</span>
                        </span>
                      ) : (
                        <span className="text-[14px] font-extrabold text-ink">{L('Gratis', 'Free')}</span>
                      )}
                    </div>
                    {chosenAddons.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-[10.5px] font-bold text-muted">
                        <span>+ {L(a.es, a.en)}{a.required ? ` · ${L('incluido', 'included')}` : ''}</span>
                        <span>${a.price.toFixed(2)}</span>
                      </div>
                    ))}
                    {discountAmount > 0 && <div className="text-[10.5px] font-bold text-green-dark">{L('Descuento aplicado', 'Discount applied')} · −${discountAmount.toFixed(2)}</div>}
                  </div>
                )}

                {/* Table packages / add-ons (0115) — required shown as included, optional toggleable */}
                {applicableAddons.length > 0 && orderQty > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    <div className="text-[11px] font-extrabold uppercase tracking-[.04em] text-muted-2">{L('Paquetes', 'Packages')}</div>
                    {applicableAddons.map((a) => {
                      const on = a.required || addonSel.includes(a.id);
                      return (
                        <button
                          key={a.id} onClick={() => !a.required && toggleAddon(a.id)} disabled={a.required}
                          className={`flex items-center gap-2.5 rounded-field border-[1.5px] px-3 py-2 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'} ${a.required ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-md ${on ? 'bg-primary' : 'border-[1.5px] border-lilac-line bg-white'}`}>
                            {on && <Check size={12} stroke={3} className="text-white" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-extrabold text-ink">{L(a.es, a.en)}{a.required && <span className="ml-1 rounded bg-amber-bg px-1 py-px text-[8.5px] font-extrabold text-amber-ink">{L('Obligatorio', 'Required')}</span>}</span>
                            {(a.descEs || a.descEn) && <span className="block truncate text-[10.5px] font-medium text-muted-2">{L(a.descEs ?? '', a.descEn ?? a.descEs ?? '')}</span>}
                          </span>
                          <span className="flex-none text-[12px] font-extrabold text-ink">${a.price.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Seat / table selection — only when a picked tier is seated (0113). */}
                {needsSeats && (
                  <button
                    onClick={() => setSeatOpen(true)}
                    className={`mt-2.5 flex w-full items-center gap-2.5 rounded-field border-[1.5px] px-3.5 py-2.5 text-left ${seatsOk ? 'border-green bg-green-bg' : 'border-lilac-ring bg-lilac-3'}`}
                  >
                    <Armchair size={17} stroke={2.2} className={`flex-none ${seatsOk ? 'text-green-dark' : 'text-primary'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-extrabold text-ink">
                        {seatingType === 'tables' ? L('Elige tu mesa', 'Pick your table') : L('Elige tus asientos', 'Pick your seats')}
                      </span>
                      <span className="block truncate text-[11px] font-bold text-muted-2">
                        {seatsOk
                          ? (seatingType === 'tables' ? `${L('Mesa', 'Table')} ${seatSel[0]?.slice(1)}` : seatSel.join(' · '))
                          : (seatingType === 'tables' ? L('Toca para elegir', 'Tap to choose') : L(`Faltan ${seatedQty - seatSel.length} de ${seatedQty}`, `${seatedQty - seatSel.length} of ${seatedQty} left`))}
                      </span>
                    </span>
                    {seatsOk ? <Check size={16} stroke={3} className="flex-none text-green-dark" /> : <ChevronRight size={16} stroke={2.4} className="flex-none text-primary" />}
                  </button>
                )}

                <PrimaryBtn className="mt-3" disabled={buying || orderQty === 0 || cancelled || eventPast} onClick={buyNow}>
                  {cancelled ? L('Evento cancelado', 'Event cancelled') : eventPast ? L('Evento terminado', 'Event ended') : buying ? L('Procesando…', 'Processing…') : orderQty === 0 ? L('Elige tus boletos', 'Pick your tickets') : (needsSeats && !seatsOk) ? (seatingType === 'tables' ? L('Elige tu mesa', 'Pick your table') : L('Elige tus asientos', 'Pick your seats')) : payOnline ? `${L('Pagar', 'Pay')} ${orderQty} · $${onlineCharge.toFixed(2)}` : orderHasCost ? `${L('Reservar', 'Reserve')} ${orderQty} · $${cashTotal.toFixed(2)}` : `${L('Obtener', 'Get')} ${orderQty}`}
                </PrimaryBtn>
                {orderHasCost && (
                  <div className="mt-1.5 text-center text-[10.5px] font-semibold text-muted-2">
                    {payOnline
                      ? L('Pago seguro con tarjeta · incluye 5% de tarifa de servicio.', 'Secure card payment · includes a 5% service fee.')
                      : discountAmount > 0
                        ? L('Precio con descuento apartado; el cobro se habilita al conectar pagos.', 'Discounted price reserved; charging turns on once payments are connected.')
                        : L('Apartas tu lugar ahora; el cobro se habilita al conectar pagos.', 'Reserve now; charging turns on once payments are connected.')}
                  </div>
                )}
              </div>
            ) : (
              <>
                {detail.slug && pubLoading && <div className="mt-4 text-center text-[12px] font-semibold text-muted-2">{L('Cargando boletos…', 'Loading tickets…')}</div>}
                <PrimaryBtn
                  className={`mt-4 ${detailOn ? '!bg-green-bg !text-green-dark !shadow-none' : ''}`}
                  disabled={cancelled || eventPast}
                  onClick={() => rsvpToggle(detail)}
                >
                  {cancelled ? L('Evento cancelado', 'Event cancelled') : eventPast ? L('Evento terminado', 'Event ended') : detailOn ? L('Voy ✓', 'Going ✓') : L('Asistir · Gratis', 'Attend · Free')}
                </PrimaryBtn>
              </>
            )}
          </>
        )}
        {detail && orderDone && (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
              <Check size={28} stroke={3} className="text-green" />
            </span>
            <div className="mt-4 text-[19px] font-extrabold text-ink">
              {anyPaid ? L('¡Boletos reservados!', 'Tickets reserved!') : L('¡Boletos confirmados!', 'Tickets confirmed!')}
            </div>
            {boughtTickets.length > 0 ? (
              <div className="mt-3 flex w-full max-w-[300px] flex-col gap-3">
                {boughtTickets.map((tk, i) => (
                  // Ticket stub with a REAL scannable QR of the entry code (organizer
                  // scans it at the door). A perforated divider splits header ↔ QR.
                  <div key={`${tk.code}-${i}`} className="overflow-hidden rounded-card border-[1.5px] border-dashed border-lilac-ring bg-white">
                    <div className="flex items-center gap-2 bg-lilac-3 px-4 py-2.5 text-left">
                      <Ticket size={14} stroke={2.2} className="flex-none text-primary" />
                      <span className="truncate text-[11px] font-extrabold uppercase tracking-[.06em] text-primary-dark">{B(tk.name)}</span>
                    </div>
                    <div className="relative flex flex-col items-center gap-2 border-t border-dashed border-lilac-line px-4 py-3.5">
                      <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-app" />
                      <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-app" />
                      <Qr value={tk.code} size={140} />
                      <span className="font-mono text-[15px] font-extrabold tracking-[.14em] text-primary-dark">{tk.code}</span>
                    </div>
                  </div>
                ))}
                <span className="text-[10.5px] font-semibold text-muted-2">{L('Muestra el código QR en la entrada.', 'Show the QR at the door.')}</span>
              </div>
            ) : boughtCode ? (
              <div className="mt-3 w-full max-w-[280px] overflow-hidden rounded-card border-[1.5px] border-dashed border-lilac-ring bg-white">
                <div className="flex flex-col items-center gap-2 px-4 py-4">
                  <Qr value={boughtCode} size={150} />
                  <span className="font-mono text-[16px] font-extrabold tracking-[.14em] text-primary-dark">{boughtCode}</span>
                  <span className="text-[10.5px] font-semibold text-muted-2">{L('Muestra el QR en la entrada', 'Show the QR at the door')}</span>
                </div>
              </div>
            ) : null}
            {seatSel.length > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-field bg-lilac-2 px-3.5 py-2 text-[12.5px] font-extrabold text-primary-dark">
                <Armchair size={15} stroke={2.2} />
                {seatingType === 'tables' ? `${L('Mesa', 'Table')} ${seatSel[0]?.slice(1)}` : `${L('Asientos', 'Seats')}: ${seatSel.join(' · ')}`}
              </div>
            )}
            <div className="mt-3 max-w-[300px] text-[13px] font-semibold leading-relaxed text-muted">
              {L('Encuéntralos en Mi cuenta → Mis boletos, con su código para la entrada.', 'Find them in My account → My tickets, with the code for entry.')}
            </div>
            <PrimaryBtn className="mt-5" onClick={closeDetail}>
              {L('Listo', 'Done')}
            </PrimaryBtn>
          </div>
        )}
      </Overlay>

      {/* seat / table picker (0113) */}
      <Overlay open={seatOpen} onClose={() => setSeatOpen(false)} width={440}>
        {pub?.seating && (
          <SeatPicker
            seating={pub.seating} taken={seatTaken} selected={seatSel} needed={seatedQty}
            onToggle={toggleSeat} onDone={() => setSeatOpen(false)} onClose={() => setSeatOpen(false)} L={L}
          />
        )}
      </Overlay>

      {/* organizer profile — their other upcoming events */}
      <Overlay open={orgOpen} onClose={() => setOrgOpen(false)} width={480}>
        <OverlayTitle title={pub?.organizer ?? L('Organizador', 'Organizer')} onClose={() => setOrgOpen(false)} />
        {pub?.organizerSlug && (
          <button
            onClick={() => router.push(`/negocios/?b=${encodeURIComponent(pub.organizerSlug!)}`)}
            className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-2.5 text-[12px] font-extrabold text-primary-dark"
          >
            <Store size={14} stroke={2.2} /> {L('Ver su negocio', 'View their business')}
          </button>
        )}
        <div className="mb-2 text-[12.5px] font-extrabold text-ink">{L('Otros eventos', 'Other events')}</div>
        {orgEvents == null ? (
          <div className="py-8 text-center text-[12px] font-semibold text-muted-2">{L('Cargando…', 'Loading…')}</div>
        ) : orgEvents.length === 0 ? (
          <div className="py-8 text-center text-[12px] font-semibold text-muted-2">{L('No tiene otros eventos próximos.', 'No other upcoming events.')}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {orgEvents.map((e) => (
              <button key={e.slug ?? e.id} onClick={() => openOrgEvent(e)} className="flex items-center gap-3 rounded-card-sm border border-hair bg-white p-2.5 text-left hover:shadow-card">
                <span className="flex h-11 w-11 flex-none flex-col items-center justify-center rounded-btn" style={{ background: eventTile(e) }}>
                  <span className="text-[8px] font-extrabold uppercase text-primary-dark">{e.dEs}</span>
                  <span className="text-[14px] font-extrabold leading-none text-ink">{e.day}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-extrabold text-ink">{L(e.tEs, e.tEn)}</span>
                  <span className="block truncate text-[11px] font-semibold text-muted-2">{L(e.lEs, e.lEn)} · {e.free ? L('Gratis', 'Free') : e.price}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Overlay>

      {toast && (
        <div className="fixed bottom-[86px] left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-ink px-4 py-3 text-[12.5px] font-bold text-white shadow-modal md:bottom-6">
          <Check size={14} stroke={3} className="text-green" />
          {toast}
        </div>
      )}

      {/* checkout propio: pay for tickets inside our branded sheet (Stripe Payment
          Element), never a hosted-Checkout redirect. */}
      <CheckoutSheet
        open={checkout !== null}
        clientSecret={checkout?.clientSecret ?? null}
        amount={checkout?.amount ?? 0}
        returnPath={checkout?.returnPath ?? '/eventos/'}
        pendingId={checkout?.pendingId ?? ''}
        onClose={() => setCheckout(null)}
      />
    </div>
  );
}
