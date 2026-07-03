'use client';

// Business detail (Handoff v2 → Cliente/Negocios): hero, meta, tabs
// (Overview · Updates · Menú · Tienda · Servicios · Eventos · Equipo ·
// Relacionados · Reseñas), cart + checkout, service booking, contact sheet.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, Globe, Heart, MapPin, MessageCircle, MoreHorizontal, Navigation, Phone, Plus, Send, Share, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { Avatar, Card, Overlay, OverlayTitle, PrimaryBtn, Stars, VerifiedBadge } from '@/components/ui';
import { bizTile, type Business } from '@/data/fixtures';
import { useSavedBiz } from '@/lib/savedBiz';
import { useNow } from '@/lib/useNow';
import { bizStatus, fmtDayHours, statusLabel } from '@/lib/hours';
import { CAT, AVATAR_PALETTE } from '@/lib/tiles';
import { DETAIL_EVENTS, DETAIL_PHOTOS, MENU, OPTION_GROUPS, SEED_REVIEWS, SERVICES, SHOP, SHOP_PROMOS, STAFF, SVC_DATES, SVC_TIMES, UPDATE_POSTS, WEEK, type Bi, type MenuCat, type MenuItem } from '@/data/bizdetail';

type TabKey = 'overview' | 'updates' | 'menu' | 'shop' | 'services' | 'events' | 'staff' | 'related' | 'reviews';

type CartLine = { qty: number; name: string; unit: number; optsLabel: string; bg: string };

const initials = (name: string) =>
  name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function BizDetail({ b, all, onClose, onOpenOther }: { b: Business; all: Business[]; onClose: () => void; onOpenOther: (b: Business) => void }) {
  const { L } = useLang();
  const B = (pair: Bi) => L(pair[0], pair[1]);
  const app = useApp();
  const savedBiz = useSavedBiz();
  const id = b.id;

  const [tab, setTab] = useState<TabKey>('overview');
  const [contactOpen, setContactOpen] = useState(false);
  const [weekOpen, setWeekOpen] = useState(false);
  const [photoTile, setPhotoTile] = useState<string | null>(null);

  // cart
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [cartDone, setCartDone] = useState(false);
  const [itemModal, setItemModal] = useState<{ catKey: string; item: MenuItem } | null>(null);
  const [single, setSingle] = useState<Record<string, number>>({});
  const [multi, setMulti] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState(1);

  // services / events / updates / reviews
  const [svcIdx, setSvcIdx] = useState<number | null>(null);
  const [svcDate, setSvcDate] = useState(0);
  const [svcTime, setSvcTime] = useState(0);
  const [svcDone, setSvcDone] = useState(false);
  const [evIdx, setEvIdx] = useState<number | null>(null);
  const [evGoing, setEvGoing] = useState<Record<number, boolean>>({});
  const [updLikes, setUpdLikes] = useState<Record<number, boolean>>({});
  const [updOpen, setUpdOpen] = useState<Record<number, boolean>>({});
  const [reviewHelpful, setReviewHelpful] = useState<Record<string, boolean>>({});
  const [reviewFilter, setReviewFilter] = useState<'all' | '5' | '4' | '3'>('all');
  const [writeOpen, setWriteOpen] = useState(false);
  const [myStars, setMyStars] = useState(5);
  const [myText, setMyText] = useState('');
  const [myReviews, setMyReviews] = useState<{ id: string; stars: number; text: string }[]>([]);

  const saved = savedBiz.isSaved(b.slug);
  const now = useNow();
  const status = statusLabel(bizStatus(b.hours, now, b.open), L);
  const statusTone = status.tone === 'open' ? 'text-green' : status.tone === 'soon' ? 'text-amber-ink' : 'text-[#A59FB6]';
  const catLabel = L(CAT[b.cat].es, CAT[b.cat].en);
  const revRaw = L(b.revEs, b.revEn);
  const [quote, rvName] = revRaw.includes('—') ? [revRaw.split('—')[0].trim(), revRaw.split('—').slice(1).join('—').trim()] : [revRaw, ''];
  const slug = b.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 14);
  const phone = '(832) 555-4521';
  const address = '5821 Bellaire Blvd, Houston, TX';

  const cartCount = Object.values(cart).reduce((n, l) => n + l.qty, 0);
  const cartTotal = Object.values(cart).reduce((n, l) => n + l.qty * l.unit, 0);
  const deliveryFee = cartCount > 0 ? 2.99 : 0;
  const serviceFee = cartCount > 0 ? +(cartTotal * 0.1).toFixed(2) : 0;
  const grandTotal = cartTotal + deliveryFee + serviceFee;

  const money = (n: number) => `$${n.toFixed(2)}`;

  const openItem = (catKey: string, item: MenuItem) => {
    const groups = OPTION_GROUPS[catKey] ?? [];
    const s: Record<string, number> = {};
    groups.forEach((g) => g.type === 'single' && (s[g.id] = 0));
    setSingle(s);
    setMulti({});
    setQty(1);
    setItemModal({ catKey, item });
  };

  const addSimple = (catKey: string, item: MenuItem) => {
    const key = `${catKey}:${B(item.n)}`;
    setCart((c) => ({ ...c, [key]: { qty: (c[key]?.qty ?? 0) + 1, name: B(item.n), unit: item.price, optsLabel: '', bg: item.bg } }));
  };

  const addFromModal = () => {
    if (!itemModal) return;
    const groups = OPTION_GROUPS[itemModal.catKey] ?? [];
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
    const key = `${itemModal.catKey}:${B(itemModal.item.n)}|${chosen.join(',')}`;
    setCart((c) => ({ ...c, [key]: { qty: (c[key]?.qty ?? 0) + qty, name: B(itemModal.item.n), unit, optsLabel: chosen.join(', '), bg: itemModal.item.bg } }));
    setItemModal(null);
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

  const modalUnit = useMemo(() => {
    if (!itemModal) return 0;
    let add = 0;
    (OPTION_GROUPS[itemModal.catKey] ?? []).forEach((g) =>
      g.choices.forEach((ch, i) => {
        const sel = g.type === 'single' ? single[g.id] === i : !!multi[`${g.id}:${i}`];
        if (sel) add += ch.price;
      }),
    );
    return itemModal.item.price + add;
  }, [itemModal, single, multi]);

  const tabs: [TabKey, string][] = [
    ['overview', 'Overview'],
    ['updates', 'Updates'],
    ['menu', L('Menú', 'Menu')],
    ['shop', L('Tienda', 'Shop')],
    ['services', L('Servicios', 'Services')],
    ['events', L('Eventos', 'Events')],
    ['staff', L('Equipo', 'Staff')],
    ['related', L('Relacionados', 'Related')],
    ['reviews', L('Reseñas', 'Reviews')],
  ];

  // Overview = the full, browse-y view (hero + meta). Any other tab switches to a
  // focused mode: the hero collapses into a compact pinned header (title + tabs
  // stuck to the top) for a distraction-free read. Jump to the top on every
  // switch so each tab opens from its start.
  const focused = tab !== 'overview';
  const barRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Pin the bar to the REAL app-header height (measured live) so it tucks flush —
  // no gap, no overlap — on any breakpoint. Fallbacks are only for first paint.
  const [headerH, setHeaderH] = useState<number | null>(null);
  const headerHRef = useRef<number | null>(null);
  // Minimum height for the tab-content area so a SHORT tab still leaves enough
  // scroll room to push the hero out of view and pin the bar. ~48px covers the
  // collapsed bar (tabs row), a safe slight over-provision.
  const [contentMinH, setContentMinH] = useState<number | null>(null);
  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const measure = () => {
      const h = Math.round(header.getBoundingClientRect().height);
      headerHRef.current = h;
      setHeaderH(h);
      setContentMinH(Math.max(0, window.innerHeight - h - 48));
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
  const pinPx = () =>
    headerHRef.current ?? (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches ? 108 : 150);

  const onTab = (k: TabKey) => {
    setTab(k);
    if (typeof window === 'undefined') return;
    if (k === 'overview') {
      window.scrollTo({ top: 0 }); // reveal the full hero
      return;
    }
    // Non-Overview: scroll the hero out of view so the bar is pinned and the tab
    // opens from its start. Because the hero stays mounted, the bar's pinned spot
    // is the same as on any other tab → switching from a pinned Overview (or
    // between tabs) is seamless, no snap.
    const s = sentinelRef.current;
    if (!s) return;
    const naturalTop = s.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, naturalTop - pinPx()) });
  };

  // Track when the sticky bar reaches the top so Overview can reveal the title
  // row exactly when it pins (focused tabs always show it). Shared 1-frame check.
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      setStuck(el.getBoundingClientRect().top <= pinPx() + 0.5);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, headerH]);
  const showTitle = focused || stuck;

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

  const itemCard = (catKey: string, it: MenuItem, withAdd = false) => (
    <button
      key={B(it.n)}
      onClick={() => openItem(catKey, it)}
      className="flex w-full cursor-pointer items-center gap-3 rounded-card-sm border border-hair bg-white p-3 text-left shadow-card"
    >
      <span className="h-[64px] w-[64px] flex-none rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${it.bg})` }} />
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
      <span
        onClick={(e) => {
          if (withAdd) {
            e.stopPropagation();
            addSimple(catKey, it);
          }
        }}
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-lilac text-primary-dark"
      >
        <Plus size={15} strokeWidth={2.8} />
      </span>
    </button>
  );

  return (
    <div className="mx-auto max-w-[680px]">
      {/* Full header (hero + title + meta + endorsement) is ALWAYS in the DOM so
          the tab bar's natural position is identical on every tab — that's what
          makes tab switches seamless. On a non-Overview tab we simply scroll it
          out of view (bar pinned) instead of unmounting it. */}
      {/* hero */}
      <div className="relative mb-4 h-[200px] overflow-hidden rounded-card" style={{ background: bizTile(b) }}>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] tracking-[.1em] text-[#9A8FC4]">[ foto ]</div>
        <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
          <button onClick={onClose} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-card" aria-label={L('Volver', 'Back')}>
            <ChevronLeft size={18} strokeWidth={2.4} className="text-ink" />
          </button>
          <div className="flex gap-2.5">
            <button onClick={() => setContactOpen(true)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-card" aria-label={L('Compartir', 'Share')}>
              <Share size={16} strokeWidth={2.2} className="text-ink" />
            </button>
            <button onClick={() => savedBiz.toggle(b.slug)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-card" aria-label={L('Guardar', 'Save')}>
              <Heart size={16} strokeWidth={2.2} className="text-pink" fill={saved ? '#F0466E' : 'none'} />
            </button>
          </div>
        </div>
        {b.cat === 'FoodDrinks' && (
          <span className="absolute bottom-3 left-3.5 rounded-[10px] bg-[#F6E05E] px-[11px] py-[5px] text-[11.5px] font-extrabold text-ink">
            {L('Martes 2x1', 'Taco Tue 2x1')}
          </span>
        )}
        <span className="absolute bottom-3 right-3.5 rounded-[10px] bg-[rgba(30,27,46,.6)] px-[11px] py-[5px] text-[11.5px] font-bold text-white">1 / 8</span>
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

      {/* 0-height marker at the bar's natural top — used to scroll the bar into
          its pinned position when opening a non-Overview tab. */}
      <div ref={sentinelRef} className="h-0" aria-hidden />

      {/* One sticky header for every tab. The business-title row is always here;
          on a non-Overview tab it shows immediately, and on Overview it reveals
          (smoothly, no jump) once the bar pins to the top while scrolling — so
          switching tabs never snaps between two different bars. */}
      <div
        ref={barRef}
        style={headerH != null ? { top: headerH } : undefined}
        className="sticky top-[150px] z-20 mt-1 -mx-3.5 border-b border-hair bg-app px-3.5 md:top-[108px] md:-mx-5 md:px-5"
      >
        <div className={`overflow-hidden transition-all duration-200 ${showTitle ? 'max-h-[64px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex items-center gap-2 pb-2 pt-2.5">
            <button onClick={() => onTab('overview')} className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2" aria-label={L('Volver a Overview', 'Back to Overview')}>
              <ChevronLeft size={16} strokeWidth={2.6} className="text-ink" />
            </button>
            <span className="truncate text-[15.5px] font-extrabold text-ink">{b.name}</span>
            {b.verified && <VerifiedBadge size={16} />}
            <div className="ml-auto flex flex-none items-center gap-1.5">
              <button onClick={() => savedBiz.toggle(b.slug)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-lilac-2" aria-label={L('Guardar', 'Save')}>
                <Heart size={15} strokeWidth={2.2} className="text-pink" fill={saved ? '#F0466E' : 'none'} />
              </button>
              <button onClick={() => setContactOpen(true)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-lilac-2" aria-label={L('Contacto y opciones', 'Contact & options')}>
                <MoreHorizontal size={18} className="text-primary-dark" />
              </button>
            </div>
          </div>
        </div>
        <div className="no-scrollbar flex touch-pan-x gap-5 overflow-x-auto overscroll-x-contain pt-2.5">{tabButtons}</div>
      </div>

      {/* Tab content — min-height guarantees enough scroll to pin the bar even
          when a tab (e.g. Eventos) is short. */}
      <div style={contentMinH != null ? { minHeight: contentMinH } : undefined}>

      {/* ============ OVERVIEW ============ */}
      {tab === 'overview' && (
        <div className="pt-5">
          {secTitle(L('Lo que ofrece', 'What it offers'))}
          <div className="flex flex-wrap gap-2">
            {(L(b.amEs.join('|'), b.amEn.join('|')).split('|')).map((a) => (
              <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-lilac-2 px-3 py-[7px] text-[12px] font-bold text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {a}
              </span>
            ))}
          </div>
          {divider}
          {secTitle(L('Acerca de', 'About'))}
          <div className="text-[14px] font-medium leading-[1.6] text-ink-soft">
            {L(
              `Negocio latino de confianza en ${app.cityShort}. ${b.specEs.replace('Especialidad · ', '')}, hecho con dedicación. Atendido con orgullo por su familia — de la comunidad para la comunidad.`,
              `Trusted Latino-owned business in ${app.cityShort}. ${b.specEn.replace('Specialty · ', '')}, made with care. Proudly family-run — from the community for the community.`,
            )}
          </div>
          {divider}
          <div className="flex items-center justify-between">
            <span className="text-[15.5px] font-extrabold text-ink">{L('Horario', 'Hours')}</span>
            <span className={`text-[12.5px] font-extrabold ${statusTone}`}>{status.text}</span>
          </div>
          {/* today's hours (real when the business has a schedule) */}
          <div className="mt-[11px] flex items-center justify-between text-[13.5px] font-semibold text-ink-soft">
            <span className="font-extrabold text-ink">{L('Hoy', 'Today')}</span>
            <span>{b.hours && now ? fmtDayHours(b.hours[now.getDay()], L('Cerrado', 'Closed')) : '9:00 am – 10:00 pm'}</span>
          </div>
          <button onClick={() => setWeekOpen(!weekOpen)} className="mt-2 flex cursor-pointer items-center gap-1.5 text-[12.5px] font-extrabold text-primary-dark">
            {L('Ver toda la semana', 'See full week')}
            <ChevronDown size={13} strokeWidth={2.6} className={`transition-transform ${weekOpen ? 'rotate-180' : ''}`} />
          </button>
          {weekOpen && (
            <div className="mt-3 flex flex-col gap-2 rounded-[13px] bg-[#F7F6FC] px-3.5 py-3">
              {WEEK.map((d, i) => {
                // WEEK is Monday-first; our hours are Sunday-first (0=Sun..6=Sat).
                const hoursIdx = i === 6 ? 0 : i + 1;
                const isToday = now != null && now.getDay() === hoursIdx;
                const label = b.hours ? fmtDayHours(b.hours[hoursIdx], L('Cerrado', 'Closed')) : i === 6 ? '10:00 am – 6:00 pm' : '9:00 am – 10:00 pm';
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
            {DETAIL_PHOTOS.map((t) => (
              <button key={t} onClick={() => setPhotoTile(t)} className="h-[90px] w-[120px] flex-none cursor-pointer rounded-[13px]" style={{ background: t }} />
            ))}
          </div>
          {divider}
          {secTitle(L('Ubicación', 'Location'))}
          <div className="relative h-[130px] overflow-hidden rounded-[15px]" style={{ background: 'repeating-linear-gradient(135deg,#E7ECF3 0 14px,#DCE3EC 14px 28px)' }}>
            <MapPin size={30} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full fill-primary text-white" strokeWidth={1.5} />
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
                  <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-[#ECEAF4]">
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
                    <MessageCircle size={16} strokeWidth={2} />
                    {L('Comentar', 'Comment')}
                  </button>
                  <button className="ml-auto cursor-pointer text-muted-2">
                    <Share size={16} strokeWidth={2} />
                  </button>
                </div>
                {updOpen[i] && (
                  <div className="mt-3 flex items-center gap-2 border-t border-hair pt-3">
                    <input placeholder={L('Escribe un comentario…', 'Write a comment…')} className="min-w-0 flex-1 rounded-full bg-app px-4 py-2.5 text-[13px] font-medium outline-none placeholder:text-muted" />
                    <button className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-primary text-white">
                      <Send size={14} strokeWidth={2.4} />
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
          {MENU.map((c) => (
            <div key={c.key} className="mb-5">
              <div className="mb-2.5 flex items-baseline gap-2">
                <span className="text-[15.5px] font-extrabold text-ink">{B(c.name)}</span>
                <span className="text-[11.5px] font-bold text-muted">{c.items.length} {L('platillos', 'items')}</span>
              </div>
              <div className="flex flex-col gap-2.5">{c.items.map((it) => itemCard(c.key, it))}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'shop' && (
        <div className="pt-4">
          <div className="no-scrollbar mb-4 flex gap-3 overflow-x-auto">
            {SHOP_PROMOS.map((p) => (
              <div key={p.t[0]} className="w-[200px] flex-none rounded-card-sm p-3.5" style={{ background: `repeating-linear-gradient(135deg,${p.bg})` }}>
                <div className="text-[14px] font-extrabold" style={{ color: p.c }}>{B(p.t)}</div>
                <div className="mt-0.5 text-[11.5px] font-bold text-ink-3">{B(p.sub)}</div>
              </div>
            ))}
          </div>
          {SHOP.map((c) => (
            <div key={c.key} className="mb-5">
              <div className="mb-2.5 flex items-baseline gap-2">
                <span className="text-[15.5px] font-extrabold text-ink">{B(c.name)}</span>
                <span className="text-[11.5px] font-bold text-muted">{c.items.length} {L('productos', 'products')}</span>
              </div>
              <div className="flex flex-col gap-2.5">{c.items.map((it) => itemCard(c.key, it, true))}</div>
            </div>
          ))}
        </div>
      )}

      {/* ============ SERVICES ============ */}
      {tab === 'services' && (
        <div className="flex flex-col gap-2.5 pt-4">
          {SERVICES.map((s, i) => (
            <Card key={s.n[0]} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-extrabold text-ink">{B(s.n)}</div>
                <div className="mt-0.5 text-[12px] font-semibold text-muted">{B(s.d)}</div>
                <div className="mt-1 text-[12.5px] font-extrabold text-primary-dark">{B(s.price)}</div>
              </div>
              <button onClick={() => { setSvcIdx(i); setSvcDate(0); setSvcTime(0); setSvcDone(false); }} className="flex-none cursor-pointer rounded-field bg-primary px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm">
                {L('Reservar', 'Book')}
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* ============ EVENTS ============ */}
      {tab === 'events' && (
        <div className="flex flex-col gap-2.5 pt-4">
          {DETAIL_EVENTS.map((e, i) => {
            const on = !!evGoing[i];
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
                    setEvGoing((m) => ({ ...m, [i]: !m[i] }));
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
          {all.filter((x) => x.id !== id).slice(0, 4).map((x) => (
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
            <button onClick={() => { setWriteOpen(true); setMyStars(5); setMyText(''); }} className="ml-auto flex-none cursor-pointer rounded-full bg-primary px-4 py-2 text-[12.5px] font-extrabold text-white shadow-cta-sm">
              {L('Escribir reseña', 'Write a review')}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {[
              ...myReviews.map((r) => ({ id: r.id, ini: 'TÚ', name: L('Tú', 'You'), color: '#7B61FF', stars: r.stars, when: [L('ahora', 'now'), 'now'] as Bi, text: [r.text, r.text] as Bi, base: 0 })),
              ...(revRaw ? [{ id: 'r0', ini: initials(rvName || 'V'), name: rvName || L('Vecino', 'Neighbor'), color: AVATAR_PALETTE[id % AVATAR_PALETTE.length], stars: 5, when: ['hace 2 días', '2d'] as Bi, text: [quote, quote] as Bi, base: 12 }] : []),
              ...SEED_REVIEWS,
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

      </div>

      {/* cart bar */}
      {cartCount > 0 && (
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
          {[
            { Icon: Phone, label: L('Llamar', 'Call'), sub: phone, color: '#1F9D57', bg: '#E3F5EA' },
            { Icon: MessageCircle, label: L('Mensaje', 'Message'), sub: 'WhatsApp', color: '#6D4DF6', bg: '#EFEBFF' },
            { Icon: Globe, label: L('Sitio web', 'Website'), sub: `${slug}.com`, color: '#2F6FED', bg: '#E5EFFB' },
            { Icon: Navigation, label: L('Cómo llegar', 'Directions'), sub: address, color: '#E8954A', bg: '#FCEBD6' },
            { Icon: Share, label: L('Compartir', 'Share'), sub: '', color: '#8A86A0', bg: '#F1EFFA' },
          ].map(({ Icon, label, sub, color, bg }) => (
            <button key={label} onClick={() => setContactOpen(false)} className="flex w-full cursor-pointer items-center gap-3 rounded-btn px-2 py-2.5 text-left hover:bg-app">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]" style={{ background: bg }}>
                <Icon size={16} strokeWidth={2.2} style={{ color }} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-bold text-ink">{label}</span>
                {sub && <span className="block truncate text-[11.5px] font-semibold text-muted">{sub}</span>}
              </span>
            </button>
          ))}
          <button onClick={() => setContactOpen(false)} className="mt-1 w-full cursor-pointer rounded-btn px-2 py-2.5 text-left text-[12.5px] font-bold text-pink-dark hover:bg-pink-bg">
            {L('Reportar un problema', 'Report a problem')}
          </button>
        </div>
      </Overlay>

      {/* photo lightbox */}
      {photoTile && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(20,16,34,.82)] p-6" onClick={() => setPhotoTile(null)}>
          <div className="h-[70%] w-full max-w-[640px] rounded-card" style={{ background: photoTile }} />
        </div>
      )}

      {/* item customization modal */}
      <Overlay open={!!itemModal} onClose={() => setItemModal(null)} width={440}>
        {itemModal && (
          <>
            <OverlayTitle title={L('Personaliza tu platillo', 'Customize your item')} onClose={() => setItemModal(null)} />
            <div className="flex items-center gap-3">
              <span className="h-14 w-14 flex-none rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${itemModal.item.bg})` }} />
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold text-ink">{B(itemModal.item.n)}</div>
                <div className="text-[12px] font-semibold text-muted">{B(itemModal.item.d)}</div>
              </div>
              <span className="ml-auto text-[14px] font-extrabold text-ink">{money(itemModal.item.price)}</span>
            </div>
            {(OPTION_GROUPS[itemModal.catKey] ?? []).map((g) => (
              <div key={g.id} className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-extrabold text-ink">{B(g.name)}</span>
                  <span className="text-[11px] font-bold text-muted">{g.type === 'multi' ? L('Opcional', 'Optional') : L('Elige 1', 'Choose 1')}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {g.choices.map((ch, i) => {
                    const sel = g.type === 'single' ? single[g.id] === i : !!multi[`${g.id}:${i}`];
                    return (
                      <button
                        key={ch.label[0]}
                        onClick={() =>
                          g.type === 'single'
                            ? setSingle((m) => ({ ...m, [g.id]: i }))
                            : setMulti((m) => ({ ...m, [`${g.id}:${i}`]: !m[`${g.id}:${i}`] }))
                        }
                        className="flex w-full cursor-pointer items-center gap-3 rounded-field border border-hair bg-white px-3 py-2.5 text-left"
                      >
                        {g.type === 'multi' ? (
                          <span className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] ${sel ? 'bg-primary text-white' : 'border-2 border-[#D9D5E6]'}`}>
                            {sel && <Check size={13} strokeWidth={3.4} />}
                          </span>
                        ) : (
                          <span className={`h-[22px] w-[22px] flex-none rounded-full ${sel ? 'border-[7px] border-primary' : 'border-2 border-[#D9D5E6]'}`} />
                        )}
                        <span className="flex-1 text-[13px] font-bold text-ink">{B(ch.label)}</span>
                        {ch.price > 0 && <span className="text-[12px] font-extrabold text-muted">+{money(ch.price)}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="mt-5 flex items-center gap-3">
              <div className="flex flex-none items-center gap-3 rounded-full bg-lilac-2 px-2 py-1.5">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-ink">−</button>
                <span className="w-4 text-center text-[14px] font-extrabold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-ink">+</button>
              </div>
              <PrimaryBtn className="mt-0" onClick={addFromModal}>
                {L('Agregar', 'Add')} {qty} · {money(modalUnit * qty)}
              </PrimaryBtn>
            </div>
          </>
        )}
      </Overlay>

      {/* cart sheet / checkout */}
      <Overlay open={cartOpen} onClose={() => setCartOpen(false)} width={440}>
        {!cartDone ? (
          <>
            <OverlayTitle title={L('Tu pedido', 'Your order')} onClose={() => setCartOpen(false)} />
            {cartCount === 0 ? (
              <div className="py-8 text-center">
                <div className="text-[14px] font-extrabold text-ink">{L('Tu carrito está vacío', 'Your cart is empty')}</div>
                <div className="mt-1 text-[12px] font-semibold text-muted">{L('Agrega platillos del menú para empezar.', 'Add items from the menu to start.')}</div>
              </div>
            ) : (
              <>
                <div className="flex max-h-[300px] flex-col gap-2.5 overflow-y-auto">
                  {Object.entries(cart).map(([k, l]) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="h-11 w-11 flex-none rounded-[10px]" style={{ background: `repeating-linear-gradient(135deg,${l.bg})` }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-extrabold text-ink">{l.name}</span>
                        {l.optsLabel && <span className="block truncate text-[11px] font-semibold text-muted">{l.optsLabel}</span>}
                      </span>
                      <span className="flex flex-none items-center gap-2 rounded-full bg-lilac-2 px-1.5 py-1">
                        <button onClick={() => decLine(k)} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-[14px] font-extrabold">−</button>
                        <span className="w-3 text-center text-[12.5px] font-extrabold">{l.qty}</span>
                        <button onClick={() => incLine(k)} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-[14px] font-extrabold">+</button>
                      </span>
                      <span className="w-14 flex-none text-right text-[13px] font-extrabold text-ink">{money(l.unit * l.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-1.5 border-t border-hair pt-3 text-[12.5px] font-semibold text-ink-2">
                  <div className="flex justify-between"><span>{L('Subtotal', 'Subtotal')}</span><span>{money(cartTotal)}</span></div>
                  <div className="flex justify-between"><span>{L('Envío', 'Delivery')}</span><span>{money(deliveryFee)}</span></div>
                  <div className="flex justify-between"><span>{L('Servicio', 'Service')}</span><span>{money(serviceFee)}</span></div>
                  <div className="flex justify-between text-[14px] font-extrabold text-ink"><span>{L('Total', 'Total')}</span><span>{money(grandTotal)}</span></div>
                </div>
                <PrimaryBtn className="mt-4" onClick={() => setCartDone(true)}>
                  {L('Realizar pedido · ', 'Place order · ')}{money(grandTotal)}
                </PrimaryBtn>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
              <Check size={28} strokeWidth={3} className="text-green" />
            </span>
            <div className="mt-4 text-[19px] font-extrabold text-ink">{L('¡Pedido realizado!', 'Order placed!')}</div>
            <div className="mt-1.5 max-w-[300px] text-[13px] font-semibold leading-relaxed text-muted">
              {L('Tu comida está en preparación. Te avisaremos cuando salga.', "Your food is being prepared. We'll notify you when it's on the way.")}
            </div>
            <PrimaryBtn className="mt-5" onClick={() => { setCart({}); setCartOpen(false); setCartDone(false); }}>
              {L('Seguir explorando', 'Keep browsing')}
            </PrimaryBtn>
          </div>
        )}
      </Overlay>

      {/* service booking modal */}
      <Overlay open={svcIdx !== null} onClose={() => setSvcIdx(null)} width={440}>
        {svcIdx !== null && !svcDone && (
          <>
            <OverlayTitle title={B(SERVICES[svcIdx].n)} onClose={() => setSvcIdx(null)} />
            <div className="text-[12.5px] font-semibold text-muted">{B(SERVICES[svcIdx].d)}</div>
            <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Elige fecha', 'Pick a date')}</div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {SVC_DATES.map((d, i) => (
                <button key={d.sub} onClick={() => setSvcDate(i)} className={`flex-none cursor-pointer rounded-btn px-3.5 py-2.5 text-center ${svcDate === i ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-soft'}`}>
                  <span className="block text-[12.5px] font-extrabold">{B(d.lab)}</span>
                  <span className={`block text-[10.5px] font-bold ${svcDate === i ? 'text-white/80' : 'text-muted'}`}>{d.sub}</span>
                </button>
              ))}
            </div>
            <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Elige hora', 'Pick a time')}</div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {SVC_TIMES.map((t, i) => (
                <button key={t} onClick={() => setSvcTime(i)} className={`flex-none cursor-pointer rounded-btn px-3.5 py-2.5 text-[12.5px] font-extrabold ${svcTime === i ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-soft'}`}>
                  {t}
                </button>
              ))}
            </div>
            <PrimaryBtn className="mt-5" onClick={() => setSvcDone(true)}>
              {L('Solicitar reserva', 'Request booking')}
            </PrimaryBtn>
          </>
        )}
        {svcIdx !== null && svcDone && (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
              <Check size={28} strokeWidth={3} className="text-green" />
            </span>
            <div className="mt-4 text-[19px] font-extrabold text-ink">{L('¡Solicitud enviada!', 'Request sent!')}</div>
            <div className="mt-1.5 max-w-[300px] text-[13px] font-semibold leading-relaxed text-muted">
              {L('Te contactaremos pronto para confirmar los detalles.', "We'll contact you soon to confirm the details.")}
            </div>
            <PrimaryBtn className="mt-5" onClick={() => { setSvcIdx(null); setSvcDone(false); }}>
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
              {DETAIL_EVENTS[evIdx].base + (evGoing[evIdx] ? 1 : 0)} {L('asisten', 'going')}
            </div>
            <PrimaryBtn
              className={`mt-4 ${evGoing[evIdx] ? '!bg-green-bg !text-green-dark !shadow-none' : ''}`}
              onClick={() => setEvGoing((m) => ({ ...m, [evIdx]: !m[evIdx] }))}
            >
              {evGoing[evIdx] ? L('Voy ✓', 'Going ✓') : L('Asistir', 'Attend')}
            </PrimaryBtn>
          </>
        )}
      </Overlay>

      {/* write review modal */}
      <Overlay open={writeOpen} onClose={() => setWriteOpen(false)} width={440}>
        <OverlayTitle title={L('Tu reseña', 'Your review')} onClose={() => setWriteOpen(false)} />
        <div className="flex justify-center gap-1 py-2 text-[30px]">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setMyStars(n)} className="cursor-pointer" style={{ color: n <= myStars ? '#F4B740' : '#D9D5E6' }}>
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
        <PrimaryBtn
          className="mt-3"
          disabled={!myText.trim()}
          onClick={() => {
            if (!myText.trim()) return;
            setMyReviews((l) => [{ id: `u${l.length}`, stars: myStars, text: myText.trim() }, ...l]);
            setWriteOpen(false);
          }}
        >
          {L('Publicar reseña', 'Post review')}
        </PrimaryBtn>
      </Overlay>
    </div>
  );
}
