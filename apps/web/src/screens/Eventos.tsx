'use client';

// Eventos (`/eventos`) — Handoff v2: featured banner (purple band), filter
// chips + date chips, event grid with real "Voy" state, detail + tickets.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Check, MapPin, Navigation, Share2, Ticket } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { useMyActivity } from '@/lib/myActivity';
import { Card, Chip, Overlay, OverlayTitle, PrimaryBtn } from '@/components/ui';
import { SearchChip } from '@/components/AppHeader';
import { eventTile, type EventItem } from '@/data/fixtures';
import { useLiveData, fetchEventBySlug, type PubEvent } from '@/lib/live';

const CAT_LABEL = (L: (a: string, b: string) => string): Record<EventItem['cat'], string> => ({
  musica: L('Vida Nocturna', 'Nightlife'),
  mercado: L('Mercado', 'Market'),
  familia: L('Familia', 'Family'),
  comida: L('Comida', 'Food'),
});

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
// friendly ES/EN copy for a buy_event_tickets error
const buyErr = (msg: string, L: (a: string, b: string) => string): string => {
  if (/sold out/i.test(msg)) return L('Agotado — elige otro nivel', 'Sold out — pick another tier');
  if (/sales closed/i.test(msg)) return L('La venta de este nivel ya cerró', 'Sales for this tier are closed');
  if (/not on sale/i.test(msg)) return L('Este nivel aún no está en venta', 'This tier is not on sale yet');
  if (/auth/i.test(msg)) return L('Inicia sesión para comprar', 'Sign in to buy');
  return L('No se pudo completar la compra', "Couldn't complete the purchase");
};

export function EventosScreen() {
  const { L } = useLang();
  const app = useApp();
  const { events: EVENTS } = useLiveData();
  const { user } = useAuth();
  const router = useRouter();
  const act = useMyActivity();
  const [cat, setCat] = useState<'all' | 'free' | EventItem['cat']>('all');
  const [date, setDate] = useState<'all' | string>('all');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [pub, setPub] = useState<PubEvent | null>(null); // rich detail (tiers/organizer) for a live event
  const [pubLoading, setPubLoading] = useState(false);
  const [tierQty, setTierQty] = useState<Record<string, number>>({}); // per-tier selection
  const [buying, setBuying] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [boughtCode, setBoughtCode] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 2200);
  };
  const openDetail = (id: number) => { setDetailId(id); setTierQty({}); setBuying(false); setOrderDone(false); setBoughtCode(null); };

  const catLabel = CAT_LABEL(L);
  const B = (t: [string, string]) => L(t[0], t[1]); // render a Bi tuple in the active language
  const sl = app.search.trim().toLowerCase();

  const list = useMemo(() => {
    let l = EVENTS.slice();
    if (sl) l = l.filter((e) => `${e.tEs} ${e.tEn} ${e.lEs} ${e.lEn}`.toLowerCase().includes(sl));
    if (cat === 'free') l = l.filter((e) => e.free);
    else if (cat !== 'all') l = l.filter((e) => e.cat === cat);
    if (date !== 'all') l = l.filter((e) => `${e.dEs}-${e.day}` === date);
    return l;
  }, [sl, cat, date, EVENTS]);

  const dates = useMemo(() => {
    const seen = new Set<string>();
    return EVENTS.filter((e) => {
      const k = `${e.dEs}-${e.day}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).map((e) => ({ key: `${e.dEs}-${e.day}`, dEs: e.dEs, day: e.day }));
  }, [EVENTS]);

  const fe = EVENTS[0]; // featured — may be undefined when a city has no events
  const feOn = fe ? (fe.slug ? act.goingSlugs.has(fe.slug) : !!app.going[fe.id]) : false;
  const detail = detailId !== null ? EVENTS[detailId] : null;
  const detailOn = detail ? (detail.slug ? act.goingSlugs.has(detail.slug) : !!app.going[detail.id]) : false;

  // Load the rich event (tiers, organizer, full date, geo) when a live event opens.
  const detailSlug = detail?.slug;
  useEffect(() => {
    if (!detailSlug) { setPub(null); return; }
    let cancelled = false;
    setPub(null); setPubLoading(true);
    fetchEventBySlug(detailSlug).then((p) => { if (!cancelled) { setPub(p); setPubLoading(false); } });
    return () => { cancelled = true; };
  }, [detailSlug]);
  const reloadPub = () => { if (detailSlug) void fetchEventBySlug(detailSlug).then(setPub); };

  const tiers = pub?.tiers ?? [];
  const hasTiers = tiers.length > 0;
  const tierRemaining = (t: PubEvent['tiers'][number]) => (t.remaining == null ? Infinity : t.remaining);
  const selectedTiers = tiers.filter((t) => (tierQty[t.id] ?? 0) > 0);
  const orderTotal = selectedTiers.reduce((s, t) => s + t.price * (tierQty[t.id] ?? 0), 0);
  const orderQty = selectedTiers.reduce((s, t) => s + (tierQty[t.id] ?? 0), 0);
  const anyPaid = selectedTiers.some((t) => t.price > 0);

  // "Voy" toggle. Live events (with a slug) write attendance via the API — never
  // as a guest (route to /entrar). Fixture events (no slug) keep the local demo
  // behavior. Optimistic app.going keeps the count/label instant either way.
  const rsvpToggle = (e: EventItem) => {
    const on = e.slug ? act.goingSlugs.has(e.slug) : !!app.going[e.id];
    if (e.slug) {
      if (!user) {
        router.push('/entrar');
        return;
      }
      void act.rsvp(e.slug, !on);
    }
    app.toggleGoing(e.id);
  };

  const setQ = (id: string, n: number, max: number) => setTierQty((m) => ({ ...m, [id]: Math.max(0, Math.min(max, n)) }));

  // Buy the selected tiers — one capacity-checked RPC call per tier (buy_event_tickets
  // locks the tier + verifies availability). Stops + surfaces the reason on the first
  // failure (e.g. a tier sold out between load and purchase).
  const buyNow = async () => {
    if (!pub || buying) return;
    if (!user) { router.push('/entrar'); return; }
    if (selectedTiers.length === 0) { flash(L('Elige al menos un boleto', 'Pick at least one ticket')); return; }
    setBuying(true);
    let firstCode: string | null = null;
    for (const t of selectedTiers) {
      const { error, code } = await act.buyTickets(pub.slug, t.id, tierQty[t.id] ?? 0);
      if (error) { setBuying(false); reloadPub(); flash(buyErr(error, L)); return; }
      if (code && !firstCode) firstCode = code;
    }
    setBuying(false);
    setBoughtCode(firstCode);
    setOrderDone(true);
    reloadPub();
  };

  // Native share when available (mobile), else copy the link.
  const doShare = async (title: string) => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/eventos` : '';
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
        style={{ background: 'linear-gradient(150deg,#6743E2,#8268FF)' }}
        onClick={() => openDetail(0)}
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
            <MapPin size={13} strokeWidth={2.4} />
            {L(fe.lEs, fe.lEn)} · {fe.going + (feOn ? 1 : 0)} {L('asisten', 'going')}
          </span>
        </span>
        <button
          onClick={(ev) => {
            ev.stopPropagation();
            if (feOn) rsvpToggle(fe);
            else openDetail(0);
          }}
          className={`relative flex-none cursor-pointer rounded-[13px] px-6 py-[13px] text-[14px] font-extrabold ${
            feOn ? 'bg-[rgba(255,255,255,.22)] text-white' : 'bg-white text-primary-press'
          }`}
        >
          {feOn ? L('Voy ✓', 'Going ✓') : L('Comprar boleto', 'Get ticket')}
        </button>
      </div>
      )}

      {/* filter chips */}
      <div className="no-scrollbar -mx-3.5 mb-3 flex gap-2 overflow-x-auto px-3.5">
        {(
          [
            ['all', L('Todos', 'All')],
            ['free', L('Gratis', 'Free')],
            ['musica', catLabel.musica],
            ['comida', catLabel.comida],
            ['familia', catLabel.familia],
            ['mercado', catLabel.mercado],
          ] as const
        ).map(([k, lab]) => (
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

      {/* grid */}
      {list.length === 0 ? (
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <Card
              key={e.id}
              className="overflow-hidden transition-shadow hover:shadow-card-lg"
              onClick={() => openDetail(e.id)}
            >
              <div className="relative h-[110px]" style={{ background: eventTile(e) }}>
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
                <div className="text-[10px] font-extrabold uppercase tracking-[.05em] text-muted">{catLabel[e.cat]}</div>
                <div className="mt-1 text-[15px] font-extrabold text-ink">{L(e.tEs, e.tEn)}</div>
                <div className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-muted">
                  <MapPin size={12} strokeWidth={2.4} />
                  {L(e.lEs, e.lEn)}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-hair pt-3">
                  <span className="text-[11.5px] font-bold text-muted-2">
                    {e.going + (app.going[e.id] ? 1 : 0)} {L('asisten', 'going')}
                  </span>
                  {goingBtn(e)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* event detail + tickets */}
      <Overlay open={!!detail} onClose={() => setDetailId(null)} width={480}>
        {detail && !orderDone && (
          <>
            <div className="relative -m-4 mb-3 h-[130px] rounded-t-panel md:-m-5 md:mb-3 md:rounded-t-card" style={{ background: pub?.coverUrl ? `center/cover url(${pub.coverUrl})` : eventTile(detail) }}>
              <span className="absolute left-4 top-4 flex h-[52px] w-[52px] flex-col items-center justify-center rounded-btn bg-white shadow-card">
                <span className="text-[9.5px] font-extrabold uppercase text-primary-dark">{detail.dEs}</span>
                <span className="text-[19px] font-extrabold leading-none text-ink">{detail.day}</span>
              </span>
            </div>
            <OverlayTitle title={L(detail.tEs, detail.tEn)} onClose={() => setDetailId(null)} />

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
              <MapPin size={13} strokeWidth={2.4} />
              <span className="min-w-0 flex-1 truncate">{L(detail.lEs, detail.lEn)}</span>
              <Navigation size={12} strokeWidth={2.4} className="flex-none" />
              <span className="flex-none">{L('Cómo llegar', 'Directions')}</span>
            </a>
            {/* organizer + attendee count */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] font-bold text-muted-2">
              {pub && <span>{L('Por', 'By')} <span className="text-ink-soft">{pub.organizer}</span></span>}
              <span>· {(pub?.going ?? detail.going) + (detailOn && !pub ? 1 : 0)} {L('asisten', 'going')}</span>
              <span>· {catLabel[detail.cat]}</span>
            </div>

            {/* add-to-calendar · share */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => addToCalendar({ title: L(detail.tEs, detail.tEn), start: pub?.startsAt ?? '', end: pub?.endsAt ?? null, location: L(detail.lEs, detail.lEn), desc: L(detail.descEs, detail.descEn) })}
                disabled={!pub}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-2.5 text-[12px] font-extrabold text-ink-soft disabled:opacity-40"
              >
                <CalendarPlus size={15} strokeWidth={2.2} /> {L('Calendario', 'Calendar')}
              </button>
              <button
                onClick={() => doShare(L(detail.tEs, detail.tEn))}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-2.5 text-[12px] font-extrabold text-ink-soft"
              >
                <Share2 size={15} strokeWidth={2.2} /> {L('Compartir', 'Share')}
              </button>
            </div>

            <div className="mt-3 border-t border-hair pt-3">
              <div className="mb-1.5 text-[13.5px] font-extrabold text-ink">{L('Acerca del evento', 'About the event')}</div>
              <div className="text-[13.5px] font-medium leading-[1.55] text-ink-soft">{L(detail.descEs, detail.descEn)}</div>
            </div>

            {/* tickets (tiers) vs free RSVP */}
            {detail.slug && hasTiers ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-1.5 text-[13.5px] font-extrabold text-ink">
                  <Ticket size={16} strokeWidth={2.2} className="text-primary" /> {L('Boletos', 'Tickets')}
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
                            <span className="flex-none rounded-full bg-lilac-2 px-2.5 py-1 text-[10.5px] font-extrabold text-pink-dark">{L('Agotado', 'Sold out')}</span>
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
                {orderQty > 0 && (
                  <div className="mt-2.5 flex items-center justify-between rounded-field bg-lilac-2 px-3.5 py-2 text-[12.5px] font-bold text-ink-2">
                    <span>{orderQty} {orderQty === 1 ? L('boleto', 'ticket') : L('boletos', 'tickets')}</span>
                    <span className="text-[14px] font-extrabold text-ink">{anyPaid ? `$${orderTotal.toFixed(2)}` : L('Gratis', 'Free')}</span>
                  </div>
                )}
                <PrimaryBtn className="mt-3" disabled={buying || orderQty === 0} onClick={buyNow}>
                  {buying ? L('Procesando…', 'Processing…') : orderQty === 0 ? L('Elige tus boletos', 'Pick your tickets') : anyPaid ? `${L('Reservar', 'Reserve')} ${orderQty} · $${orderTotal.toFixed(2)}` : `${L('Obtener', 'Get')} ${orderQty}`}
                </PrimaryBtn>
                {anyPaid && (
                  <div className="mt-1.5 text-center text-[10.5px] font-semibold text-muted-2">
                    {L('Apartas tu lugar ahora; el cobro se habilita al conectar pagos.', 'Reserve now; charging turns on once payments are connected.')}
                  </div>
                )}
              </div>
            ) : (
              <>
                {detail.slug && pubLoading && <div className="mt-4 text-center text-[12px] font-semibold text-muted-2">{L('Cargando boletos…', 'Loading tickets…')}</div>}
                <PrimaryBtn
                  className={`mt-4 ${detailOn ? '!bg-green-bg !text-green-dark !shadow-none' : ''}`}
                  onClick={() => rsvpToggle(detail)}
                >
                  {detailOn ? L('Voy ✓', 'Going ✓') : L('Asistir · Gratis', 'Attend · Free')}
                </PrimaryBtn>
              </>
            )}
          </>
        )}
        {detail && orderDone && (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
              <Check size={28} strokeWidth={3} className="text-green" />
            </span>
            <div className="mt-4 text-[19px] font-extrabold text-ink">
              {anyPaid ? L('¡Boletos reservados!', 'Tickets reserved!') : L('¡Boletos confirmados!', 'Tickets confirmed!')}
            </div>
            {boughtCode && (
              <div className="mt-3 w-full max-w-[280px] rounded-card border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 px-4 py-3">
                <div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-muted-2">{L('Código', 'Code')}</div>
                <div className="mt-0.5 font-mono text-[22px] font-extrabold tracking-[.12em] text-primary-dark">{boughtCode}</div>
              </div>
            )}
            <div className="mt-3 max-w-[300px] text-[13px] font-semibold leading-relaxed text-muted">
              {L('Encuéntralos en Mi cuenta → Mis boletos, con su código para la entrada.', 'Find them in My account → My tickets, with the code for entry.')}
            </div>
            <PrimaryBtn className="mt-5" onClick={() => { setDetailId(null); setOrderDone(false); }}>
              {L('Listo', 'Done')}
            </PrimaryBtn>
          </div>
        )}
      </Overlay>

      {toast && (
        <div className="fixed bottom-[86px] left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-ink px-4 py-3 text-[12.5px] font-bold text-white shadow-modal md:bottom-6">
          <Check size={14} strokeWidth={3} className="text-green" />
          {toast}
        </div>
      )}
    </div>
  );
}
