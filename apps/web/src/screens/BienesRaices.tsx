'use client';

// Bienes Raíces (`/bienes-raices`) — consumer surface of the real-estate
// vertical. Zillow-benchmark: discover + segmented deal modes, filters sheet,
// price-pin map (MapLibre + OSM raster), deep property detail, tour scheduling,
// offer / rental application, saved hearts, mortgage calculator and the agent
// directory. Data contract: src/lib/realestate.ts (migration 0117). Patterns
// mirror Eventos.tsx (useUrlDetail deep link, Overlay sheets, toast, tokens).

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import type { Map as MlMap, Marker as MlMarker } from 'maplibre-gl';
import {
  IconAdjustmentsHorizontal as Adjustments, IconBath as Bath, IconBed as Bed,
  IconBuildingEstate as BuildingEstate, IconCalculator as Calculator,
  IconCalendarEvent as CalendarEvent, IconCheck as Check, IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight, IconHeart as Heart, IconHeartFilled as HeartFilled,
  IconId as IdCard, IconInfoCircle as InfoCircle, IconMap as MapIcon, IconMapPin as MapPin,
  IconMessageCircle as MessageCircle, IconNavigation as Navigation, IconPhone as Phone,
  IconRuler as Ruler, IconSearch as Search, IconShare2 as Share2, IconStarFilled as StarFilled,
  IconVideo as Video,
} from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { useUrlDetail } from '@/lib/urlView';
import { Card, Chip, Overlay, OverlayTitle, PrimaryBtn, SkeletonList, VerifiedBadge } from '@/components/ui';
import {
  RE_DEALS, RE_TYPES, RE_TILE,
  searchProperties, fetchPropertyBySlug, trackPropertyView, fetchReDirectory,
  createPropertyLead, bookPropertyTour, fetchSavedPropertyIds, setPropertySaved,
  fetchSavedProperties, mortgageMonthly, fmtPrice, fmtPriceFull,
  type ReCard, type ReDetail, type ReAgency, type ReDeal, type RePtype,
} from '@/lib/realestate';

const LIMIT = 20;

// ── static option tables ─────────────────────────────────────────────────────
/** Property types offered per deal mode (filters sheet). */
const TYPES_FOR: Record<ReDeal, RePtype[]> = {
  venta: ['casa', 'condo', 'townhouse', 'departamento'],
  renta: ['casa', 'condo', 'townhouse', 'departamento'],
  cuarto: ['cuarto'],
  comercial: ['local', 'oficina', 'terreno'],
};
type PricePreset = { min: number | null; max: number | null; es: string; en: string };
const PRICES_SALE: PricePreset[] = [
  { min: null, max: null, es: 'Cualquier precio', en: 'Any price' },
  { min: null, max: 200000, es: 'Hasta $200k', en: 'Up to $200k' },
  { min: 200000, max: 400000, es: '$200k – $400k', en: '$200k – $400k' },
  { min: 400000, max: 600000, es: '$400k – $600k', en: '$400k – $600k' },
  { min: 600000, max: 900000, es: '$600k – $900k', en: '$600k – $900k' },
  { min: 900000, max: null, es: '$900k o más', en: '$900k+' },
];
const PRICES_MONTHLY: PricePreset[] = [
  { min: null, max: null, es: 'Cualquier precio', en: 'Any price' },
  { min: null, max: 1000, es: 'Hasta $1,000/mes', en: 'Up to $1,000/mo' },
  { min: 1000, max: 2000, es: '$1,000 – $2,000/mes', en: '$1,000 – $2,000/mo' },
  { min: 2000, max: 3500, es: '$2,000 – $3,500/mes', en: '$2,000 – $3,500/mo' },
  { min: 3500, max: 5000, es: '$3,500 – $5,000/mes', en: '$3,500 – $5,000/mo' },
  { min: 5000, max: null, es: '$5,000 o más', en: '$5,000+' },
];
const SLOTS: { label: string; h: number; m: number }[] = [
  { label: '9:00 AM', h: 9, m: 0 }, { label: '10:00 AM', h: 10, m: 0 },
  { label: '11:00 AM', h: 11, m: 0 }, { label: '12:00 PM', h: 12, m: 0 },
  { label: '1:00 PM', h: 13, m: 0 }, { label: '2:00 PM', h: 14, m: 0 },
  { label: '3:00 PM', h: 15, m: 0 }, { label: '4:00 PM', h: 16, m: 0 },
  { label: '5:00 PM', h: 17, m: 0 }, { label: '6:30 PM', h: 18, m: 30 },
];
const WD3_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WD3_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO3_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MO3_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const INCOME_OPTS: { v: string; es: string; en: string }[] = [
  { v: 'Menos de $2,000/mes', es: 'Menos de $2,000', en: 'Under $2,000' },
  { v: '$2,000 – $3,500/mes', es: '$2,000 – $3,500', en: '$2,000 – $3,500' },
  { v: '$3,500 – $5,000/mes', es: '$3,500 – $5,000', en: '$3,500 – $5,000' },
  { v: 'Más de $5,000/mes', es: 'Más de $5,000', en: 'Over $5,000' },
];
const MOVE_OPTS: { v: string; es: string; en: string }[] = [
  { v: 'Lo antes posible', es: 'Lo antes posible', en: 'As soon as possible' },
  { v: 'En 1 mes', es: 'En 1 mes', en: 'In 1 month' },
  { v: 'En 2–3 meses', es: 'En 2–3 meses', en: 'In 2–3 months' },
];
/** Deal → content tag pill (tokens only). */
const DEAL_TAG: Record<ReDeal, { cls: string; es: string; en: string }> = {
  venta: { cls: 'bg-lilac text-primary-dark', es: 'En venta', en: 'For sale' },
  renta: { cls: 'bg-green-bg text-green-dark', es: 'En renta', en: 'For rent' },
  cuarto: { cls: 'bg-pink-bg text-pink-dark', es: 'Cuarto', en: 'Room' },
  comercial: { cls: 'bg-blue-bg text-blue', es: 'Comercial', en: 'Commercial' },
};

// ── small helpers (Eventos patterns) ─────────────────────────────────────────
/** Striped category placeholder (design-system rule) unless a real photo exists. */
const tileBg = (deal: ReDeal, photo?: string | null): CSSProperties =>
  photo
    ? { background: `center/cover url(${photo})` }
    : { background: `repeating-linear-gradient(135deg,${RE_TILE[deal][0]} 0 11px,${RE_TILE[deal][1]} 11px 22px)` };
// OpenStreetMap directions (no Google billing, per the stack).
const mapsUrl = (lat: number | null, lng: number | null, place: string) =>
  lat != null && lng != null
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(place)}`;
// Zero-dependency embedded OSM map for the detail "Ubicación" card.
const mapEmbedUrl = (lat: number, lng: number) => {
  const dLat = 0.004;
  const dLng = 0.004 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map((n) => n.toFixed(6)).join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
};
const daysListed = (iso: string): number => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
};
/** "Casa abierta" pill text — dates render short, free text passes through. */
const openHouseText = (v: string, es: boolean): string => {
  if (/\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      const wd = es ? WD3_ES[d.getDay()] : WD3_EN[d.getDay()];
      const mo = es ? MO3_ES[d.getMonth()] : MO3_EN[d.getMonth()];
      return `${wd} ${d.getDate()} ${mo}`;
    }
  }
  return v;
};
const distLabel = (m: number | null): string | null =>
  m == null ? null : `${(m / 1609.34).toFixed(1)} mi`;
const fmtDateShort = (v: string, es: boolean): string => {
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${d.getDate()} ${es ? MO3_ES[d.getMonth()] : MO3_EN[d.getMonth()]} ${d.getFullYear()}`;
};
const initialsOf = (name: string): string =>
  name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '·';

type View = 'descubrir' | 'mapa' | 'guardados' | 'agentes';
type Filters = { ptype: RePtype | null; beds: number | null; baths: number | null; min: number | null; max: number | null };
const EMPTY_FILTERS: Filters = { ptype: null, beds: null, baths: null, min: null, max: null };

export function BienesRaicesScreen() {
  const { L, lang } = useLang();
  const es = lang === 'es';
  const app = useApp();
  const { user, profile } = useAuth();
  const router = useRouter();

  // ── list state ──
  const [view, setView] = useState<View>('descubrir');
  const [deal, setDeal] = useState<ReDeal>('venta');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<'relevance' | 'price_asc' | 'price_desc' | 'newest'>('relevance');
  const [hood, setHood] = useState<string | null>(null);
  const [hoodOptions, setHoodOptions] = useState<[string, number][]>([]);
  const [q, setQ] = useState('');
  const [qDeb, setQDeb] = useState('');
  const [results, setResults] = useState<ReCard[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // ── saved ──
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedList, setSavedList] = useState<ReCard[] | null>(null);
  // ── agents directory ──
  const [agencies, setAgencies] = useState<ReAgency[] | null>(null);
  // ── detail (?p=<slug> deep link) ──
  const { value: pSlug, open: openP, close: closeP } = useUrlDetail('p');
  const [detail, setDetail] = useState<ReDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [similar, setSimilar] = useState<ReCard[] | null>(null);
  const [gi, setGi] = useState(0); // gallery index
  // ── map ──
  const mapDiv = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<MlMarker[]>([]);
  const lastFitKey = useRef('');
  const [mapSelId, setMapSelId] = useState<string | null>(null);
  // ── flows ──
  const [calc, setCalc] = useState<{ price: number; down: number; rate: number; years: number } | null>(null);
  const [sched, setSched] = useState<{ mode: 'presencial' | 'video'; day: number; slot: number; name: string; phone: string; msg: string; busy: boolean; done: boolean; doneAt: string } | null>(null);
  const [ap, setAp] = useState<{ step: number; offer: string; name: string; email: string; phone: string; income: string; move: number; consent: boolean; busy: boolean; done: boolean } | null>(null);
  const [contact, setContact] = useState<{ msg: string; busy: boolean } | null>(null);
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2200); };

  // ── global search → local box (the screen owns its Zillow-style search bar,
  //    but a query committed from the app header still lands here). ──
  useEffect(() => { if (app.search) setQ(app.search); }, [app.search]);
  useEffect(() => {
    const t = window.setTimeout(() => setQDeb(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  // ── main list fetch (server-side geo + FTS + filters + sort + pagination) ──
  useEffect(() => {
    let cancelled = false;
    setResults(null);
    void searchProperties({
      lat: app.coords?.lat ?? null, lng: app.coords?.lng ?? null, city: app.cityShort,
      deal, ptype: filters.ptype, beds: filters.beds, baths: filters.baths,
      min: filters.min, max: filters.max, q: qDeb || null, hood, sort,
      limit: LIMIT, offset: 0,
    }).then((rows) => { if (!cancelled) setResults(rows); });
    return () => { cancelled = true; };
  }, [deal, filters, qDeb, hood, sort, app.coords?.lat, app.coords?.lng, app.cityShort]);

  const total = results?.[0]?.totalCount ?? results?.length ?? 0;
  const hasMore = results != null && results.length > 0 && results.length < total;
  const loadMore = async () => {
    if (!results || loadingMore) return;
    setLoadingMore(true);
    const rows = await searchProperties({
      lat: app.coords?.lat ?? null, lng: app.coords?.lng ?? null, city: app.cityShort,
      deal, ptype: filters.ptype, beds: filters.beds, baths: filters.baths,
      min: filters.min, max: filters.max, q: qDeb || null, hood, sort,
      limit: LIMIT, offset: results.length,
    });
    setLoadingMore(false);
    setResults((cur) => (cur ? [...cur, ...rows.filter((r) => !cur.some((c) => c.id === r.id))] : rows));
  };

  // Popular hoods derive from the last un-hooded result set so the rail doesn't
  // collapse to one chip the moment a barrio is selected.
  useEffect(() => {
    if (hood || results == null) return;
    const m = new Map<string, number>();
    results.forEach((r) => { if (r.hood) m.set(r.hood, (m.get(r.hood) ?? 0) + 1); });
    setHoodOptions([...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8));
  }, [results, hood]);

  // Changing deal mode drops filters that no longer apply to it.
  const setDealMode = (d: ReDeal) => {
    setDeal(d);
    setHood(null);
    setFilters((f) => ({
      ...f,
      ptype: f.ptype && TYPES_FOR[d].includes(f.ptype) ? f.ptype : null,
      min: null, max: null, // sale vs monthly ranges aren't comparable
    }));
  };
  const filterCount =
    (filters.ptype ? 1 : 0) + (filters.beds ? 1 : 0) + (filters.baths ? 1 : 0) + (filters.min != null || filters.max != null ? 1 : 0);

  // ── saved hearts (cross-device via property_saves) ──
  useEffect(() => {
    if (!user) { setSavedIds(new Set()); return; }
    let cancelled = false;
    void fetchSavedPropertyIds().then((s) => { if (!cancelled) setSavedIds(s); });
    return () => { cancelled = true; };
  }, [user]);
  const toggleSave = (p: { id: string }) => {
    if (!user) { router.push('/entrar'); return; }
    const on = savedIds.has(p.id);
    setSavedIds((prev) => { const n = new Set(prev); if (on) n.delete(p.id); else n.add(p.id); return n; });
    setSavedList((cur) => (cur && on ? cur.filter((x) => x.id !== p.id) : cur));
    void setPropertySaved(p.id, user.id, !on);
    if (!on) flash(L('Guardada en tus favoritos', 'Saved to your favorites'));
  };

  // Guardados view → fetch the saved cards fresh on entry.
  useEffect(() => {
    if (view !== 'guardados' || !user) return;
    let cancelled = false;
    setSavedList(null);
    void fetchSavedProperties().then((rows) => { if (!cancelled) setSavedList(rows); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, user]);

  // Agentes directory.
  useEffect(() => {
    if (view !== 'agentes') return;
    let cancelled = false;
    setAgencies(null);
    void fetchReDirectory(app.cityShort).then((rows) => { if (!cancelled) setAgencies(rows); });
    return () => { cancelled = true; };
  }, [view, app.cityShort]);

  // ── detail resolve (?p=<slug>): fetch + count the view + load similares ──
  useEffect(() => {
    if (pSlug == null) { setDetail(null); setSimilar(null); return; }
    let cancelled = false;
    setDetail(null); setSimilar(null); setGi(0); setDetailLoading(true);
    void fetchPropertyBySlug(pSlug).then((d) => {
      if (cancelled) return;
      setDetailLoading(false);
      if (!d) {
        flash(L('Esta propiedad ya no está disponible', 'This listing is no longer available'));
        closeP();
        return;
      }
      setDetail(d);
      void trackPropertyView(d.id);
      void searchProperties({ city: d.city, deal: d.deal, limit: 7 }).then((rows) => {
        if (!cancelled) setSimilar(rows.filter((r) => r.id !== d.id).slice(0, 6));
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pSlug]);
  const openDetail = (p: ReCard) => {
    openP(p.slug);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };
  const closeDetail = () => { closeP(); setDetail(null); };

  // Native share with clipboard fallback (Eventos pattern) — deep link ?p=<slug>.
  const doShare = async (title: string, slug: string) => {
    let url = '';
    if (typeof window !== 'undefined') {
      url = `${window.location.origin}${window.location.pathname}?p=${encodeURIComponent(slug)}`;
    }
    const text = L('Mira esta propiedad en To’Latino', 'Check out this listing on To’Latino');
    try {
      if (typeof navigator !== 'undefined' && navigator.share) { await navigator.share({ title, text, url }); return; }
      if (typeof navigator !== 'undefined' && navigator.clipboard) { await navigator.clipboard.writeText(`${title} — ${url}`); flash(L('Enlace copiado', 'Link copied')); }
    } catch { /* user cancelled the share sheet */ }
  };

  // ── MapLibre price-pin map (raster OSM tiles — no Google billing) ──
  const geoResults = useMemo(
    () => (results ?? []).filter((r): r is ReCard & { lat: number; lng: number } => r.lat != null && r.lng != null),
    [results],
  );
  const mapSel = geoResults.find((r) => r.id === mapSelId) ?? null;
  useEffect(() => {
    if (view !== 'mapa' || geoResults.length === 0 || !mapDiv.current) return;
    let cancelled = false;
    void (async () => {
      const ml = await import('maplibre-gl');
      if (cancelled || !mapDiv.current) return;
      if (!mapRef.current) {
        mapRef.current = new ml.Map({
          container: mapDiv.current,
          style: {
            version: 8,
            sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap' } },
            layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
          },
          center: [geoResults[0].lng, geoResults[0].lat],
          zoom: 11,
        });
      }
      const map = mapRef.current;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = geoResults.map((p) => {
        const sel = p.id === mapSelId;
        const el = document.createElement('button');
        el.type = 'button';
        el.className = `cursor-pointer whitespace-nowrap rounded-full border px-3 py-2 text-[11px] font-extrabold shadow-pop transition-transform ${
          sel ? 'z-10 scale-110 border-ink bg-ink text-white' : 'border-hair bg-white text-ink'}`;
        // Bare figure on the pin (no /mes suffix) — the unit lives on the card.
        el.textContent = fmtPrice(p.price, 'venta', es);
        el.onclick = () => setMapSelId(p.id);
        return new ml.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
      });
      const fitKey = geoResults.map((p) => p.id).join(',');
      if (fitKey !== lastFitKey.current) {
        lastFitKey.current = fitKey;
        const b = new ml.LngLatBounds();
        geoResults.forEach((p) => b.extend([p.lng, p.lat]));
        map.fitBounds(b, { padding: 56, maxZoom: 14, duration: 0 });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, geoResults, mapSelId, es]);
  // Tear the map down when leaving the view (and on unmount).
  useEffect(() => {
    if (view !== 'mapa' && mapRef.current) {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current.remove();
      mapRef.current = null;
      lastFitKey.current = '';
    }
  }, [view]);
  useEffect(() => () => {
    markersRef.current.forEach((m) => m.remove());
    mapRef.current?.remove();
    mapRef.current = null;
  }, []);

  // ── flow openers (auth-gated like Eventos: guests route to /entrar) ──
  const openCalcWith = (price: number) => setCalc({ price: Math.min(900000, Math.max(50000, Math.round(price))), down: 20, rate: 6.5, years: 30 });
  const openSched = () => {
    if (!detail) return;
    if (!user) { router.push('/entrar'); return; }
    setSched({ mode: 'presencial', day: 0, slot: -1, name: profile?.display_name ?? '', phone: '', msg: '', busy: false, done: false, doneAt: '' });
  };
  const openApply = () => {
    if (!detail) return;
    if (!user) { router.push('/entrar'); return; }
    setAp({ step: 0, offer: String(detail.price), name: profile?.display_name ?? '', email: user.email ?? '', phone: '', income: '', move: 0, consent: false, busy: false, done: false });
  };
  const openContact = () => {
    if (!detail) return;
    if (!user) { router.push('/entrar'); return; }
    setContact({
      msg: L(`Hola, me interesa ${detail.title}. ¿Podemos agendar una visita?`, `Hi, I'm interested in ${detail.title}. Can we schedule a tour?`),
      busy: false,
    });
  };

  // Tour days: 7 days starting tomorrow.
  const tourDays = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return { d, wdEs: WD3_ES[d.getDay()], wdEn: WD3_EN[d.getDay()], num: d.getDate() };
    });
  }, []);
  const confirmTour = async () => {
    if (!detail || !sched || sched.busy) return;
    if (sched.slot < 0 || !sched.name.trim()) return;
    const day = tourDays[sched.day];
    const sl = SLOTS[sched.slot];
    const at = new Date(day.d);
    at.setHours(sl.h, sl.m, 0, 0);
    setSched({ ...sched, busy: true });
    const err = await bookPropertyTour(detail.slug, at.toISOString(), sched.mode, sched.name.trim(), sched.phone.trim() || undefined, sched.msg.trim() || undefined);
    if (err) {
      setSched({ ...sched, busy: false });
      flash(err === 'offline' ? L('Sin conexión — intenta de nuevo', 'Offline — try again') : L('No se pudo agendar la visita', 'Could not book the tour'));
      return;
    }
    setSched({ ...sched, busy: false, done: true, doneAt: `${L(day.wdEs, day.wdEn)} ${day.num} · ${sl.label}` });
  };

  const isOffer = detail?.deal === 'venta';
  const offerAmount = ap ? Math.round(Number(ap.offer.replace(/[^0-9.]/g, ''))) : 0;
  const apCanNext = !ap ? false
    : ap.step === 0 ? ap.name.trim().length > 0 && ap.email.trim().length > 0
    : ap.step === 1 ? (isOffer ? offerAmount > 0 : ap.income !== '' && ap.consent)
    : true;
  const apNext = async () => {
    if (!detail || !ap || ap.busy || !apCanNext) return;
    if (ap.step < 2) { setAp({ ...ap, step: ap.step + 1 }); return; }
    setAp({ ...ap, busy: true });
    const err = await createPropertyLead(detail.slug, isOffer ? 'oferta' : 'solicitud', {
      name: ap.name.trim(), email: ap.email.trim(), phone: ap.phone.trim() || undefined,
      offer: isOffer ? offerAmount || detail.price : undefined,
      income: !isOffer ? ap.income : undefined,
      moveIn: !isOffer ? MOVE_OPTS[ap.move].v : undefined,
    });
    if (err) {
      setAp({ ...ap, busy: false });
      flash(isOffer ? L('No se pudo enviar tu oferta', 'Could not send your offer') : L('No se pudo enviar tu solicitud', 'Could not send your application'));
      return;
    }
    setAp({ ...ap, busy: false, done: true });
  };
  const sendContact = async () => {
    if (!detail || !contact || contact.busy || !contact.msg.trim()) return;
    setContact({ ...contact, busy: true });
    const err = await createPropertyLead(detail.slug, 'mensaje', {
      name: profile?.display_name ?? user?.email ?? 'Cliente',
      email: user?.email ?? undefined,
      message: contact.msg.trim(),
    });
    if (err) { setContact({ ...contact, busy: false }); flash(L('No se pudo enviar el mensaje', 'Could not send the message')); return; }
    setContact(null);
    flash(L('Mensaje enviado al agente', 'Message sent to the agent'));
  };

  // ── shared render bits ───────────────────────────────────────────────────
  const heartBtn = (p: ReCard | ReDetail, cls: string, size = 15) => {
    const on = savedIds.has(p.id);
    return (
      <button
        onClick={(ev) => { ev.stopPropagation(); toggleSave(p); }}
        aria-label={on ? L('Quitar de guardados', 'Remove from saved') : L('Guardar', 'Save')}
        className={`flex cursor-pointer items-center justify-center rounded-full bg-[rgba(255,255,255,.94)] shadow-card ${cls}`}
      >
        {on ? <HeartFilled size={size} className="text-pink-dark" /> : <Heart size={size} stroke={2.2} className="text-ink-soft" />}
      </button>
    );
  };
  const bedsLabel = (p: ReCard | ReDetail): string | null =>
    p.deal === 'cuarto' ? L('1 cuarto', '1 room')
    : p.deal === 'comercial' ? null
    : p.beds != null ? `${p.beds} ${L('rec', 'bd')}` : null;
  const specRow = (p: ReCard | ReDetail, compact = false) => {
    const txt = compact ? 'text-[10.5px]' : 'text-[11.5px]';
    return (
      <div className={`flex items-center gap-3 font-bold text-ink-soft ${txt}`}>
        {bedsLabel(p) && <span className="flex items-center gap-1"><Bed size={compact ? 12 : 14} stroke={2} className="text-muted" />{bedsLabel(p)}</span>}
        {p.baths != null && <span className="flex items-center gap-1"><Bath size={compact ? 12 : 14} stroke={2} className="text-muted" />{p.baths} {L('baños', 'ba')}</span>}
        {p.sqft != null && <span className="flex items-center gap-1"><Ruler size={compact ? 12 : 14} stroke={2} className="text-muted" />{p.sqft.toLocaleString()} ft²</span>}
      </div>
    );
  };
  const dealPill = (d: ReDeal, extra = '') => (
    <span className={`rounded-[8px] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.04em] ${DEAL_TAG[d].cls} ${extra}`}>
      {L(DEAL_TAG[d].es, DEAL_TAG[d].en)}
    </span>
  );

  /** Vertical property card (discover list). */
  const cardV = (p: ReCard) => (
    <Card key={p.id} className="overflow-hidden transition-shadow hover:shadow-card-lg" onClick={() => openDetail(p)}>
      <div className="relative h-[150px]" style={tileBg(p.deal, p.photos[0])}>
        <span className="absolute left-2.5 top-2.5">{dealPill(p.deal)}</span>
        {heartBtn(p, 'absolute right-2.5 top-2.5 h-[34px] w-[34px]')}
        {p.openHouse && (
          <span className="absolute bottom-2.5 left-2.5 rounded-[8px] bg-green px-2 py-1 text-[9px] font-extrabold text-white">
            {L('Casa abierta', 'Open house')}
          </span>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[18px] font-extrabold tracking-[-.01em] text-ink">{fmtPrice(p.price, p.deal, es)}</span>
          {distLabel(p.distanceM) && <span className="text-[10.5px] font-bold text-muted-2">{distLabel(p.distanceM)}</span>}
        </div>
        <div className="mt-2">{specRow(p)}</div>
        <div className="mt-2 truncate text-[12px] font-semibold text-muted">
          {[p.address, p.hood].filter(Boolean).join(' · ') || p.title}
        </div>
      </div>
    </Card>
  );

  /** Horizontal thumbnail card (guardados + map selection). */
  const rowH = (p: ReCard) => (
    <Card key={p.id} className="flex overflow-hidden" onClick={() => openDetail(p)}>
      <div className="relative w-[118px] flex-none" style={tileBg(p.deal, p.photos[0])}>
        {heartBtn(p, 'absolute left-2 top-2 h-[30px] w-[30px]', 14)}
      </div>
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-center gap-1.5">{dealPill(p.deal)}
          {p.openHouse && <span className="rounded-[8px] bg-green-bg px-2 py-0.5 text-[9px] font-extrabold text-green-dark">{L('Casa abierta', 'Open house')}</span>}
        </div>
        <div className="mt-1.5 text-[16px] font-extrabold text-ink">{fmtPrice(p.price, p.deal, es)}</div>
        <div className="mt-1.5">{specRow(p, true)}</div>
        <div className="mt-1.5 truncate text-[10.5px] font-semibold text-muted">
          {[p.address, p.hood, p.city].filter(Boolean).join(' · ') || p.title}
        </div>
      </div>
    </Card>
  );

  const viewHeader = (title: string, sub?: string) => (
    <div className="mb-4 flex items-center gap-3">
      <button
        onClick={() => setView('descubrir')}
        aria-label={L('Volver', 'Back')}
        className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full bg-white shadow-card"
      >
        <ChevronLeft size={18} stroke={2.4} className="text-ink" />
      </button>
      <div className="min-w-0">
        <h1 className="text-[19px] font-extrabold tracking-[-.02em] text-ink lg:text-[24px]">{title}</h1>
        {sub && <div className="truncate text-[12px] font-semibold text-muted">{sub}</div>}
      </div>
    </div>
  );

  // Featured hero only on the clean default list (Eventos rule: never above "Sin resultados").
  const filtered = !!qDeb || filterCount > 0 || hood != null || sort !== 'relevance';
  const feat = !filtered && results != null && results.length > 0
    ? results.slice().sort((a, b) => b.views - a.views)[0]
    : null;
  const listCards = feat ? (results ?? []).filter((r) => r.id !== feat.id) : results ?? [];

  const sortLabels: Record<typeof sort, string> = {
    relevance: L('Relevancia', 'Relevance'), price_asc: L('Precio ↑', 'Price ↑'),
    price_desc: L('Precio ↓', 'Price ↓'), newest: L('Más nuevos', 'Newest'),
  };
  const cycleSort = () => {
    const order: (typeof sort)[] = ['relevance', 'price_asc', 'price_desc', 'newest'];
    setSort(order[(order.indexOf(sort) + 1) % order.length]);
  };

  const dealTitle: Record<ReDeal, [string, string, string, string]> = {
    venta: ['Casas en venta', 'Homes for sale', `Encuentra tu próximo hogar en ${app.cityShort}`, `Find your next home in ${app.cityShort}`],
    renta: ['En renta', 'For rent', 'Departamentos y casas cerca de ti', 'Apartments & homes near you'],
    cuarto: ['Cuartos y roommates', 'Rooms & roommates', 'Espacios compartidos accesibles', 'Affordable shared spaces'],
    comercial: ['Locales comerciales', 'Commercial spaces', 'Para tu negocio o inversión', 'For your business or investment'],
  };

  // ── mortgage numbers for the calculator sheet ──
  const calcOut = calc ? mortgageMonthly(calc.price, calc.down, calc.rate, calc.years) : null;

  // ── DETAIL sub-blocks (rendered in main column on mobile, right rail on lg) ──
  const d = detail;
  const detailCtas = d && (
    <div className="flex items-center gap-2.5">
      <button
        onClick={openSched}
        className="flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-primary bg-white px-3 py-3 text-[13px] font-extrabold text-primary-dark"
      >
        <CalendarEvent size={16} stroke={2.2} /> {L('Agendar visita', 'Schedule tour')}
      </button>
      <button
        onClick={openApply}
        className="min-h-[48px] flex-1 cursor-pointer rounded-btn-lg bg-primary px-3 py-3 text-[13px] font-extrabold text-white shadow-cta"
      >
        {d.deal === 'venta' ? L('Hacer oferta', 'Make offer') : L('Aplicar', 'Apply')}
      </button>
    </div>
  );
  const agentCard = d && d.bizName && (
    <Card className="p-3.5">
      <div className="flex items-center gap-3">
        {d.bizLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.bizLogo} alt="" className="h-12 w-12 flex-none rounded-tile object-cover" />
        ) : (
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-tile bg-lilac-2 text-[15px] font-extrabold text-primary-dark">
            {initialsOf(d.bizName)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13.5px] font-extrabold text-ink">{d.bizName}</span>
            {d.bizTier && d.bizTier !== 'free' && <VerifiedBadge size={16} />}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold text-muted-2">
            {d.bizRating != null && (
              <span className="flex items-center gap-0.5"><StarFilled size={11} className="text-amber" />{d.bizRating.toFixed(1)}{d.bizReviews != null && <span className="font-semibold"> ({d.bizReviews})</span>}</span>
            )}
            {d.bizLicense && (
              <span className="flex items-center gap-1 rounded-full bg-lilac-2 px-2 py-0.5 text-[9.5px] font-extrabold text-primary-dark">
                <IdCard size={11} stroke={2.2} /> Lic. {d.bizLicense}
              </span>
            )}
            {d.bizLangs && <span>{d.bizLangs}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={openContact}
          className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-field border-[1.5px] border-lilac-line bg-white py-2.5 text-[11.5px] font-extrabold text-primary-dark"
        >
          <MessageCircle size={14} stroke={2.2} /> {L('Mensaje', 'Message')}
        </button>
        {d.bizPhone && (
          <a
            href={`tel:${d.bizPhone}`}
            className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-field border-[1.5px] border-lilac-line bg-white py-2.5 text-[11.5px] font-extrabold text-primary-dark"
          >
            <Phone size={14} stroke={2.2} /> {L('Llamar', 'Call')}
          </a>
        )}
        {d.bizSlug && (
          <button
            onClick={() => router.push(`/negocios/?b=${encodeURIComponent(d.bizSlug!)}`)}
            className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1 rounded-field border-[1.5px] border-lilac-line bg-white py-2.5 text-[11.5px] font-extrabold text-primary-dark"
          >
            {L('Ver perfil', 'View profile')} <ChevronRight size={13} stroke={2.6} />
          </button>
        )}
      </div>
    </Card>
  );
  const mortgageTeaser = d && d.deal === 'venta' && (
    <button
      onClick={() => openCalcWith(d.price)}
      className="flex w-full cursor-pointer items-center gap-3 rounded-tile bg-lilac-2 p-3 text-left"
    >
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-white">
        <Calculator size={17} stroke={2} className="text-primary-dark" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-extrabold text-ink">{L('Estima tu pago mensual', 'Estimate your monthly payment')}</span>
        <span className="block text-[10.5px] font-bold text-muted">
          {L('Desde', 'From')} ${Math.round(mortgageMonthly(d.price, 20, 6.5, 30).total).toLocaleString()}{L('/mes', '/mo')} · 20% {L('de enganche', 'down')}
        </span>
      </span>
      <ChevronRight size={16} stroke={2.4} className="flex-none text-primary-dark" />
    </button>
  );
  const rentalCard = d && d.deal !== 'venta' && (d.rental.deposit != null || d.rental.available || d.rental.lease) && (
    <Card className="divide-y divide-[rgba(30,27,46,.06)] px-3.5">
      {d.rental.deposit != null && (
        <div className="flex items-center justify-between py-2.5 text-[12.5px]">
          <span className="font-semibold text-muted">{L('Depósito', 'Deposit')}</span>
          <span className="font-extrabold text-ink">${Math.round(d.rental.deposit).toLocaleString()}</span>
        </div>
      )}
      {d.rental.available && (
        <div className="flex items-center justify-between py-2.5 text-[12.5px]">
          <span className="font-semibold text-muted">{L('Disponible', 'Available')}</span>
          <span className="font-extrabold text-ink">{fmtDateShort(d.rental.available, es)}</span>
        </div>
      )}
      {d.rental.lease && (
        <div className="flex items-center justify-between py-2.5 text-[12.5px]">
          <span className="font-semibold text-muted">{L('Contrato', 'Lease')}</span>
          <span className="font-extrabold text-ink">{d.rental.lease}</span>
        </div>
      )}
    </Card>
  );

  const ptypeLabel = (t: RePtype): string => {
    const o = RE_TYPES.find((x) => x.id === t);
    return o ? L(o.es, o.en) : t;
  };

  // ═════════════════════════════════════ render ════════════════════════════
  return (
    <div>
      {/* ─────────────────────────── DETALLE ─────────────────────────── */}
      {(pSlug != null || detailLoading) && (
        d == null ? (
          <div>
            <div className="h-[240px] animate-pulse rounded-card bg-lilac-2 md:h-[320px]" />
            <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-lilac-2" />
            <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-hair" />
            <div className="mt-6 text-center text-[12px] font-semibold text-muted-2">{L('Cargando propiedad…', 'Loading listing…')}</div>
          </div>
        ) : (
          <div className="pb-24 md:pb-4">
            {/* hero gallery */}
            <div className="relative -mx-3.5 -mt-4 md:mx-0 md:mt-0 md:overflow-hidden md:rounded-card">
              <div className="h-[250px] md:h-[340px]" style={tileBg(d.deal, d.photos[gi] ?? d.photos[0])} />
              <button
                onClick={closeDetail}
                aria-label={L('Volver', 'Back')}
                className="absolute left-3.5 top-3.5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-card"
              >
                <ChevronLeft size={18} stroke={2.6} className="text-ink" />
              </button>
              <div className="absolute right-3.5 top-3.5 flex gap-2">
                <button
                  onClick={() => doShare(d.title, d.slug)}
                  aria-label={L('Compartir', 'Share')}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-card"
                >
                  <Share2 size={16} stroke={2.2} className="text-ink" />
                </button>
                {heartBtn(d, 'h-10 w-10', 17)}
              </div>
              {d.photos.length > 1 && (
                <div className="no-scrollbar absolute bottom-3 left-3.5 right-3.5 flex gap-2 overflow-x-auto">
                  {d.photos.map((ph, i) => (
                    <button
                      key={i}
                      onClick={() => setGi(i)}
                      aria-label={`${L('Foto', 'Photo')} ${i + 1}`}
                      className={`h-[46px] w-[46px] flex-none cursor-pointer rounded-[10px] border-2 bg-cover bg-center ${i === gi ? 'border-primary' : 'border-white'}`}
                      style={{ backgroundImage: `url(${ph})` }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
              {/* main column */}
              <div className="pt-4 lg:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  {dealPill(d.deal)}
                  {d.openHouse && (
                    <span className="rounded-[8px] bg-green-bg px-2.5 py-1 text-[9.5px] font-extrabold text-green-dark">
                      {L('Casa abierta', 'Open house')} · {openHouseText(d.openHouse, es)}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 text-[27px] font-extrabold tracking-[-.01em] text-ink">{fmtPriceFull(d.price, d.deal, es)}</div>
                <div className="mt-1 text-[14px] font-bold text-ink-soft">{d.title}</div>
                <div className="mt-1 text-[12px] font-semibold text-muted">
                  {[d.address, d.hood, d.city].filter(Boolean).join(' · ')}
                </div>

                {/* spec tiles */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {(d.deal === 'comercial'
                    ? [
                        { k: 'ft²', v: d.sqft != null ? d.sqft.toLocaleString() : '—' },
                        { k: L('Baños', 'Baths'), v: d.baths != null ? String(d.baths) : '—' },
                        { k: L('Año', 'Year'), v: d.yearBuilt != null ? String(d.yearBuilt) : '—' },
                        { k: L('Uso', 'Use'), v: ptypeLabel(d.ptype) },
                      ]
                    : [
                        { k: L('Recámaras', 'Beds'), v: d.deal === 'cuarto' ? '1' : d.beds != null ? String(d.beds) : '—' },
                        { k: L('Baños', 'Baths'), v: d.baths != null ? String(d.baths) : '—' },
                        { k: 'ft²', v: d.sqft != null ? d.sqft.toLocaleString() : '—' },
                        { k: L('Año', 'Year'), v: d.yearBuilt != null ? String(d.yearBuilt) : '—' },
                      ]
                  ).map((st) => (
                    <div key={st.k} className="rounded-tile bg-lilac-2 px-1 py-3 text-center">
                      <div className="text-[15px] font-extrabold text-ink">{st.v}</div>
                      <div className="mt-0.5 text-[8.5px] font-extrabold uppercase tracking-[.05em] text-muted-2">{st.k}</div>
                    </div>
                  ))}
                </div>

                {/* mortgage teaser / renta details — main column on mobile only (lg → rail) */}
                <div className="mt-3 flex flex-col gap-3 lg:hidden">
                  {mortgageTeaser}
                  {rentalCard}
                </div>

                {/* about + features */}
                {(d.descEs || d.descEn) && (
                  <div className="mt-5">
                    <div className="mb-1.5 text-[15px] font-extrabold text-ink">{L('Descripción', 'About')}</div>
                    <div className="text-[13.5px] font-medium leading-[1.6] text-ink-3">{L(d.descEs ?? d.descEn ?? '', d.descEn ?? d.descEs ?? '')}</div>
                  </div>
                )}
                {(d.feats.length > 0 || d.policies.pets || d.policies.noCredit || d.policies.cosigner) && (
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {d.feats.map((f, i) => (
                      <span key={i} className="flex items-center gap-1.5 rounded-field border border-hair bg-white px-3 py-2 text-[11px] font-bold text-ink-soft">
                        <Check size={13} stroke={2.8} className="text-green" /> {L(f.es, f.en || f.es)}
                      </span>
                    ))}
                    {d.policies.pets && (
                      <span className="flex items-center gap-1.5 rounded-field border border-hair bg-white px-3 py-2 text-[11px] font-bold text-ink-soft">
                        <Check size={13} stroke={2.8} className="text-green" /> {L('Mascotas OK', 'Pets OK')}
                      </span>
                    )}
                    {d.policies.noCredit && (
                      <span className="flex items-center gap-1.5 rounded-field border border-hair bg-white px-3 py-2 text-[11px] font-bold text-ink-soft">
                        <Check size={13} stroke={2.8} className="text-green" /> {L('Sin verificación de crédito', 'No credit check')}
                      </span>
                    )}
                    {d.policies.cosigner && (
                      <span className="flex items-center gap-1.5 rounded-field border border-hair bg-white px-3 py-2 text-[11px] font-bold text-ink-soft">
                        <Check size={13} stroke={2.8} className="text-green" /> {L('Acepta aval', 'Co-signer accepted')}
                      </span>
                    )}
                  </div>
                )}

                {/* facts */}
                <div className="mt-5">
                  <div className="mb-2 text-[15px] font-extrabold text-ink">{L('Detalles', 'Facts')}</div>
                  <Card className="divide-y divide-[rgba(30,27,46,.06)] px-3.5">
                    {[
                      [L('Tipo', 'Type'), ptypeLabel(d.ptype)],
                      [L('Año construido', 'Year built'), d.yearBuilt != null ? String(d.yearBuilt) : L('No indicado', 'Not listed')],
                      [L('Tamaño del lote', 'Lot size'), d.lotSqft != null ? `${d.lotSqft.toLocaleString()} ft²` : '—'],
                      ['HOA', d.hoa != null && d.hoa > 0 ? `$${Math.round(d.hoa).toLocaleString()}${L('/mes', '/mo')}` : L('Ninguno', 'None')],
                      [L('Días publicado', 'Days listed'), `${daysListed(d.publishedAt ?? d.createdAt)} ${L('días', 'days')}`],
                      [L('Vistas', 'Views'), d.views.toLocaleString()],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-2.5 text-[12.5px]">
                        <span className="font-semibold text-muted">{k}</span>
                        <span className="font-extrabold text-ink">{v}</span>
                      </div>
                    ))}
                  </Card>
                </div>

                {/* location */}
                <div className="mt-5">
                  <div className="mb-2 text-[15px] font-extrabold text-ink">{L('Ubicación', 'Location')}</div>
                  {d.lat != null && d.lng != null && (
                    <div className="overflow-hidden rounded-card border-[1.5px] border-lilac-line">
                      <iframe
                        title={L('Mapa de la propiedad', 'Property map')}
                        src={mapEmbedUrl(d.lat, d.lng)}
                        loading="lazy"
                        className="block h-[168px] w-full"
                        style={{ border: 0 }}
                      />
                    </div>
                  )}
                  <a
                    href={mapsUrl(d.lat, d.lng, [d.address, d.city].filter(Boolean).join(', ') || d.title)}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-[12.5px] font-bold text-primary-dark"
                  >
                    <MapPin size={13} stroke={2.4} />
                    <span className="min-w-0 flex-1 truncate">{[d.address, d.hood].filter(Boolean).join(' · ') || d.city}</span>
                    <Navigation size={12} stroke={2.4} className="flex-none" />
                    <span className="flex-none">{L('Cómo llegar', 'Directions')}</span>
                  </a>
                </div>

                {/* agent — main column on mobile only (lg → rail) */}
                {agentCard && (
                  <div className="mt-5 lg:hidden">
                    <div className="mb-2 text-[15px] font-extrabold text-ink">{L('Agente', 'Listing agent')}</div>
                    {agentCard}
                  </div>
                )}

                {/* similar */}
                <div className="mt-5">
                  <div className="mb-2.5 text-[15px] font-extrabold text-ink">{L('Propiedades similares', 'Similar homes')}</div>
                  {similar == null ? (
                    <div className="py-4 text-center text-[12px] font-semibold text-muted-2">{L('Cargando…', 'Loading…')}</div>
                  ) : similar.length === 0 ? (
                    <div className="rounded-card-sm border border-dashed border-hair bg-white py-5 text-center text-[12px] font-semibold text-muted-2">
                      {L('No hay propiedades similares por ahora.', 'No similar listings right now.')}
                    </div>
                  ) : (
                    <div className="no-scrollbar -mx-3.5 flex gap-3 overflow-x-auto px-3.5 pb-1">
                      {similar.map((p) => (
                        <Card key={p.id} className="w-[160px] flex-none overflow-hidden" onClick={() => openDetail(p)}>
                          <div className="h-[88px]" style={tileBg(p.deal, p.photos[0])} />
                          <div className="p-2.5">
                            <div className="text-[13.5px] font-extrabold text-ink">{fmtPrice(p.price, p.deal, es)}</div>
                            <div className="mt-0.5 truncate text-[10px] font-bold text-muted">
                              {[bedsLabel(p), p.hood ?? p.city].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* desktop right rail: CTAs + mortgage/renta + agent */}
              <aside className="hidden lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-3.5">
                <Card className="p-4">
                  <div className="text-[22px] font-extrabold text-ink">{fmtPriceFull(d.price, d.deal, es)}</div>
                  <div className="mt-1 truncate text-[11.5px] font-semibold text-muted">{d.title}</div>
                  <div className="mt-3.5">{detailCtas}</div>
                </Card>
                {mortgageTeaser}
                {rentalCard}
                {agentCard}
              </aside>
            </div>

            {/* mobile sticky CTA bar (above the bottom nav; tablet has no nav) */}
            <div className="fixed inset-x-0 bottom-[62px] z-40 border-t border-hair bg-white px-3.5 py-2.5 md:bottom-0 lg:hidden">
              <div className="mx-auto max-w-[720px]">{detailCtas}</div>
            </div>
          </div>
        )
      )}

      {/* ─────────────────────────── LIST VIEWS ─────────────────────────── */}
      {pSlug == null && !detailLoading && (
        <>
          {view === 'descubrir' && (
            <div>
              <div className="mb-3.5">
                <h1 className="text-[20px] font-extrabold tracking-[-.02em] text-ink lg:text-[26px]">{L(dealTitle[deal][0], dealTitle[deal][1])}</h1>
                <div className="mt-0.5 text-[12.5px] font-semibold text-muted">{L(dealTitle[deal][2], dealTitle[deal][3])}</div>
              </div>

              {/* search + filters */}
              <div className="mb-3 flex gap-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-btn border border-hair bg-white px-3.5 shadow-card">
                  <Search size={16} stroke={2.2} className="flex-none text-muted-2" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={L('Colonia, dirección o palabra clave', 'Neighborhood, address or keyword')}
                    className="min-w-0 flex-1 bg-transparent py-3 text-[13px] font-semibold text-ink outline-none placeholder:text-muted-2"
                  />
                </div>
                <button
                  onClick={() => setFiltersOpen(true)}
                  aria-label={L('Filtros', 'Filters')}
                  className="relative flex h-[46px] w-[46px] flex-none cursor-pointer items-center justify-center rounded-btn bg-primary shadow-cta-sm"
                >
                  <Adjustments size={19} stroke={2.2} className="text-white" />
                  {filterCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-app bg-amber px-1 text-[9px] font-extrabold text-amber-ink">
                      {filterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* deal segmented toggle */}
              <div className="mb-3 flex gap-1 rounded-btn bg-lilac-2 p-1">
                {RE_DEALS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setDealMode(m.id)}
                    className={`min-h-[38px] flex-1 cursor-pointer rounded-[9px] px-1 text-[11.5px] font-extrabold transition-colors ${
                      deal === m.id ? 'bg-white text-ink shadow-card' : 'text-muted'}`}
                  >
                    {L(m.es, m.en)}
                  </button>
                ))}
              </div>

              {/* quick access chips */}
              <div className="no-scrollbar -mx-3.5 mb-4 flex gap-2 overflow-x-auto px-3.5">
                <Chip onClick={() => setView('mapa')} className="flex items-center gap-1.5">
                  <MapIcon size={14} stroke={2.2} className="text-primary-dark" /> {L('Mapa', 'Map')}
                </Chip>
                <Chip onClick={() => (user ? setView('guardados') : router.push('/entrar'))} className="flex items-center gap-1.5">
                  <Heart size={14} stroke={2.2} className="text-pink-dark" /> {L('Guardados', 'Saved')}
                  {savedIds.size > 0 && <span className="rounded-full bg-pink-bg px-1.5 text-[10px] font-extrabold text-pink-dark">{savedIds.size}</span>}
                </Chip>
                <Chip onClick={() => setView('agentes')} className="flex items-center gap-1.5">
                  <BuildingEstate size={14} stroke={2.2} className="text-primary-dark" /> {L('Agentes', 'Agents')}
                </Chip>
                <Chip onClick={() => openCalcWith(results?.[0]?.price && deal === 'venta' ? results[0].price : 300000)} className="flex items-center gap-1.5">
                  <Calculator size={14} stroke={2.2} className="text-primary-dark" /> {L('Calculadora', 'Calculator')}
                </Chip>
              </div>

              {/* featured hero */}
              {feat && (
                <div
                  className="mb-5 cursor-pointer overflow-hidden rounded-card shadow-card-lg transition-shadow hover:shadow-band"
                  onClick={() => openDetail(feat)}
                >
                  <div className="relative h-[200px] md:h-[240px]" style={tileBg(feat.deal, feat.photos[0])}>
                    <span className={`absolute left-3.5 top-3.5 rounded-[9px] px-3 py-1.5 text-[9.5px] font-extrabold uppercase tracking-[.05em] ${
                      feat.openHouse ? 'bg-green text-white' : 'bg-ink text-white'}`}
                    >
                      {feat.openHouse ? L('Casa abierta', 'Open house') : L('Destacada', 'Featured')}
                    </span>
                    {heartBtn(feat, 'absolute right-3 top-3 h-[38px] w-[38px]', 17)}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(30,27,46,.85)] to-transparent px-4 pb-3.5 pt-9">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[22px] font-extrabold tracking-[-.01em] text-white">{fmtPrice(feat.price, feat.deal, es)}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[13px] font-bold text-white/90">{feat.title}</div>
                      <div className="mt-1.5 flex items-center gap-2.5 text-[11.5px] font-bold text-white/80">
                        {bedsLabel(feat) && <span>{bedsLabel(feat)}</span>}
                        {feat.baths != null && <span>· {feat.baths} {L('baños', 'ba')}</span>}
                        {feat.sqft != null && <span>· {feat.sqft.toLocaleString()} ft²</span>}
                      </div>
                    </div>
                  </div>
                  {feat.bizName && (
                    <div className="flex items-center gap-2.5 bg-white px-4 py-2.5">
                      {feat.bizLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={feat.bizLogo} alt="" className="h-8 w-8 flex-none rounded-[9px] object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-lilac-2 text-[11px] font-extrabold text-primary-dark">
                          {initialsOf(feat.bizName)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11.5px] font-extrabold text-ink">{feat.bizName}</div>
                        {feat.bizRating != null && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-2">
                            <StarFilled size={10} className="text-amber" /> {feat.bizRating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <span className="flex-none rounded-field bg-primary px-3.5 py-2 text-[11px] font-extrabold text-white">{L('Ver', 'View')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* popular hoods */}
              {(hoodOptions.length > 1 || hood) && (
                <div className="mb-4">
                  <div className="mb-2.5 text-[14px] font-extrabold text-ink">{L('Barrios populares', 'Popular neighborhoods')}</div>
                  <div className="no-scrollbar -mx-3.5 flex gap-2.5 overflow-x-auto px-3.5">
                    {hoodOptions.map(([h, n]) => (
                      <button
                        key={h}
                        onClick={() => setHood(hood === h ? null : h)}
                        className={`relative h-[88px] w-[128px] flex-none cursor-pointer overflow-hidden rounded-tile text-left ${
                          hood === h ? 'ring-2 ring-primary' : ''}`}
                        style={tileBg(deal)}
                      >
                        <span className="absolute inset-0 bg-gradient-to-t from-[rgba(30,27,46,.72)] to-transparent" />
                        <span className="absolute bottom-2 left-2.5 right-2.5">
                          <span className="block truncate text-[12.5px] font-extrabold text-white">{h}</span>
                          <span className="block text-[10px] font-bold text-white/80">{n} {n === 1 ? L('propiedad', 'listing') : L('propiedades', 'listings')}</span>
                        </span>
                        {hood === h && (
                          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <Check size={12} stroke={3} className="text-white" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* results header: count + sort */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13.5px] font-extrabold text-ink">
                  {results == null ? L('Buscando…', 'Searching…') : `${total} ${total === 1 ? L('resultado', 'result') : L('resultados', 'results')}`}
                  {hood && <span className="font-bold text-muted"> · {hood}</span>}
                </span>
                <button onClick={cycleSort} className="flex cursor-pointer items-center gap-1 text-[12px] font-extrabold text-primary-dark">
                  {sortLabels[sort]} <ChevronRight size={13} stroke={2.6} className="rotate-90" />
                </button>
              </div>

              {/* list */}
              {results == null ? (
                <SkeletonList count={6} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" />
              ) : results.length === 0 ? (
                <Card className="p-10 text-center">
                  {filtered ? (
                    <>
                      <div className="text-[15px] font-extrabold text-ink">{L('Sin resultados', 'No results')}</div>
                      <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Prueba quitar filtros o cambiar de modo.', 'Try removing filters or switching mode.')}</div>
                      {filterCount > 0 && (
                        <button onClick={() => { setFilters(EMPTY_FILTERS); setHood(null); }} className="mt-3 cursor-pointer rounded-btn bg-lilac-2 px-4 py-2.5 text-[12px] font-extrabold text-primary-dark">
                          {L('Limpiar filtros', 'Clear filters')}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-[15px] font-extrabold text-ink">{L(`Todavía no hay propiedades en ${app.cityShort}`, `No listings in ${app.cityShort} yet`)}</div>
                      <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Los agentes de tu zona pronto publicarán aquí.', 'Agents in your area will publish here soon.')}</div>
                    </>
                  )}
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{listCards.map(cardV)}</div>
                  {hasMore && (
                    <button
                      onClick={() => void loadMore()}
                      disabled={loadingMore}
                      className="mt-5 w-full cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3 text-[13px] font-extrabold text-primary-dark disabled:opacity-50"
                    >
                      {loadingMore ? L('Cargando…', 'Loading…') : L('Ver más propiedades', 'See more listings')}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─────────── MAPA ─────────── */}
          {view === 'mapa' && (
            <div>
              {viewHeader(
                L('Mapa de propiedades', 'Listings map'),
                `${L(DEAL_TAG[deal].es, DEAL_TAG[deal].en)} · ${app.cityShort}`,
              )}
              {results == null ? (
                <Card className="p-10 text-center text-[12.5px] font-semibold text-muted">{L('Cargando propiedades…', 'Loading listings…')}</Card>
              ) : geoResults.length === 0 ? (
                <Card className="p-10 text-center">
                  <div className="text-[15px] font-extrabold text-ink">{L('Nada que mostrar en el mapa', 'Nothing to show on the map')}</div>
                  <div className="mt-1 text-[12.5px] font-semibold text-muted">
                    {results.length === 0
                      ? L('No hay propiedades con estos filtros.', 'No listings match these filters.')
                      : L('Estas propiedades no tienen ubicación exacta.', 'These listings have no exact location.')}
                  </div>
                </Card>
              ) : (
                <div className="relative overflow-hidden rounded-card border border-hair shadow-card">
                  <div ref={mapDiv} className="h-[60vh] w-full lg:h-[68vh]" />
                  {/* deal switch over the map */}
                  <div className="no-scrollbar absolute left-3 right-3 top-3 flex gap-1.5 overflow-x-auto">
                    {RE_DEALS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setDealMode(m.id); setMapSelId(null); }}
                        className={`flex-none cursor-pointer rounded-full px-3.5 py-2 text-[11.5px] font-extrabold shadow-card ${
                          deal === m.id ? 'bg-primary text-white' : 'bg-white text-ink-soft'}`}
                      >
                        {L(m.es, m.en)}
                      </button>
                    ))}
                  </div>
                  {/* selected listing floating card */}
                  {mapSel && (
                    <div className="absolute inset-x-3 bottom-3">{rowH(mapSel)}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─────────── GUARDADOS ─────────── */}
          {view === 'guardados' && (
            <div>
              {viewHeader(L('Guardados', 'Saved'), user ? `${savedIds.size} ${savedIds.size === 1 ? L('propiedad guardada', 'saved listing') : L('propiedades guardadas', 'saved listings')}` : undefined)}
              {!user ? (
                <Card className="p-10 text-center">
                  <div className="text-[15px] font-extrabold text-ink">{L('Inicia sesión para ver tus guardados', 'Sign in to see your saved homes')}</div>
                  <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Tus favoritos te siguen en todos tus dispositivos.', 'Your favorites follow you across devices.')}</div>
                  <PrimaryBtn className="mx-auto mt-4 max-w-[240px]" onClick={() => router.push('/entrar')}>{L('Iniciar sesión', 'Sign in')}</PrimaryBtn>
                </Card>
              ) : savedList == null ? (
                <SkeletonList count={3} className="flex flex-col gap-3" />
              ) : savedList.length === 0 ? (
                <Card className="p-10 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-lilac-2">
                    <Heart size={26} stroke={2} className="text-muted-faint" />
                  </span>
                  <div className="mt-3 text-[15px] font-extrabold text-ink">{L('Aún no guardas nada', 'Nothing saved yet')}</div>
                  <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Guarda propiedades con ♥ para compararlas después.', 'Save listings with ♥ to compare them later.')}</div>
                  <PrimaryBtn className="mx-auto mt-4 max-w-[220px]" onClick={() => setView('descubrir')}>{L('Explorar', 'Browse')}</PrimaryBtn>
                </Card>
              ) : (
                <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">{savedList.map(rowH)}</div>
              )}
            </div>
          )}

          {/* ─────────── AGENTES (directorio) ─────────── */}
          {view === 'agentes' && (
            <div>
              {viewHeader(L('Agentes e inmobiliarias', 'Agents & agencies'), L(`Verificados en ${app.cityShort}`, `Verified in ${app.cityShort}`))}
              {/* join CTA */}
              <div
                className="mb-4 flex items-center gap-3.5 rounded-card p-4 shadow-band"
                style={{ background: 'linear-gradient(150deg,#6743E2,#8268FF)' }}
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-tile bg-[rgba(255,255,255,.18)]">
                  <BuildingEstate size={22} stroke={2} className="text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-extrabold text-white">{L('¿Eres agente o inmobiliaria?', 'Are you an agent or agency?')}</div>
                  <div className="text-[11px] font-semibold text-white/80">{L('Publica propiedades y recibe clientes.', 'List properties and get clients.')}</div>
                </div>
                <button
                  onClick={() => router.push('/negocio/publicar')}
                  className="flex-none cursor-pointer rounded-field bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-primary-press"
                >
                  {L('Únete gratis', 'Join free')}
                </button>
              </div>
              {agencies == null ? (
                <SkeletonList count={4} className="flex flex-col gap-3" />
              ) : agencies.length === 0 ? (
                <Card className="p-10 text-center">
                  <div className="text-[15px] font-extrabold text-ink">{L(`Aún no hay agentes en ${app.cityShort}`, `No agents in ${app.cityShort} yet`)}</div>
                  <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Sé el primero en unirte al directorio.', 'Be the first to join the directory.')}</div>
                </Card>
              ) : (
                <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
                  {agencies.map((a) => (
                    <Card key={a.id} className="flex items-center gap-3 p-3.5" onClick={() => router.push(`/negocios/?b=${encodeURIComponent(a.slug)}`)}>
                      {a.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.logo} alt="" className="h-12 w-12 flex-none rounded-tile object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-tile bg-lilac-2 text-[15px] font-extrabold text-primary-dark">
                          {initialsOf(a.name)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13.5px] font-extrabold text-ink">{a.name}</span>
                          {a.tier !== 'free' && <VerifiedBadge size={16} />}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] font-bold text-muted-2">
                          {a.rating != null && (
                            <span className="flex items-center gap-0.5"><StarFilled size={10} className="text-amber" />{a.rating.toFixed(1)} ({a.reviews})</span>
                          )}
                          <span>{a.listings} {a.listings === 1 ? L('propiedad', 'listing') : L('propiedades', 'listings')}</span>
                          {a.city && <span>· {a.city}</span>}
                        </div>
                        {a.specialty && (
                          <span className="mt-1.5 inline-block rounded-full bg-lilac-2 px-2.5 py-0.5 text-[9.5px] font-extrabold text-primary-dark">{a.specialty}</span>
                        )}
                      </div>
                      <ChevronRight size={16} stroke={2.4} className="flex-none text-muted-2" />
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────── FILTROS (sheet) ─────────────────────────── */}
      <Overlay open={filtersOpen} onClose={() => setFiltersOpen(false)} width={440}>
        <OverlayTitle title={L('Filtros', 'Filters')} onClose={() => setFiltersOpen(false)} />
        <div className="mb-2 text-[12px] font-extrabold text-ink">{L('Tipo de propiedad', 'Property type')}</div>
        <div className="flex flex-wrap gap-2">
          <Chip active={filters.ptype == null} onClick={() => setFilters({ ...filters, ptype: null })}>{L('Todos', 'All')}</Chip>
          {RE_TYPES.filter((t) => TYPES_FOR[deal].includes(t.id)).map((t) => (
            <Chip key={t.id} active={filters.ptype === t.id} onClick={() => setFilters({ ...filters, ptype: filters.ptype === t.id ? null : t.id })}>
              {L(t.es, t.en)}
            </Chip>
          ))}
        </div>
        {deal !== 'comercial' && (
          <>
            <div className="mb-2 mt-4 text-[12px] font-extrabold text-ink">{L('Recámaras', 'Bedrooms')}</div>
            <div className="flex gap-2">
              {[null, 1, 2, 3, 4].map((n) => (
                <button
                  key={String(n)}
                  onClick={() => setFilters({ ...filters, beds: n })}
                  className={`min-h-[40px] flex-1 cursor-pointer rounded-field text-[11.5px] font-extrabold ${
                    filters.beds === n ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}
                >
                  {n == null ? L('Cualq.', 'Any') : `${n}+`}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="mb-2 mt-4 text-[12px] font-extrabold text-ink">{L('Baños', 'Bathrooms')}</div>
        <div className="flex gap-2">
          {[null, 1, 2, 3].map((n) => (
            <button
              key={String(n)}
              onClick={() => setFilters({ ...filters, baths: n })}
              className={`min-h-[40px] flex-1 cursor-pointer rounded-field text-[11.5px] font-extrabold ${
                filters.baths === n ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}
            >
              {n == null ? L('Cualq.', 'Any') : `${n}+`}
            </button>
          ))}
        </div>
        <div className="mb-2 mt-4 text-[12px] font-extrabold text-ink">{L('Precio', 'Price')}</div>
        <div className="flex flex-col gap-2">
          {(deal === 'venta' ? PRICES_SALE : PRICES_MONTHLY).map((pr) => {
            const on = filters.min === pr.min && filters.max === pr.max;
            return (
              <button
                key={pr.es}
                onClick={() => setFilters({ ...filters, min: pr.min, max: pr.max })}
                className={`flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-field border-[1.5px] px-3 py-2.5 text-left ${
                  on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}
              >
                <span className={`flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-lilac-ring'}`}>
                  {on && <span className="h-[9px] w-[9px] rounded-full bg-primary" />}
                </span>
                <span className="flex-1 text-[12.5px] font-bold text-ink">{L(pr.es, pr.en)}</span>
              </button>
            );
          })}
        </div>
        {/* custom min/max */}
        <div className="mt-3 flex items-center gap-2">
          <input
            inputMode="numeric"
            value={filters.min ?? ''}
            onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setFilters({ ...filters, min: v ? Number(v) : null }); }}
            placeholder={L('Mín $', 'Min $')}
            className="min-w-0 flex-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[12.5px] font-bold text-ink outline-none focus:border-primary placeholder:font-semibold placeholder:text-muted-2"
          />
          <span className="text-[12px] font-bold text-muted-2">—</span>
          <input
            inputMode="numeric"
            value={filters.max ?? ''}
            onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setFilters({ ...filters, max: v ? Number(v) : null }); }}
            placeholder={L('Máx $', 'Max $')}
            className="min-w-0 flex-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[12.5px] font-bold text-ink outline-none focus:border-primary placeholder:font-semibold placeholder:text-muted-2"
          />
        </div>
        <div className="mt-4 flex items-center gap-2.5">
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="flex-none cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3 text-[12.5px] font-extrabold text-ink-2"
          >
            {L('Limpiar', 'Reset')}
          </button>
          <PrimaryBtn className="flex-1" onClick={() => setFiltersOpen(false)}>
            {results == null ? L('Ver resultados', 'Show results') : `${L('Ver', 'Show')} ${total} ${total === 1 ? L('resultado', 'result') : L('resultados', 'results')}`}
          </PrimaryBtn>
        </div>
      </Overlay>

      {/* ─────────────────────────── CALCULADORA ─────────────────────────── */}
      <Overlay open={calc != null} onClose={() => setCalc(null)} width={440}>
        {calc && calcOut && (
          <>
            <OverlayTitle title={L('Calculadora de hipoteca', 'Mortgage calculator')} onClose={() => setCalc(null)} />
            <div
              className="rounded-card p-5 text-center shadow-cta-sm"
              style={{ background: 'linear-gradient(135deg,#6D4DF6,#7B61FF)' }}
            >
              <div className="text-[10.5px] font-bold text-white/80">{L('Pago mensual estimado', 'Estimated monthly payment')}</div>
              <div className="mt-1 text-[36px] font-extrabold tracking-[-.02em] text-white">${Math.round(calcOut.total).toLocaleString()}</div>
              <div className="text-[10.5px] font-semibold text-white/80">{L('Capital, interés, impuestos y seguro', 'Principal, interest, taxes & insurance')}</div>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12px] font-extrabold">
                  <span className="text-ink">{L('Precio', 'Home price')}</span>
                  <span className="text-primary-dark">${calc.price.toLocaleString()}</span>
                </div>
                <input type="range" min={50000} max={900000} step={5000} value={calc.price} onChange={(e) => setCalc({ ...calc, price: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12px] font-extrabold">
                  <span className="text-ink">{L('Enganche', 'Down payment')}</span>
                  <span className="text-primary-dark">{calc.down}% · ${Math.round((calc.price * calc.down) / 100).toLocaleString()}</span>
                </div>
                <input type="range" min={0} max={50} step={1} value={calc.down} onChange={(e) => setCalc({ ...calc, down: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12px] font-extrabold">
                  <span className="text-ink">{L('Tasa de interés', 'Interest rate')}</span>
                  <span className="text-primary-dark">{calc.rate.toFixed(1)}%</span>
                </div>
                <input type="range" min={3} max={9} step={0.1} value={calc.rate} onChange={(e) => setCalc({ ...calc, rate: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
              <div>
                <div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Plazo', 'Loan term')}</div>
                <div className="flex gap-2">
                  {[10, 15, 20, 30].map((y) => (
                    <button
                      key={y}
                      onClick={() => setCalc({ ...calc, years: y })}
                      className={`min-h-[40px] flex-1 cursor-pointer rounded-field text-[11.5px] font-extrabold ${
                        calc.years === y ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}
                    >
                      {y} {L('años', 'yrs')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Card className="mt-4 divide-y divide-[rgba(30,27,46,.06)] px-3.5">
              {[
                { k: L('Capital + interés', 'Principal + interest'), v: calcOut.pi, dot: 'bg-primary' },
                { k: L('Impuesto predial', 'Property tax'), v: calcOut.tax, dot: 'bg-amber' },
                { k: L('Seguro', 'Insurance'), v: calcOut.ins, dot: 'bg-green' },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between py-2.5 text-[12.5px]">
                  <span className="flex items-center gap-2 font-semibold text-ink-2">
                    <span className={`h-2 w-2 rounded-[3px] ${r.dot}`} /> {r.k}
                  </span>
                  <span className="font-extrabold text-ink">${Math.round(r.v).toLocaleString()}</span>
                </div>
              ))}
            </Card>
            <div className="mt-3 flex items-start gap-2 rounded-field bg-lilac-2 px-3 py-2.5">
              <InfoCircle size={15} stroke={2.2} className="mt-0.5 flex-none text-primary-dark" />
              <span className="text-[10.5px] font-semibold leading-snug text-ink-soft">
                {L('Estimado — no es una oferta de crédito. No incluye HOA ni PMI; consulta con un prestamista.', 'Estimate — not a credit offer. Excludes HOA and PMI; check with a lender.')}
              </span>
            </div>
          </>
        )}
      </Overlay>

      {/* ─────────────────────────── AGENDAR VISITA ─────────────────────────── */}
      <Overlay open={sched != null} onClose={() => setSched(null)} width={460} fullHeightSheet>
        {sched && d && !sched.done && (
          <>
            <OverlayTitle title={L('Agendar visita', 'Schedule tour')} onClose={() => setSched(null)} />
            <div className="mb-3 truncate text-[12px] font-semibold text-muted">{d.title} · {fmtPriceFull(d.price, d.deal, es)}</div>
            {/* mode */}
            <div className="mb-4 flex gap-2.5">
              {([
                { key: 'presencial' as const, Icon: MapPin, t: L('Presencial', 'In person'), s: L('Recorre la propiedad', 'Walk the property') },
                { key: 'video' as const, Icon: Video, t: L('Video-tour', 'Video tour'), s: L('En vivo por video', 'Live over video') },
              ]).map((m) => {
                const on = sched.mode === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setSched({ ...sched, mode: m.key })}
                    className={`flex-1 cursor-pointer rounded-btn-lg border-2 p-3 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}
                  >
                    <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-[10px] ${on ? 'bg-lilac' : 'bg-lilac-2'}`}>
                      <m.Icon size={16} stroke={2.2} className={on ? 'text-primary-dark' : 'text-muted-2'} />
                    </span>
                    <span className="block text-[12.5px] font-extrabold text-ink">{m.t}</span>
                    <span className="block text-[10px] font-bold text-muted-2">{m.s}</span>
                  </button>
                );
              })}
            </div>
            {/* day */}
            <div className="mb-2 text-[13px] font-extrabold text-ink">{L('Elige el día', 'Pick a day')}</div>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {tourDays.map((td, i) => {
                const on = sched.day === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSched({ ...sched, day: i })}
                    className={`flex min-w-[52px] flex-none cursor-pointer flex-col items-center rounded-tile border-[1.5px] px-3 py-2 ${
                      on ? 'border-primary bg-primary' : 'border-lilac-line bg-white'}`}
                  >
                    <span className={`text-[9.5px] font-extrabold uppercase ${on ? 'text-white/80' : 'text-muted-2'}`}>{L(td.wdEs, td.wdEn)}</span>
                    <span className={`text-[16px] font-extrabold leading-tight ${on ? 'text-white' : 'text-ink'}`}>{td.num}</span>
                  </button>
                );
              })}
            </div>
            {/* slot */}
            <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Horario', 'Time')}</div>
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((sl, i) => {
                const on = sched.slot === i;
                return (
                  <button
                    key={sl.label}
                    onClick={() => setSched({ ...sched, slot: i })}
                    className={`min-h-[42px] cursor-pointer rounded-field border-[1.5px] text-[11.5px] font-extrabold ${
                      on ? 'border-primary bg-lilac-3 text-primary-dark' : 'border-lilac-line bg-white text-ink-soft'}`}
                  >
                    {sl.label}
                  </button>
                );
              })}
            </div>
            {/* contact */}
            <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Tus datos', 'Your info')}</div>
            <div className="flex flex-col gap-2.5">
              <input
                value={sched.name}
                onChange={(e) => setSched({ ...sched, name: e.target.value })}
                placeholder={`${L('Nombre completo', 'Full name')} *`}
                className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2"
              />
              <input
                value={sched.phone}
                onChange={(e) => setSched({ ...sched, phone: e.target.value })}
                inputMode="tel"
                placeholder={L('Teléfono (opcional)', 'Phone (optional)')}
                className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2"
              />
              <textarea
                value={sched.msg}
                onChange={(e) => setSched({ ...sched, msg: e.target.value })}
                rows={2}
                maxLength={400}
                placeholder={L('Mensaje para el agente (opcional)', 'Message for the agent (optional)')}
                className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium text-ink outline-none focus:border-primary placeholder:text-muted-2"
              />
            </div>
            <PrimaryBtn className="mt-4" disabled={sched.busy || sched.slot < 0 || !sched.name.trim()} onClick={() => void confirmTour()}>
              {sched.busy ? L('Agendando…', 'Booking…')
                : sched.slot < 0 ? L('Elige un horario', 'Pick a time')
                : !sched.name.trim() ? L('Escribe tu nombre', 'Enter your name')
                : L('Confirmar visita', 'Confirm tour')}
            </PrimaryBtn>
          </>
        )}
        {sched && d && sched.done && (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
              <Check size={28} stroke={3} className="text-green" />
            </span>
            <div className="mt-4 text-[19px] font-extrabold text-ink">{L('¡Visita agendada!', 'Tour scheduled!')}</div>
            <div className="mt-1.5 max-w-[300px] text-[12.5px] font-semibold leading-relaxed text-muted">
              {L('Le avisamos al agente — te confirmará el horario.', 'We notified the agent — they will confirm your time.')}
            </div>
            <Card className="mt-4 w-full max-w-[310px] divide-y divide-[rgba(30,27,46,.06)] px-3.5 text-left">
              <div className="flex items-center justify-between py-2.5 text-[12.5px]">
                <span className="font-semibold text-muted">{L('Cuándo', 'When')}</span>
                <span className="font-extrabold text-ink">{sched.doneAt}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-[12.5px]">
                <span className="font-semibold text-muted">{L('Tipo', 'Type')}</span>
                <span className="font-extrabold text-ink">{sched.mode === 'presencial' ? L('Presencial', 'In person') : L('Video-tour', 'Video tour')}</span>
              </div>
              {d.bizName && (
                <div className="flex items-center justify-between py-2.5 text-[12.5px]">
                  <span className="font-semibold text-muted">{L('Agente', 'Agent')}</span>
                  <span className="font-extrabold text-ink">{d.bizName}</span>
                </div>
              )}
            </Card>
            <PrimaryBtn className="mt-5 max-w-[310px]" onClick={() => setSched(null)}>{L('Listo', 'Done')}</PrimaryBtn>
          </div>
        )}
      </Overlay>

      {/* ─────────────────────────── OFERTA / SOLICITUD ─────────────────────────── */}
      <Overlay open={ap != null} onClose={() => setAp(null)} width={460} fullHeightSheet>
        {ap && d && !ap.done && (
          <>
            <OverlayTitle
              title={isOffer ? L('Hacer una oferta', 'Make an offer') : L('Solicitud', 'Application')}
              onClose={() => setAp(null)}
              onBack={ap.step > 0 ? () => setAp({ ...ap, step: ap.step - 1 }) : undefined}
            />
            {/* stepper */}
            <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
              {[L('Datos', 'Details'), isOffer ? L('Oferta', 'Offer') : L('Requisitos', 'Qualify'), L('Revisar', 'Review')].map((lbl, i) => {
                const on = i === ap.step;
                const done = i < ap.step;
                return (
                  <span
                    key={lbl}
                    className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${
                      on ? 'bg-primary text-white' : done ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted-2'}`}
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white ${
                      on ? 'bg-[rgba(255,255,255,.25)]' : done ? 'bg-primary' : 'bg-muted-faint'}`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    {lbl}
                  </span>
                );
              })}
            </div>

            {ap.step === 0 && (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Nombre completo', 'Full name')} *</div>
                  <input
                    value={ap.name}
                    onChange={(e) => setAp({ ...ap, name: e.target.value })}
                    placeholder={L('Tu nombre', 'Your name')}
                    className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2"
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Correo', 'Email')} *</div>
                  <input
                    value={ap.email}
                    onChange={(e) => setAp({ ...ap, email: e.target.value })}
                    inputMode="email"
                    placeholder="tu@correo.com"
                    className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2"
                  />
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Teléfono', 'Phone')}</div>
                  <input
                    value={ap.phone}
                    onChange={(e) => setAp({ ...ap, phone: e.target.value })}
                    inputMode="tel"
                    placeholder="(713) 555-0139"
                    className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2"
                  />
                </div>
              </div>
            )}

            {ap.step === 1 && isOffer && (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Monto de tu oferta', 'Your offer amount')}</div>
                  <div className="flex items-center gap-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary">
                    <span className="text-[15px] font-extrabold text-muted-2">$</span>
                    <input
                      value={ap.offer}
                      onChange={(e) => setAp({ ...ap, offer: e.target.value.replace(/[^0-9]/g, '') })}
                      inputMode="numeric"
                      placeholder={String(d.price)}
                      className="min-w-0 flex-1 bg-transparent py-3 text-[15px] font-extrabold text-ink outline-none placeholder:font-semibold placeholder:text-muted-2"
                    />
                  </div>
                  <div className="mt-1.5 text-[10.5px] font-bold text-muted-2">
                    {L('Precio de lista:', 'List price:')} {fmtPriceFull(d.price, d.deal, es)}
                  </div>
                </div>
              </div>
            )}
            {ap.step === 1 && !isOffer && (
              <div className="flex flex-col gap-3.5">
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Ingreso mensual', 'Monthly income')} *</div>
                  <div className="flex flex-col gap-2">
                    {INCOME_OPTS.map((o) => {
                      const on = ap.income === o.v;
                      return (
                        <button
                          key={o.v}
                          onClick={() => setAp({ ...ap, income: o.v })}
                          className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-field border-[1.5px] px-3 py-2.5 text-left ${
                            on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}
                        >
                          <span className={`flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-lilac-ring'}`}>
                            {on && <span className="h-[9px] w-[9px] rounded-full bg-primary" />}
                          </span>
                          <span className="text-[12.5px] font-bold text-ink">{L(o.es, o.en)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('¿Cuándo te mudarías?', 'When would you move?')}</div>
                  <div className="flex flex-col gap-2">
                    {MOVE_OPTS.map((o, i) => {
                      const on = ap.move === i;
                      return (
                        <button
                          key={o.v}
                          onClick={() => setAp({ ...ap, move: i })}
                          className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-field border-[1.5px] px-3 py-2.5 text-left ${
                            on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}
                        >
                          <span className={`flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-lilac-ring'}`}>
                            {on && <span className="h-[9px] w-[9px] rounded-full bg-primary" />}
                          </span>
                          <span className="text-[12.5px] font-bold text-ink">{L(o.es, o.en)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={() => setAp({ ...ap, consent: !ap.consent })} className="flex cursor-pointer items-start gap-2.5 text-left">
                  <span className={`mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] border-[1.5px] ${
                    ap.consent ? 'border-primary bg-primary' : 'border-lilac-ring bg-white'}`}
                  >
                    {ap.consent && <Check size={13} stroke={3.4} className="text-white" />}
                  </span>
                  <span className="text-[11px] font-semibold leading-snug text-ink-soft">
                    {L('Autorizo una verificación de crédito e historial para procesar mi solicitud.', 'I authorize a credit and background check to process my application.')}
                  </span>
                </button>
              </div>
            )}

            {ap.step === 2 && (
              <div className="flex flex-col gap-3">
                <Card className="flex items-center gap-3 p-3">
                  <span className="h-[52px] w-[52px] flex-none rounded-tile" style={tileBg(d.deal, d.photos[0])} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-extrabold text-ink">{fmtPriceFull(d.price, d.deal, es)}</div>
                    <div className="truncate text-[11px] font-semibold text-muted">{[d.address, d.city].filter(Boolean).join(', ') || d.title}</div>
                  </div>
                </Card>
                <Card className="divide-y divide-[rgba(30,27,46,.06)] px-3.5">
                  {(isOffer
                    ? [
                        [L('Tu oferta', 'Your offer'), `$${(offerAmount || d.price).toLocaleString()}`],
                        [L('Precio de lista', 'List price'), fmtPriceFull(d.price, d.deal, es)],
                        [L('Nombre', 'Name'), ap.name || '—'],
                        [L('Contacto', 'Contact'), ap.email || '—'],
                      ]
                    : [
                        [L('Nombre', 'Name'), ap.name || '—'],
                        [L('Contacto', 'Contact'), ap.email || '—'],
                        [L('Ingreso mensual', 'Monthly income'), ap.income || '—'],
                        [L('Mudanza', 'Move-in'), L(MOVE_OPTS[ap.move].es, MOVE_OPTS[ap.move].en)],
                      ]
                  ).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 py-2.5 text-[12px]">
                      <span className="font-semibold text-muted">{k}</span>
                      <span className="truncate font-extrabold text-ink">{v}</span>
                    </div>
                  ))}
                </Card>
                <div className="flex items-start gap-2 rounded-field bg-lilac-2 px-3 py-2.5">
                  <InfoCircle size={15} stroke={2.2} className="mt-0.5 flex-none text-primary-dark" />
                  <span className="text-[10.5px] font-semibold leading-snug text-ink-soft">
                    {isOffer
                      ? L('Al enviar, el agente recibe tu oferta. No es un contrato vinculante.', 'On submit, the agent receives your offer. This is not a binding contract.')
                      : L('Tu información se comparte de forma segura solo con el agente.', 'Your info is shared securely only with the agent.')}
                  </span>
                </div>
              </div>
            )}

            <PrimaryBtn className="mt-4" disabled={!apCanNext || ap.busy} onClick={() => void apNext()}>
              {ap.busy ? L('Enviando…', 'Sending…')
                : ap.step < 2 ? L('Continuar', 'Continue')
                : isOffer ? L('Enviar oferta', 'Submit offer') : L('Enviar solicitud', 'Submit application')}
            </PrimaryBtn>
          </>
        )}
        {ap && d && ap.done && (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
              <Check size={28} stroke={3} className="text-green" />
            </span>
            <div className="mt-4 text-[19px] font-extrabold text-ink">
              {isOffer ? L('¡Oferta enviada!', 'Offer submitted!') : L('¡Solicitud enviada!', 'Application submitted!')}
            </div>
            <div className="mt-1.5 max-w-[300px] text-[12.5px] font-semibold leading-relaxed text-muted">
              {isOffer
                ? L('Tu oferta llegó al agente. Te responderá pronto.', 'Your offer reached the agent. They will reply soon.')
                : L('El agente revisará tu solicitud y te contactará.', 'The agent will review your application and reach out.')}
            </div>
            {d.bizName && (
              <Card className="mt-4 flex w-full max-w-[310px] items-center gap-3 p-3.5 text-left">
                {d.bizLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.bizLogo} alt="" className="h-11 w-11 flex-none rounded-tile object-cover" />
                ) : (
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-tile bg-lilac-2 text-[14px] font-extrabold text-primary-dark">
                    {initialsOf(d.bizName)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-extrabold text-ink">{d.bizName}</span>
                    {d.bizTier && d.bizTier !== 'free' && <VerifiedBadge size={15} />}
                  </div>
                  <div className="text-[10.5px] font-bold text-muted-2">{L('Responde normalmente en 1 día', 'Usually replies within 1 day')}</div>
                </div>
              </Card>
            )}
            <PrimaryBtn className="mt-5 max-w-[310px]" onClick={() => { setAp(null); closeDetail(); }}>
              {L('Ver propiedades', 'Browse listings')}
            </PrimaryBtn>
          </div>
        )}
      </Overlay>

      {/* ─────────────────────────── MENSAJE AL AGENTE ─────────────────────────── */}
      <Overlay open={contact != null} onClose={() => setContact(null)} width={440}>
        {contact && d && (
          <>
            <OverlayTitle title={L('Mensaje al agente', 'Message agent')} onClose={() => setContact(null)} />
            {d.bizName && (
              <div className="mb-3 flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3">
                {d.bizLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.bizLogo} alt="" className="h-10 w-10 flex-none rounded-tile object-cover" />
                ) : (
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-tile bg-lilac-2 text-[13px] font-extrabold text-primary-dark">
                    {initialsOf(d.bizName)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-extrabold text-ink">{d.bizName}</span>
                    {d.bizTier && d.bizTier !== 'free' && <VerifiedBadge size={15} />}
                  </div>
                  <div className="truncate text-[10.5px] font-bold text-muted-2">{d.title}</div>
                </div>
              </div>
            )}
            <textarea
              value={contact.msg}
              onChange={(e) => setContact({ ...contact, msg: e.target.value })}
              rows={4}
              maxLength={800}
              className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium leading-relaxed text-ink outline-none focus:border-primary"
            />
            <PrimaryBtn className="mt-3" disabled={contact.busy || !contact.msg.trim()} onClick={() => void sendContact()}>
              {contact.busy ? L('Enviando…', 'Sending…') : L('Enviar mensaje', 'Send message')}
            </PrimaryBtn>
          </>
        )}
      </Overlay>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-[86px] left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-ink px-4 py-3 text-[12.5px] font-bold text-white shadow-modal md:bottom-6">
          <Check size={14} stroke={3} className="text-green" />
          {toast}
        </div>
      )}
    </div>
  );
}
