'use client';

// Autos (`/autos`) — consumer surface of the car-dealer vertical. CarGurus /
// AutoTrader benchmark, Latino-first: prominent "aquí pagas aquí" (BHPH),
// soft-check pre-qualification (no SSN / ITIN OK, no credit impact), verified
// clean history, and everything Spanish-first. Data contract: src/lib/autos.ts
// (migration 0119). Patterns mirror BienesRaices.tsx (useUrlDetail `?v=<slug>`,
// Overlay sheets, toast, price-pin map, saved hearts, tokens only).

import 'maplibre-gl/dist/maplibre-gl.css';
import { imgUrl, ANCHO } from '@/lib/img';
import { crearMapa } from '@/lib/mapa';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import type { Map as MlMap, Marker as MlMarker } from 'maplibre-gl';
import {
  IconAdjustmentsHorizontal as Adjustments, IconArrowsExchange as TradeIcon,
  IconBolt as Bolt, IconCalculator as Calculator, IconCalendarEvent as CalendarEvent,
  IconCamera as Camera, IconCar as Car, IconCheck as Check, IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight, IconCoin as Coin, IconCreditCard as CreditCard,
  IconGasStation as GasStation, IconGauge as Gauge, IconGitCompare as Compare,
  IconHeart as Heart, IconHeartFilled as HeartFilled, IconId as IdCard,
  IconInfoCircle as InfoCircle, IconMap as MapIcon, IconManualGearbox as Gearbox,
  IconMessageCircle as MessageCircle, IconPhone as Phone, IconSearch as Search,
  IconShare2 as Share2, IconShieldCheck as ShieldCheck, IconStarFilled as StarFilled,
  IconSteeringWheel as Steering, IconTag as Tag, IconX as XIcon,
} from '@tabler/icons-react';
import { ReportButton } from '@/components/ReportButton';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { useUrlDetail } from '@/lib/urlView';
import { Card, Chip, Overlay, OverlayTitle, PrimaryBtn, SkeletonList, Switch, VerifiedBadge } from '@/components/ui';
import {
  AU_CONDS, AU_TYPES, AU_TRANS, AU_FUELS, AU_MAKES, AU_TILE,
  searchVehicles, fetchVehicleBySlug, trackVehicleView, fetchAutoDirectory,
  createVehicleLead, bookVehicleTest, fetchSavedVehicleIds, setVehicleSaved,
  fetchSavedVehicles, autoMonthly, estMonthly, aprForCredit, tradeInEstimate,
  fmtMiles, fmtAuPrice,
  type AuCard, type AuDetail, type AuDealer, type AuCond, type AuType,
} from '@/lib/autos';

const LIMIT = 20;

// ── static option tables ─────────────────────────────────────────────────────
type Sort = 'relevance' | 'price_asc' | 'price_desc' | 'miles_asc' | 'year_desc';

/** Condition → tag-pill styling (tokens only). */
const COND_TAG: Record<AuCond, string> = {
  nuevo: 'bg-green-bg text-green-dark',
  certificado: 'bg-blue-bg text-blue',
  seminuevo: 'bg-lilac text-primary-dark',
  usado: 'bg-lilac-2 text-ink-soft',
};

type PricePreset = { min: number | null; max: number | null; es: string; en: string };
const PRICES: PricePreset[] = [
  { min: null, max: null, es: 'Cualquier precio', en: 'Any price' },
  { min: null, max: 10000, es: 'Hasta $10k', en: 'Up to $10k' },
  { min: 10000, max: 20000, es: '$10k – $20k', en: '$10k – $20k' },
  { min: 20000, max: 35000, es: '$20k – $35k', en: '$20k – $35k' },
  { min: 35000, max: 50000, es: '$35k – $50k', en: '$35k – $50k' },
  { min: 50000, max: null, es: '$50k o más', en: '$50k+' },
];
const YEARS: { v: number | null; es: string; en: string }[] = [
  { v: null, es: 'Cualquiera', en: 'Any' }, { v: 2018, es: '2018+', en: '2018+' },
  { v: 2020, es: '2020+', en: '2020+' }, { v: 2023, es: '2023+', en: '2023+' },
];
const MILES: { v: number | null; es: string; en: string }[] = [
  { v: null, es: 'Cualquiera', en: 'Any' }, { v: 30000, es: '< 30k', en: '< 30k' },
  { v: 60000, es: '< 60k', en: '< 60k' }, { v: 100000, es: '< 100k', en: '< 100k' },
];
const INCOME_OPTS: { v: string; mid: number; es: string; en: string }[] = [
  { v: 'Menos de $2,000/mes', mid: 1600, es: 'Menos de $2,000', en: 'Under $2,000' },
  { v: '$2,000 – $3,500/mes', mid: 2750, es: '$2,000 – $3,500', en: '$2,000 – $3,500' },
  { v: '$3,500 – $5,000/mes', mid: 4250, es: '$3,500 – $5,000', en: '$3,500 – $5,000' },
  { v: 'Más de $5,000/mes', mid: 6500, es: 'Más de $5,000', en: 'Over $5,000' },
];
const EMPLOY_OPTS: { id: string; es: string; en: string }[] = [
  { id: 'empleado', es: 'Empleado', en: 'Employed' },
  { id: 'propio', es: 'Propio negocio', en: 'Self-employed' },
  { id: 'efectivo', es: 'Efectivo/otro', en: 'Cash/other' },
];
const CREDIT_OPTS: { id: string; es: string; en: string }[] = [
  { id: 'excelente', es: 'Excelente', en: 'Excellent' },
  { id: 'bueno', es: 'Bueno', en: 'Good' },
  { id: 'regular', es: 'Regular', en: 'Fair' },
  { id: 'malo', es: 'Malo', en: 'Poor' },
];
const TRADE_CONDS: { id: 'excelente' | 'bueno' | 'regular'; es: string; en: string }[] = [
  { id: 'excelente', es: 'Excelente', en: 'Excellent' },
  { id: 'bueno', es: 'Bueno', en: 'Good' },
  { id: 'regular', es: 'Regular', en: 'Fair' },
];
const TERMS = [24, 36, 48, 60, 72, 84];
const AU_SLOTS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const WD3_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WD3_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fmt12h = (h: number): string => (h === 12 ? '12:00 PM' : h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`);
const initialsOf = (name: string): string =>
  name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '·';
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// ── state shapes ─────────────────────────────────────────────────────────────
type View = 'descubrir' | 'buscar' | 'mapa' | 'comparar' | 'guardados' | 'dealers';
type Filters = { vtype: AuType | null; make: string | null; min: number | null; max: number | null; yearMin: number | null; milesMax: number | null };
const EMPTY_FILTERS: Filters = { vtype: null, make: null, min: null, max: null, yearMin: null, milesMax: null };

type Calc = { price: number; downPct: number; apr: number; months: number };
type Prequal = {
  step: number; slug: string | null; name: string; email: string; phone: string;
  income: string; employ: string; credit: string; down: string; consent: boolean;
  busy: boolean; done: boolean; result: { amount: number; apr: number; monthly: number } | null;
};
type TestF = { day: number; slot: number; name: string; phone: string; msg: string; busy: boolean; done: boolean; doneAt: string };
type Tradein = { year: string; make: string; model: string; miles: string; cond: 'excelente' | 'bueno' | 'regular'; result: [number, number, number] | null };
type Vender = { step: number; cond: AuCond; vtype: AuType; make: string; model: string; year: string; miles: string; price: string; desc: string; photos: string[] };
type Contact = { msg: string; busy: boolean };

export function AutosScreen() {
  const { L, lang } = useLang();
  const es = lang === 'es';
  const app = useApp();
  const { user, profile } = useAuth();
  const router = useRouter();

  // ── list state ──
  const [view, setView] = useState<View>('descubrir');
  const [cond, setCond] = useState<AuCond | null>(null);
  const [bhph, setBhph] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<Sort>('relevance');
  const [q, setQ] = useState('');
  const [qDeb, setQDeb] = useState('');
  const [results, setResults] = useState<AuCard[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // ── saved / compare ──
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedList, setSavedList] = useState<AuCard[] | null>(null);
  const [compare, setCompare] = useState<AuCard[]>([]);
  // ── dealers directory ──
  const [dealers, setDealers] = useState<AuDealer[] | null>(null);
  // ── detail (?v=<slug>) ──
  const { value: vSlug, open: openV, close: closeV } = useUrlDetail('v');
  const [detail, setDetail] = useState<AuDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [similar, setSimilar] = useState<AuCard[] | null>(null);
  const [gi, setGi] = useState(0);
  // ── map ──
  const mapDiv = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<MlMarker[]>([]);
  const lastFitKey = useRef('');
  const [mapSelId, setMapSelId] = useState<string | null>(null);
  // ── flows ──
  const [calc, setCalc] = useState<Calc | null>(null);
  const [prequal, setPrequal] = useState<Prequal | null>(null);
  const [testF, setTestF] = useState<TestF | null>(null);
  const [tradein, setTradein] = useState<Tradein | null>(null);
  const [vender, setVender] = useState<Vender | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2200); };

  // ── label helpers ──
  const condLabel = (c: AuCond) => { const o = AU_CONDS.find((x) => x.id === c); return o ? L(o.es, o.en) : c; };
  const typeLabel = (t: AuType) => { const o = AU_TYPES.find((x) => x.id === t); return o ? L(o.es, o.en) : t; };
  const transLabel = (t: string | null) => { if (!t) return '—'; const o = AU_TRANS.find((x) => x.id === t); return o ? L(o.es, o.en) : t; };
  const fuelLabel = (f: string | null) => { if (!f) return '—'; const o = AU_FUELS.find((x) => x.id === f); return o ? L(o.es, o.en) : f; };
  const moStr = (price: number, down: number | null) => `$${Math.round(estMonthly(price, down)).toLocaleString()}`;

  // ── global search → local box ──
  useEffect(() => { if (app.search) { setQ(app.search); setView('buscar'); } }, [app.search]);
  useEffect(() => {
    const t = window.setTimeout(() => setQDeb(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  // ── main list fetch (server-side geo + FTS + filters + sort + pagination) ──
  useEffect(() => {
    let cancelled = false;
    setResults(null);
    void searchVehicles({
      lat: app.coords?.lat ?? null, lng: app.coords?.lng ?? null, city: app.cityShort,
      cond, vtype: filters.vtype, make: filters.make, min: filters.min, max: filters.max,
      yearMin: filters.yearMin, milesMax: filters.milesMax, bhph: bhph || null,
      q: qDeb || null, sort, limit: LIMIT, offset: 0,
    }).then((rows) => { if (!cancelled) setResults(rows); });
    return () => { cancelled = true; };
  }, [cond, bhph, filters, qDeb, sort, app.coords?.lat, app.coords?.lng, app.cityShort]);

  const total = results?.[0]?.totalCount ?? results?.length ?? 0;
  const hasMore = results != null && results.length > 0 && results.length < total;
  const loadMore = async () => {
    if (!results || loadingMore) return;
    setLoadingMore(true);
    const rows = await searchVehicles({
      lat: app.coords?.lat ?? null, lng: app.coords?.lng ?? null, city: app.cityShort,
      cond, vtype: filters.vtype, make: filters.make, min: filters.min, max: filters.max,
      yearMin: filters.yearMin, milesMax: filters.milesMax, bhph: bhph || null,
      q: qDeb || null, sort, limit: LIMIT, offset: results.length,
    });
    setLoadingMore(false);
    setResults((cur) => (cur ? [...cur, ...rows.filter((r) => !cur.some((c) => c.id === r.id))] : rows));
  };

  const filterCount =
    (filters.vtype ? 1 : 0) + (filters.make ? 1 : 0) + (filters.min != null || filters.max != null ? 1 : 0) +
    (filters.yearMin != null ? 1 : 0) + (filters.milesMax != null ? 1 : 0) + (bhph ? 1 : 0);

  // ── saved hearts (cross-device via vehicle_saves) ──
  useEffect(() => {
    if (!user) { setSavedIds(new Set()); return; }
    let cancelled = false;
    void fetchSavedVehicleIds().then((s) => { if (!cancelled) setSavedIds(s); });
    return () => { cancelled = true; };
  }, [user]);
  const toggleSave = (p: { id: string }) => {
    if (!user) { router.push('/entrar'); return; }
    const on = savedIds.has(p.id);
    setSavedIds((prev) => { const n = new Set(prev); if (on) n.delete(p.id); else n.add(p.id); return n; });
    setSavedList((cur) => (cur && on ? cur.filter((x) => x.id !== p.id) : cur));
    void setVehicleSaved(p.id, user.id, !on);
    if (!on) flash(L('Guardado en tus favoritos', 'Saved to your favorites'));
  };

  // ── compare (max 3) ──
  const compareIds = useMemo(() => new Set(compare.map((c) => c.id)), [compare]);
  const toggleCompare = (c: AuCard) => {
    const inList = compareIds.has(c.id);
    if (!inList && compare.length >= 3) { flash(L('Puedes comparar hasta 3 autos', 'You can compare up to 3 cars')); return; }
    setCompare(inList ? compare.filter((x) => x.id !== c.id) : [...compare, c]);
  };

  // Guardados view → fetch saved cards on entry.
  useEffect(() => {
    if (view !== 'guardados' || !user) return;
    let cancelled = false;
    setSavedList(null);
    void fetchSavedVehicles().then((rows) => { if (!cancelled) setSavedList(rows); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, user]);

  // Dealers directory.
  useEffect(() => {
    if (view !== 'dealers') return;
    let cancelled = false;
    setDealers(null);
    void fetchAutoDirectory(app.cityShort).then((rows) => { if (!cancelled) setDealers(rows); });
    return () => { cancelled = true; };
  }, [view, app.cityShort]);

  // ── detail resolve (?v=<slug>): fetch + count the view + load similar ──
  useEffect(() => {
    if (vSlug == null) { setDetail(null); setSimilar(null); return; }
    let cancelled = false;
    setDetail(null); setSimilar(null); setGi(0); setDetailLoading(true);
    void fetchVehicleBySlug(vSlug).then(async (dv) => {
      if (cancelled) return;
      setDetailLoading(false);
      if (!dv) { flash(L('Este auto ya no está disponible', 'This car is no longer available')); closeV(); return; }
      setDetail(dv);
      void trackVehicleView(dv.id);
      const byMake = await searchVehicles({ make: dv.make, city: dv.city, limit: 8 });
      let list = byMake.filter((r) => r.id !== dv.id);
      if (list.length < 3) {
        const byType = await searchVehicles({ vtype: dv.vtype, city: dv.city, limit: 8 });
        const seen = new Set(list.map((x) => x.id).concat(dv.id));
        list = [...list, ...byType.filter((m) => !seen.has(m.id))];
      }
      if (!cancelled) setSimilar(list.slice(0, 6));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vSlug]);
  const openDetail = (p: AuCard) => { openV(p.slug); if (typeof window !== 'undefined') window.scrollTo({ top: 0 }); };
  const closeDetail = () => { closeV(); setDetail(null); };

  // Native share with clipboard fallback — deep link ?v=<slug>.
  const doShare = async (title: string, slug: string) => {
    let url = '';
    if (typeof window !== 'undefined') url = `${window.location.origin}${window.location.pathname}?v=${encodeURIComponent(slug)}`;
    const text = L('Mira este auto en To’Latino', 'Check out this car on To’Latino');
    try {
      if (typeof navigator !== 'undefined' && navigator.share) { await navigator.share({ title, text, url }); return; }
      if (typeof navigator !== 'undefined' && navigator.clipboard) { await navigator.clipboard.writeText(`${title} — ${url}`); flash(L('Enlace copiado', 'Link copied')); }
    } catch { /* user cancelled */ }
  };

  // ── MapLibre price-pin map (raster OSM tiles — no Google billing) ──
  const geoResults = useMemo(
    () => (results ?? []).filter((r): r is AuCard & { lat: number; lng: number } => r.lat != null && r.lng != null),
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
        // `crearMapa` trae el respaldo por tiempo: si el estilo vectorial no
        // llega, cae al raster en vez de dejar el mapa vacío.
        mapRef.current = crearMapa(ml, {
          container: mapDiv.current,
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
        el.textContent = fmtAuPrice(p.price);
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
  }, [view, geoResults, mapSelId]);
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

  // ── flow openers (auth-gated: guests route to /entrar) ──
  const openCalc = (price: number, downDollars?: number | null) => {
    const p = clamp(Math.round(price), 5000, 80000);
    const downPct = downDollars != null && downDollars > 0 ? clamp(Math.round((downDollars / p) * 100), 0, 50) : 10;
    setCalc({ price: p, downPct, apr: 8.9, months: 72 });
  };
  const openPrequal = (slug?: string | null) => {
    if (!user) { router.push('/entrar'); return; }
    setPrequal({
      step: 0, slug: slug ?? null, name: profile?.display_name ?? '', email: user.email ?? '',
      phone: '', income: '', employ: '', credit: '', down: '', consent: false, busy: false, done: false, result: null,
    });
  };
  const openTest = () => {
    if (!detail) return;
    if (!user) { router.push('/entrar'); return; }
    setTestF({ day: 0, slot: -1, name: profile?.display_name ?? '', phone: '', msg: '', busy: false, done: false, doneAt: '' });
  };
  const openContact = () => {
    if (!detail) return;
    if (!user) { router.push('/entrar'); return; }
    setContact({ msg: L(`Hola, me interesa el ${detail.year} ${detail.make} ${detail.model}. ¿Sigue disponible?`, `Hi, I'm interested in the ${detail.year} ${detail.make} ${detail.model}. Is it still available?`), busy: false });
  };
  const openVender = () => setVender({ step: 0, cond: 'usado', vtype: 'sedan', make: '', model: '', year: '', miles: '', price: '', desc: '', photos: [] });
  const openTradein = () => setTradein({ year: '', make: AU_MAKES[0], model: '', miles: '', cond: 'bueno', result: null });

  // Tour days: 7 days starting tomorrow.
  const tourDays = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(base);
      dt.setDate(base.getDate() + i);
      return { d: dt, wdEs: WD3_ES[dt.getDay()], wdEn: WD3_EN[dt.getDay()], num: dt.getDate() };
    });
  }, []);
  const confirmTest = async () => {
    if (!detail || !testF || testF.busy || testF.slot < 0 || !testF.name.trim()) return;
    const day = tourDays[testF.day];
    const at = new Date(day.d);
    at.setHours(AU_SLOTS[testF.slot], 0, 0, 0);
    setTestF({ ...testF, busy: true });
    const err = await bookVehicleTest(detail.slug, at.toISOString(), testF.name.trim(), testF.phone.trim() || undefined, testF.msg.trim() || undefined);
    if (err) {
      setTestF({ ...testF, busy: false });
      flash(err === 'offline' ? L('Sin conexión — intenta de nuevo', 'Offline — try again') : L('No se pudo agendar la prueba', 'Could not book the test drive'));
      return;
    }
    setTestF({ ...testF, busy: false, done: true, doneAt: `${L(day.wdEs, day.wdEn)} ${day.num} · ${fmt12h(AU_SLOTS[testF.slot])}` });
  };

  // ── prequal soft-approval math (illustrative — no bureau pull) ──
  const prequalCanNext = !prequal ? false
    : prequal.step === 0 ? prequal.name.trim().length > 0 && prequal.email.trim().length > 0
    : prequal.step === 1 ? prequal.income !== '' && prequal.employ !== '' && prequal.credit !== ''
    : prequal.consent;
  const prequalNext = async () => {
    if (!prequal || prequal.busy || !prequalCanNext) return;
    if (prequal.step < 2) { setPrequal({ ...prequal, step: prequal.step + 1 }); return; }
    setPrequal({ ...prequal, busy: true });
    const down = Math.max(0, Math.round(Number(prequal.down.replace(/[^0-9]/g, '')) || 0));
    if (prequal.slug) {
      await createVehicleLead(prequal.slug, 'prequal', {
        name: prequal.name.trim(), email: prequal.email.trim(), phone: prequal.phone.trim() || undefined,
        income: prequal.income, employ: prequal.employ, credit: prequal.credit, down,
      });
    }
    const mid = INCOME_OPTS.find((o) => o.v === prequal.income)?.mid ?? 2750;
    const apr = aprForCredit(prequal.credit);
    const r = apr / 100 / 12; const n = 72;
    const payment = mid * 0.15;
    const loanCap = r === 0 ? payment * n : (payment * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));
    const amount = clamp(Math.round((loanCap + down) / 500) * 500, 6000, 85000);
    const monthly = autoMonthly(amount, down, apr, n).monthly;
    setPrequal({ ...prequal, busy: false, done: true, result: { amount, apr, monthly } });
  };

  const computeTradein = () => {
    if (!tradein) return;
    const yr = Number(tradein.year) || new Date().getFullYear();
    const mi = Number(tradein.miles.replace(/[^0-9]/g, '')) || 0;
    setTradein({ ...tradein, result: tradeInEstimate(yr, mi, tradein.cond) });
  };

  const sendContact = async () => {
    if (!detail || !contact || contact.busy || !contact.msg.trim()) return;
    setContact({ ...contact, busy: true });
    const err = await createVehicleLead(detail.slug, 'mensaje', {
      name: profile?.display_name ?? user?.email ?? 'Cliente', email: user?.email ?? undefined, message: contact.msg.trim(),
    });
    if (err) { setContact({ ...contact, busy: false }); flash(L('No se pudo enviar el mensaje', 'Could not send the message')); return; }
    setContact(null);
    flash(L('Mensaje enviado al dealer', 'Message sent to the dealer'));
  };

  const onVenderPhotos = (files: FileList | null) => {
    if (!files || !vender) return;
    const room = 12 - vender.photos.length;
    const urls = Array.from(files).slice(0, Math.max(0, room)).map((f) => URL.createObjectURL(f));
    setVender({ ...vender, photos: [...vender.photos, ...urls].slice(0, 6) });
  };

  // ── shared render bits ───────────────────────────────────────────────────
  const heartBtn = (p: AuCard | AuDetail, cls: string, size = 15) => {
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
  const compareBtn = (p: AuCard, cls: string) => {
    const on = compareIds.has(p.id);
    return (
      <button
        onClick={(ev) => { ev.stopPropagation(); toggleCompare(p); }}
        aria-label={L('Comparar', 'Compare')}
        className={`flex cursor-pointer items-center justify-center gap-1 rounded-full px-2.5 text-[10px] font-extrabold ${
          on ? 'bg-primary text-white' : 'bg-[rgba(255,255,255,.94)] text-ink-soft shadow-card'} ${cls}`}
      >
        <Compare size={13} stroke={2.4} /> {on ? L('Quitar', 'Added') : L('Comparar', 'Compare')}
      </button>
    );
  };
  const condPill = (c: AuCond, extra = '') => (
    <span className={`rounded-[8px] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.04em] ${COND_TAG[c]} ${extra}`}>{condLabel(c)}</span>
  );
  const bhphBadge = (extra = '') => (
    <span className={`flex items-center gap-1 rounded-[8px] bg-amber-bg px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.03em] text-amber-ink ${extra}`}>
      <Coin size={11} stroke={2.4} /> {L('Aquí pagas aquí', 'BHPH')}
    </span>
  );
  const cleanBadge = (extra = '') => (
    <span className={`flex items-center gap-1 rounded-[8px] bg-green-bg px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.03em] text-green-dark ${extra}`}>
      <ShieldCheck size={11} stroke={2.4} /> {L('Limpio', 'Clean')}
    </span>
  );
  const specMini = (p: AuCard | AuDetail, compact = false) => {
    const txt = compact ? 'text-[10.5px]' : 'text-[11.5px]';
    const isz = compact ? 12 : 14;
    return (
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 font-bold text-ink-soft ${txt}`}>
        <span className="flex items-center gap-1"><Gauge size={isz} stroke={2} className="text-muted" />{fmtMiles(p.miles, es)}</span>
        {p.trans && <span className="flex items-center gap-1"><Gearbox size={isz} stroke={2} className="text-muted" />{transLabel(p.trans)}</span>}
        {p.fuel && <span className="flex items-center gap-1"><GasStation size={isz} stroke={2} className="text-muted" />{fuelLabel(p.fuel)}</span>}
      </div>
    );
  };

  /** Vertical vehicle card (recommended list). */
  const cardV = (p: AuCard) => (
    <Card key={p.id} className="overflow-hidden transition-shadow hover:shadow-card-lg" onClick={() => openDetail(p)}>
      <div className="relative h-[150px]" style={tileBg(p.cond, p.photos[0])}>
        <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
          {condPill(p.cond)}
          {p.bhph && bhphBadge()}
        </span>
        {heartBtn(p, 'absolute right-2.5 top-2.5 h-[34px] w-[34px]')}
        {compareBtn(p, 'absolute bottom-2.5 right-2.5 h-[28px]')}
      </div>
      <div className="p-3.5">
        <div className="truncate text-[14.5px] font-extrabold tracking-[-.01em] text-ink">{p.year} {p.make} {p.model}</div>
        <div className="mt-2">{specMini(p)}</div>
        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <span className="text-[18px] font-extrabold tracking-[-.01em] text-ink">{fmtAuPrice(p.price)}</span>
          <span className="text-[11px] font-bold text-primary-dark">{moStr(p.price, p.down)}{L('/mes*', '/mo*')}</span>
        </div>
      </div>
    </Card>
  );

  /** Horizontal thumbnail card (search + saved + map selection). */
  const rowH = (p: AuCard) => (
    <Card key={p.id} className="flex overflow-hidden" onClick={() => openDetail(p)}>
      <div className="relative w-[124px] flex-none" style={tileBg(p.cond, p.photos[0])}>
        {heartBtn(p, 'absolute left-2 top-2 h-[30px] w-[30px]', 14)}
      </div>
      <div className="min-w-0 flex-1 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {condPill(p.cond)}
          {p.bhph && bhphBadge()}
        </div>
        <div className="mt-1.5 truncate text-[13.5px] font-extrabold text-ink">{p.year} {p.make} {p.model}</div>
        <div className="mt-1.5">{specMini(p, true)}</div>
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-extrabold text-ink">{fmtAuPrice(p.price)}</span>
          <span className="text-[10px] font-bold text-primary-dark">{moStr(p.price, p.down)}{L('/mes*', '/mo*')}</span>
        </div>
        <div className="mt-2">{compareBtn(p, 'h-[28px] w-fit')}</div>
      </div>
    </Card>
  );

  const viewHeader = (title: string, sub?: string) => (
    <div className="mb-4 flex items-center gap-3">
      <button onClick={() => setView('descubrir')} aria-label={L('Volver', 'Back')} className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full bg-white shadow-card">
        <ChevronLeft size={18} stroke={2.4} className="text-ink" />
      </button>
      <div className="min-w-0">
        <h1 className="text-[19px] font-extrabold tracking-[-.02em] text-ink lg:text-[24px]">{title}</h1>
        {sub && <div className="truncate text-[12px] font-semibold text-muted">{sub}</div>}
      </div>
    </div>
  );

  // Featured hero only on the clean default list (never above "Sin resultados").
  const filtered = !!qDeb || filterCount > 0 || cond != null || sort !== 'relevance';
  const feat = !filtered && results != null && results.length > 0 ? results.slice().sort((a, b) => b.views - a.views)[0] : null;
  const listCards = feat ? (results ?? []).filter((r) => r.id !== feat.id) : results ?? [];

  const sortLabels: Record<Sort, string> = {
    relevance: L('Relevancia', 'Relevance'), price_asc: L('Precio ↑', 'Price ↑'),
    price_desc: L('Precio ↓', 'Price ↓'), miles_asc: L('Millaje ↑', 'Miles ↑'), year_desc: L('Año ↓', 'Year ↓'),
  };
  const cycleSort = () => {
    const order: Sort[] = ['relevance', 'price_asc', 'price_desc', 'miles_asc', 'year_desc'];
    setSort(order[(order.indexOf(sort) + 1) % order.length]);
  };

  // ── calc numbers ──
  const calcDown = calc ? Math.round((calc.price * calc.downPct) / 100) : 0;
  const calcOut = calc ? autoMonthly(calc.price, calcDown, calc.apr, calc.months) : null;

  const d = detail;

  // ── DETAIL sub-blocks ──
  const detailCtas = d && (
    <div className="flex items-center gap-2.5">
      <button onClick={openTest} className="flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-primary bg-white px-3 py-3 text-[13px] font-extrabold text-primary-dark">
        <CalendarEvent size={16} stroke={2.2} /> {L('Prueba de manejo', 'Test drive')}
      </button>
      <button onClick={() => openPrequal(d.slug)} className="min-h-[48px] flex-1 cursor-pointer rounded-btn-lg bg-primary px-3 py-3 text-[13px] font-extrabold text-white shadow-cta">
        {L('Pre-calificar', 'Get pre-qualified')}
      </button>
    </div>
  );
  const dealerCard = d && d.bizName && (
    <Card className="p-3.5">
      <div className="flex items-center gap-3">
        {d.bizLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl(d.bizLogo, ANCHO.icono)} alt="" className="h-12 w-12 flex-none rounded-tile object-cover" />
        ) : (
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-tile bg-lilac-2 text-[15px] font-extrabold text-primary-dark">{initialsOf(d.bizName)}</span>
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
              <span className="flex items-center gap-1 rounded-full bg-lilac-2 px-2 py-0.5 text-[9.5px] font-extrabold text-primary-dark"><IdCard size={11} stroke={2.2} /> Lic. {d.bizLicense}</span>
            )}
            {d.bizLangs && <span>{d.bizLangs}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={openContact} className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-field border-[1.5px] border-lilac-line bg-white py-2.5 text-[11.5px] font-extrabold text-primary-dark">
          <MessageCircle size={14} stroke={2.2} /> {L('Mensaje', 'Message')}
        </button>
        {d.bizPhone && (
          <a href={`tel:${d.bizPhone}`} className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-field border-[1.5px] border-lilac-line bg-white py-2.5 text-[11.5px] font-extrabold text-primary-dark">
            <Phone size={14} stroke={2.2} /> {L('Llamar', 'Call')}
          </a>
        )}
        {d.bizSlug && (
          <button onClick={() => router.push(`/negocios/?b=${encodeURIComponent(d.bizSlug!)}`)} className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-1 rounded-field border-[1.5px] border-lilac-line bg-white py-2.5 text-[11.5px] font-extrabold text-primary-dark">
            {L('Ver perfil', 'View profile')} <ChevronRight size={13} stroke={2.6} />
          </button>
        )}
      </div>
    </Card>
  );
  const paymentTeaser = d && (
    <button onClick={() => openCalc(d.price, d.down)} className="flex w-full cursor-pointer items-center gap-3 rounded-tile bg-lilac-2 p-3 text-left">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-white"><Calculator size={17} stroke={2} className="text-primary-dark" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-extrabold text-ink">{L('Calcula tu mensualidad', 'Estimate your payment')}</span>
        <span className="block text-[10.5px] font-bold text-muted">{L('Desde', 'From')} {moStr(d.price, d.down)}{L('/mes', '/mo')} · APR 8.9% · 72 {L('meses', 'mo')}</span>
      </span>
      <ChevronRight size={16} stroke={2.4} className="flex-none text-primary-dark" />
    </button>
  );
  const bhphCard = d && d.bhph && (
    <Card className="p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-amber-bg"><Coin size={18} stroke={2} className="text-amber-ink" /></span>
        <div className="text-[13.5px] font-extrabold text-ink">{L('Aquí pagas aquí', 'Buy-here pay-here')}</div>
      </div>
      <div className="mt-2 text-[12px] font-semibold leading-relaxed text-ink-3">
        {L('Financiamiento del propio dealer, sin verificación de crédito. Acepta ITIN — no necesitas número social para calificar.', 'In-house dealer financing, no credit check. Accepts ITIN — no SSN needed to qualify.')}
      </div>
    </Card>
  );

  // ═════════════════════════════════════ render ════════════════════════════
  return (
    <div>
      {/* ─────────────────────────── DETALLE ─────────────────────────── */}
      {(vSlug != null || detailLoading) && (
        d == null ? (
          <div>
            <div className="h-[240px] animate-pulse rounded-card bg-lilac-2 md:h-[320px]" />
            <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-lilac-2" />
            <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-hair" />
            <div className="mt-6 text-center text-[12px] font-semibold text-muted-2">{L('Cargando auto…', 'Loading car…')}</div>
          </div>
        ) : (
          <div className="pb-24 md:pb-4">
            {/* hero gallery */}
            <div className="relative -mx-3.5 -mt-4 md:mx-0 md:mt-0 md:overflow-hidden md:rounded-card">
              <div className="h-[250px] md:h-[340px]" style={tileBg(d.cond, d.photos[gi] ?? d.photos[0])} />
              <button onClick={closeDetail} aria-label={L('Volver', 'Back')} className="absolute left-3.5 top-3.5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-card">
                <ChevronLeft size={18} stroke={2.6} className="text-ink" />
              </button>
              <div className="absolute right-3.5 top-3.5 flex gap-2">
                <button onClick={() => toggleCompare(d)} aria-label={L('Comparar', 'Compare')} className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full shadow-card ${compareIds.has(d.id) ? 'bg-primary text-white' : 'bg-white text-ink'}`}>
                  <Compare size={16} stroke={2.2} />
                </button>
                <button onClick={() => doShare(`${d.year} ${d.make} ${d.model}`, d.slug)} aria-label={L('Compartir', 'Share')} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-card">
                  <Share2 size={16} stroke={2.2} className="text-ink" />
                </button>
                {heartBtn(d, 'h-10 w-10', 17)}
                <ReportButton type="vehicle" id={d.id} variant="icon" className="h-10 w-10 bg-white text-ink shadow-card hover:bg-white" />
              </div>
              {/* prev/next arrows + counter (CarGurus-style) when there are multiple photos */}
              {d.photos.length > 1 && (
                <>
                  <button onClick={() => setGi((i) => (i - 1 + d.photos.length) % d.photos.length)} aria-label={L('Anterior', 'Previous')} className="absolute left-3.5 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 shadow-card backdrop-blur">
                    <ChevronLeft size={18} stroke={2.6} className="text-ink" />
                  </button>
                  <button onClick={() => setGi((i) => (i + 1) % d.photos.length)} aria-label={L('Siguiente', 'Next')} className="absolute right-3.5 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 shadow-card backdrop-blur">
                    <ChevronRight size={18} stroke={2.6} className="text-ink" />
                  </button>
                </>
              )}
              {d.photos.length > 0 ? (
                <span className="absolute bottom-3 right-3.5 flex items-center gap-1 rounded-full bg-[rgba(30,27,46,.66)] px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur">
                  <Camera size={12} stroke={2.4} /> {gi + 1} / {d.photos.length}
                </span>
              ) : (
                <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-bold text-muted-2 shadow-card backdrop-blur">
                  <Camera size={13} stroke={2.2} /> {L('Fotos en camino — pídelas al vendedor', 'Photos coming — ask the seller')}
                </span>
              )}
              {d.photos.length > 1 && (
                <div className="no-scrollbar absolute bottom-3 left-3.5 flex max-w-[calc(100%-90px)] gap-2 overflow-x-auto">
                  {d.photos.map((ph, i) => (
                    <button key={i} onClick={() => setGi(i)} aria-label={`${L('Foto', 'Photo')} ${i + 1}`} className={`h-[46px] w-[46px] flex-none cursor-pointer rounded-[10px] border-2 bg-cover bg-center ${i === gi ? 'border-primary' : 'border-white'}`} style={{ backgroundImage: `url("${imgUrl(ph, ANCHO.icono)}")` }} />
                  ))}
                </div>
              )}
            </div>

            <div className="lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
              {/* main column */}
              <div className="pt-4 lg:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  {condPill(d.cond)}
                  {d.history.cleanTitle && cleanBadge()}
                  {d.bhph && bhphBadge()}
                </div>
                <div className="mt-2.5 text-[24px] font-extrabold tracking-[-.01em] text-ink">{d.year} {d.make} {d.model}</div>
                <div className="mt-1 flex items-baseline gap-2.5">
                  <span className="text-[27px] font-extrabold tracking-[-.02em] text-ink">{fmtAuPrice(d.price)}</span>
                  <span className="text-[13px] font-extrabold text-primary-dark">{moStr(d.price, d.down)}{L('/mes*', '/mo*')}</span>
                </div>
                {[d.city].filter(Boolean).length > 0 && <div className="mt-1 text-[12px] font-semibold text-muted">{d.city}</div>}

                {/* spec grid (2-col) */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    { Icon: Gauge, k: L('Millaje', 'Mileage'), v: fmtMiles(d.miles, es) },
                    { Icon: Gearbox, k: L('Transmisión', 'Transmission'), v: transLabel(d.trans) },
                    { Icon: GasStation, k: L('Combustible', 'Fuel'), v: fuelLabel(d.fuel) },
                    { Icon: Steering, k: L('Tracción', 'Drivetrain'), v: d.drivetrain || '—' },
                    { Icon: Bolt, k: 'MPG', v: d.mpg != null ? String(d.mpg) : '—' },
                    { Icon: Tag, k: L('Color', 'Color'), v: (es ? d.colorEs : d.colorEn) || d.colorEs || d.colorEn || '—' },
                  ].map((s) => (
                    <div key={s.k} className="flex items-center gap-2.5 rounded-tile bg-lilac-2 px-3 py-2.5">
                      <s.Icon size={17} stroke={2} className="flex-none text-primary-dark" />
                      <div className="min-w-0">
                        <div className="text-[8.5px] font-extrabold uppercase tracking-[.05em] text-muted-2">{s.k}</div>
                        <div className="truncate text-[12.5px] font-extrabold text-ink">{s.v}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* payment teaser — main column on mobile only */}
                <div className="mt-3 lg:hidden">{paymentTeaser}</div>

                {/* about + features */}
                {(d.descEs || d.descEn) && (
                  <div className="mt-5">
                    <div className="mb-1.5 text-[15px] font-extrabold text-ink">{L('Descripción', 'About')}</div>
                    <div className="text-[13.5px] font-medium leading-[1.6] text-ink-3">{L(d.descEs ?? d.descEn ?? '', d.descEn ?? d.descEs ?? '')}</div>
                  </div>
                )}
                {d.feats.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {d.feats.map((f, i) => (
                      <span key={i} className="flex items-center gap-1.5 rounded-field border border-hair bg-white px-3 py-2 text-[11px] font-bold text-ink-soft">
                        <Check size={13} stroke={2.8} className="text-green" /> {L(f.es, f.en || f.es)}
                      </span>
                    ))}
                  </div>
                )}

                {/* vehicle history */}
                <div className="mt-5">
                  <div className="mb-2 text-[15px] font-extrabold text-ink">{L('Historial del vehículo', 'Vehicle history')}</div>
                  <Card className="px-3.5">
                    <div className="divide-y divide-[rgba(30,27,46,.06)]">
                      {[
                        { k: L('Título limpio', 'Clean title'), ok: d.history.cleanTitle === true, v: d.history.cleanTitle ? L('Sí', 'Yes') : L('Revisar', 'Check') },
                        { k: L('Accidentes', 'Accidents'), ok: (d.history.accidents ?? 0) === 0, v: String(d.history.accidents ?? 0) },
                        { k: L('Dueños', 'Owners'), ok: true, v: d.history.owners != null ? String(d.history.owners) : '—' },
                        { k: L('Servicio', 'Service'), ok: d.history.serviced === true, v: d.history.serviced ? L('Al día', 'Up to date') : '—' },
                      ].map((row) => (
                        <div key={row.k} className="flex items-center justify-between py-2.5 text-[12.5px]">
                          <span className="flex items-center gap-2 font-semibold text-muted">
                            {row.ok ? <Check size={14} stroke={3} className="text-green" /> : <InfoCircle size={14} stroke={2.2} className="text-amber-ink" />} {row.k}
                          </span>
                          <span className="font-extrabold text-ink">{row.v}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setHistoryOpen(true)} className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-hair py-3 text-[12px] font-extrabold text-primary-dark">
                      <ShieldCheck size={14} stroke={2.2} /> {L('Ver reporte completo', 'View full report')}
                    </button>
                  </Card>
                </div>

                {/* BHPH info + dealer — mobile */}
                {bhphCard && <div className="mt-4">{bhphCard}</div>}
                {dealerCard && (
                  <div className="mt-5 lg:hidden">
                    <div className="mb-2 text-[15px] font-extrabold text-ink">{L('Vendido por', 'Sold by')}</div>
                    {dealerCard}
                  </div>
                )}

                {/* similar */}
                <div className="mt-5">
                  <div className="mb-2.5 text-[15px] font-extrabold text-ink">{L('Autos similares', 'Similar cars')}</div>
                  {similar == null ? (
                    <div className="py-4 text-center text-[12px] font-semibold text-muted-2">{L('Cargando…', 'Loading…')}</div>
                  ) : similar.length === 0 ? (
                    <div className="rounded-card-sm border border-dashed border-hair bg-white py-5 text-center text-[12px] font-semibold text-muted-2">{L('No hay autos similares por ahora.', 'No similar cars right now.')}</div>
                  ) : (
                    <div className="no-scrollbar -mx-3.5 flex gap-3 overflow-x-auto px-3.5 pb-1">
                      {similar.map((p) => (
                        <Card key={p.id} className="w-[168px] flex-none overflow-hidden" onClick={() => openDetail(p)}>
                          <div className="h-[92px]" style={tileBg(p.cond, p.photos[0])} />
                          <div className="p-2.5">
                            <div className="truncate text-[11.5px] font-extrabold text-ink">{p.year} {p.make} {p.model}</div>
                            <div className="mt-1 flex items-baseline justify-between gap-1">
                              <span className="text-[13.5px] font-extrabold text-ink">{fmtAuPrice(p.price)}</span>
                              <span className="text-[9.5px] font-bold text-primary-dark">{moStr(p.price, p.down)}{L('/mes', '/mo')}</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* desktop right rail */}
              <aside className="hidden lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-3.5">
                <Card className="p-4">
                  <div className="text-[22px] font-extrabold text-ink">{fmtAuPrice(d.price)}</div>
                  <div className="mt-0.5 text-[12px] font-extrabold text-primary-dark">{moStr(d.price, d.down)}{L('/mes*', '/mo*')}</div>
                  <div className="mt-1 truncate text-[11.5px] font-semibold text-muted">{d.year} {d.make} {d.model}</div>
                  <div className="mt-3.5">{detailCtas}</div>
                </Card>
                {paymentTeaser}
                {dealerCard}
              </aside>
            </div>

            {/* mobile sticky CTA bar */}
            <div className="fixed inset-x-0 bottom-[62px] z-40 border-t border-hair bg-white px-3.5 py-2.5 md:bottom-0 lg:hidden">
              <div className="mx-auto max-w-[720px]">{detailCtas}</div>
            </div>
          </div>
        )
      )}

      {/* ─────────────────────────── LIST VIEWS ─────────────────────────── */}
      {vSlug == null && !detailLoading && (
        <>
          {view === 'descubrir' && (
            <div>
              <div className="mb-3.5">
                <h1 className="text-[20px] font-extrabold tracking-[-.02em] text-ink lg:text-[26px]">{L('Autos cerca de ti', 'Cars near you')}</h1>
                <div className="mt-0.5 text-[12.5px] font-semibold text-muted">{L(`Inspeccionados y con historial en ${app.cityShort}`, `Inspected, with history in ${app.cityShort}`)}</div>
              </div>

              {/* search + filters */}
              <div className="mb-3 flex gap-2.5">
                <button onClick={() => setView('buscar')} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-btn border border-hair bg-white px-3.5 text-left shadow-card">
                  <Search size={16} stroke={2.2} className="flex-none text-muted-2" />
                  <span className="min-w-0 flex-1 truncate py-3 text-[13px] font-semibold text-muted-2">{L('Marca, modelo o palabra', 'Make, model or keyword')}</span>
                </button>
                <button onClick={() => setFiltersOpen(true)} aria-label={L('Filtros', 'Filters')} className="relative flex h-[46px] w-[46px] flex-none cursor-pointer items-center justify-center rounded-btn bg-primary shadow-cta-sm">
                  <Adjustments size={19} stroke={2.2} className="text-white" />
                  {filterCount > 0 && <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-app bg-amber px-1 text-[9px] font-extrabold text-amber-ink">{filterCount}</span>}
                </button>
              </div>

              {/* condition segmented (null = all) */}
              <div className="mb-3 flex gap-1 rounded-btn bg-lilac-2 p-1">
                {AU_CONDS.map((c) => (
                  <button key={c.id} onClick={() => setCond(cond === c.id ? null : c.id)} className={`min-h-[38px] flex-1 cursor-pointer rounded-[9px] px-1 text-[11.5px] font-extrabold transition-colors ${cond === c.id ? 'bg-white text-ink shadow-card' : 'text-muted'}`}>
                    {L(c.es, c.en)}
                  </button>
                ))}
              </div>

              {/* BHPH prominent toggle (the Latino hook) */}
              <button onClick={() => setBhph(!bhph)} className={`mb-4 flex w-full cursor-pointer items-center gap-3 rounded-card border-[1.5px] p-3 text-left transition-colors ${bhph ? 'border-amber bg-amber-bg' : 'border-hair bg-white'}`}>
                <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-tile ${bhph ? 'bg-amber' : 'bg-amber-bg'}`}><Coin size={20} stroke={2} className="text-amber-ink" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-extrabold text-ink">{L('Aquí pagas aquí', 'Buy-here pay-here')}</span>
                  <span className="block text-[10.5px] font-semibold text-ink-soft">{L('Sin verificación de crédito · acepta ITIN', 'No credit check · ITIN accepted')}</span>
                </span>
                <Switch on={bhph} onClick={() => setBhph(!bhph)} big label="BHPH" />
              </button>

              {/* financing banner */}
              <button onClick={() => openPrequal(null)} className="mb-4 flex w-full cursor-pointer items-center gap-3.5 rounded-card p-4 text-left shadow-band" style={{ background: 'linear-gradient(150deg,#6743E2,#8268FF)' }}>
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-tile bg-[rgba(255,255,255,.18)]"><CreditCard size={22} stroke={2} className="text-white" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-extrabold text-white">{L('¿Sin crédito? ¡No hay problema!', 'No credit? No problem!')}</span>
                  <span className="block text-[11px] font-semibold text-white/85">{L('Pre-califícate sin afectar tu crédito · sin SSN', 'Get pre-qualified with no credit impact · no SSN')}</span>
                </span>
                <ChevronRight size={18} stroke={2.6} className="flex-none text-white" />
              </button>

              {/* quick chips */}
              <div className="no-scrollbar -mx-3.5 mb-4 flex gap-2 overflow-x-auto px-3.5">
                <Chip onClick={() => setView('comparar')} className="flex items-center gap-1.5"><Compare size={14} stroke={2.2} className="text-primary-dark" /> {L('Comparar', 'Compare')}{compare.length > 0 && <span className="rounded-full bg-lilac px-1.5 text-[10px] font-extrabold text-primary-dark">{compare.length}</span>}</Chip>
                <Chip onClick={() => (user ? setView('guardados') : router.push('/entrar'))} className="flex items-center gap-1.5"><Heart size={14} stroke={2.2} className="text-pink-dark" /> {L('Guardados', 'Saved')}{savedIds.size > 0 && <span className="rounded-full bg-pink-bg px-1.5 text-[10px] font-extrabold text-pink-dark">{savedIds.size}</span>}</Chip>
                <Chip onClick={openTradein} className="flex items-center gap-1.5"><TradeIcon size={14} stroke={2.2} className="text-primary-dark" /> {L('Trade-in', 'Trade-in')}</Chip>
                <Chip onClick={openVender} className="flex items-center gap-1.5"><Tag size={14} stroke={2.2} className="text-primary-dark" /> {L('Vender', 'Sell')}</Chip>
                <Chip onClick={() => openCalc(results?.[0]?.price ?? 25000, results?.[0]?.down ?? null)} className="flex items-center gap-1.5"><Calculator size={14} stroke={2.2} className="text-primary-dark" /> {L('Calculadora', 'Calculator')}</Chip>
                <Chip onClick={() => setView('dealers')} className="flex items-center gap-1.5"><Car size={14} stroke={2.2} className="text-primary-dark" /> {L('Dealers', 'Dealers')}</Chip>
                <Chip onClick={() => setView('mapa')} className="flex items-center gap-1.5"><MapIcon size={14} stroke={2.2} className="text-primary-dark" /> {L('Mapa', 'Map')}</Chip>
              </div>

              {/* featured hero */}
              {feat && (
                <div className="mb-5 cursor-pointer overflow-hidden rounded-card shadow-card-lg transition-shadow hover:shadow-band" onClick={() => openDetail(feat)}>
                  <div className="relative h-[200px] md:h-[240px]" style={tileBg(feat.cond, feat.photos[0])}>
                    <span className="absolute left-3.5 top-3.5 flex items-center gap-1.5">
                      <span className="rounded-[9px] bg-ink px-3 py-1.5 text-[9.5px] font-extrabold uppercase tracking-[.05em] text-white">{L('Destacado', 'Featured')}</span>
                      {feat.bhph && bhphBadge()}
                    </span>
                    {heartBtn(feat, 'absolute right-3 top-3 h-[38px] w-[38px]', 17)}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(30,27,46,.85)] to-transparent px-4 pb-3.5 pt-9">
                      <div className="truncate text-[16px] font-extrabold text-white">{feat.year} {feat.make} {feat.model}</div>
                      <div className="mt-1 flex items-center gap-2.5 text-[11.5px] font-bold text-white/80">
                        <span>{fmtMiles(feat.miles, es)}</span>
                        {feat.trans && <span>· {transLabel(feat.trans)}</span>}
                        {feat.fuel && <span>· {fuelLabel(feat.fuel)}</span>}
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="text-[22px] font-extrabold tracking-[-.01em] text-white">{fmtAuPrice(feat.price)}</span>
                        <span className="text-[12px] font-extrabold text-white/90">{moStr(feat.price, feat.down)}{L('/mes*', '/mo*')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* marcas */}
              {!filtered && (
                <div className="mb-4">
                  <div className="mb-2.5 text-[14px] font-extrabold text-ink">{L('Marcas populares', 'Popular brands')}</div>
                  <div className="no-scrollbar -mx-3.5 flex gap-2.5 overflow-x-auto px-3.5">
                    {AU_MAKES.map((mk) => (
                      <button key={mk} onClick={() => { setFilters({ ...EMPTY_FILTERS, make: mk }); setView('buscar'); }} className="flex h-[64px] w-[84px] flex-none cursor-pointer flex-col items-center justify-center gap-1.5 rounded-tile border border-hair bg-white shadow-card">
                        <Car size={20} stroke={2} className="text-primary-dark" />
                        <span className="text-[10.5px] font-extrabold text-ink-soft">{mk}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* results header */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[15px] font-extrabold text-ink">{L('Recomendados', 'Recommended')}</span>
                <button onClick={cycleSort} className="flex cursor-pointer items-center gap-1 text-[12px] font-extrabold text-primary-dark">{sortLabels[sort]} <ChevronRight size={13} stroke={2.6} className="rotate-90" /></button>
              </div>

              {results == null ? (
                <SkeletonList count={6} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" />
              ) : results.length === 0 ? (
                <Card className="p-10 text-center">
                  {filtered ? (
                    <>
                      <div className="text-[15px] font-extrabold text-ink">{L('Sin resultados', 'No results')}</div>
                      <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Ajusta los filtros.', 'Adjust the filters.')}</div>
                      {(filterCount > 0 || cond) && (
                        <button onClick={() => { setFilters(EMPTY_FILTERS); setCond(null); setBhph(false); }} className="mt-3 cursor-pointer rounded-btn bg-lilac-2 px-4 py-2.5 text-[12px] font-extrabold text-primary-dark">{L('Limpiar filtros', 'Clear filters')}</button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-[15px] font-extrabold text-ink">{L(`Todavía no hay autos en ${app.cityShort}`, `No cars in ${app.cityShort} yet`)}</div>
                      <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Los dealers de tu zona pronto publicarán aquí.', 'Dealers in your area will publish here soon.')}</div>
                    </>
                  )}
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{listCards.map(cardV)}</div>
                  {hasMore && (
                    <button onClick={() => void loadMore()} disabled={loadingMore} className="mt-5 w-full cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3 text-[13px] font-extrabold text-primary-dark disabled:opacity-50">
                      {loadingMore ? L('Cargando…', 'Loading…') : L('Ver más autos', 'See more cars')}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─────────── BUSCAR ─────────── */}
          {view === 'buscar' && (
            <div>
              {viewHeader(L('Buscar autos', 'Search cars'), app.cityShort)}
              <div className="mb-3 flex gap-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-btn border border-hair bg-white px-3.5 shadow-card">
                  <Search size={16} stroke={2.2} className="flex-none text-muted-2" />
                  {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('Marca, modelo o palabra', 'Make, model or keyword')} className="min-w-0 flex-1 bg-transparent py-3 text-[13px] font-semibold text-ink outline-none placeholder:text-muted-2" />
                  {q && <button onClick={() => setQ('')} aria-label={L('Borrar', 'Clear')} className="flex-none cursor-pointer text-muted-2"><XIcon size={15} stroke={2.4} /></button>}
                </div>
                <button onClick={() => setFiltersOpen(true)} aria-label={L('Filtros', 'Filters')} className="relative flex h-[46px] w-[46px] flex-none cursor-pointer items-center justify-center rounded-btn bg-primary shadow-cta-sm">
                  <Adjustments size={19} stroke={2.2} className="text-white" />
                  {filterCount > 0 && <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-app bg-amber px-1 text-[9px] font-extrabold text-amber-ink">{filterCount}</span>}
                </button>
              </div>

              {/* type chips */}
              <div className="no-scrollbar -mx-3.5 mb-3 flex gap-2 overflow-x-auto px-3.5">
                <Chip active={filters.vtype == null} onClick={() => setFilters({ ...filters, vtype: null })}>{L('Todos', 'All')}</Chip>
                {AU_TYPES.map((t) => (
                  <Chip key={t.id} active={filters.vtype === t.id} onClick={() => setFilters({ ...filters, vtype: filters.vtype === t.id ? null : t.id })}>{L(t.es, t.en)}</Chip>
                ))}
              </div>

              {/* count + sort */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13.5px] font-extrabold text-ink">{results == null ? L('Buscando…', 'Searching…') : `${total} ${total === 1 ? L('resultado', 'result') : L('resultados', 'results')}`}</span>
                <button onClick={cycleSort} className="flex cursor-pointer items-center gap-1 text-[12px] font-extrabold text-primary-dark">{sortLabels[sort]} <ChevronRight size={13} stroke={2.6} className="rotate-90" /></button>
              </div>

              {results == null ? (
                <SkeletonList count={5} className="flex flex-col gap-3" />
              ) : results.length === 0 ? (
                <Card className="p-10 text-center">
                  <div className="text-[15px] font-extrabold text-ink">{L('Sin resultados', 'No results')}</div>
                  <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Ajusta los filtros o la búsqueda.', 'Adjust the filters or search.')}</div>
                  {(filterCount > 0 || cond) && <button onClick={() => { setFilters(EMPTY_FILTERS); setCond(null); setBhph(false); }} className="mt-3 cursor-pointer rounded-btn bg-lilac-2 px-4 py-2.5 text-[12px] font-extrabold text-primary-dark">{L('Limpiar filtros', 'Clear filters')}</button>}
                </Card>
              ) : (
                <>
                  <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">{results.map(rowH)}</div>
                  {hasMore && (
                    <button onClick={() => void loadMore()} disabled={loadingMore} className="mt-5 w-full cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3 text-[13px] font-extrabold text-primary-dark disabled:opacity-50">
                      {loadingMore ? L('Cargando…', 'Loading…') : L('Ver más autos', 'See more cars')}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─────────── MAPA ─────────── */}
          {view === 'mapa' && (
            <div>
              {viewHeader(L('Mapa de autos', 'Cars map'), app.cityShort)}
              {results == null ? (
                <Card className="p-10 text-center text-[12.5px] font-semibold text-muted">{L('Cargando autos…', 'Loading cars…')}</Card>
              ) : geoResults.length === 0 ? (
                <Card className="p-10 text-center">
                  <div className="text-[15px] font-extrabold text-ink">{L('Nada que mostrar en el mapa', 'Nothing to show on the map')}</div>
                  <div className="mt-1 text-[12.5px] font-semibold text-muted">{results.length === 0 ? L('No hay autos con estos filtros.', 'No cars match these filters.') : L('Estos autos no tienen ubicación exacta.', 'These cars have no exact location.')}</div>
                </Card>
              ) : (
                <div className="relative overflow-hidden rounded-card border border-hair shadow-card">
                  <div ref={mapDiv} className="h-[60vh] w-full lg:h-[68vh]" />
                  {mapSel && <div className="absolute inset-x-3 bottom-3">{rowH(mapSel)}</div>}
                </div>
              )}
            </div>
          )}

          {/* ─────────── COMPARAR ─────────── */}
          {view === 'comparar' && (
            <div>
              {viewHeader(L('Comparar autos', 'Compare cars'), `${compare.length}/3`)}
              {compare.length === 0 ? (
                <Card className="p-10 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-lilac-2"><Compare size={26} stroke={2} className="text-muted-faint" /></span>
                  <div className="mt-3 text-[15px] font-extrabold text-ink">{L('Nada que comparar', 'Nothing to compare')}</div>
                  <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Agrega autos con “Comparar” para verlos lado a lado.', 'Add cars with “Compare” to see them side by side.')}</div>
                  <PrimaryBtn className="mx-auto mt-4 max-w-[220px]" onClick={() => setView('descubrir')}>{L('Explorar', 'Browse')}</PrimaryBtn>
                </Card>
              ) : (
                <div className="no-scrollbar -mx-3.5 overflow-x-auto px-3.5">
                  <div className="flex gap-3" style={{ minWidth: compare.length * 172 }}>
                    {compare.map((c) => (
                      <div key={c.id} className="w-[164px] flex-none">
                        <Card className="overflow-hidden">
                          <div className="relative h-[96px]" style={tileBg(c.cond, c.photos[0])}>
                            <button onClick={() => toggleCompare(c)} aria-label={L('Quitar', 'Remove')} className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[rgba(255,255,255,.94)] shadow-card"><XIcon size={13} stroke={2.6} className="text-ink" /></button>
                          </div>
                          <div className="p-2.5">
                            <div className="truncate text-[11.5px] font-extrabold text-ink">{c.year} {c.make} {c.model}</div>
                            <div className="mt-0.5 text-[14px] font-extrabold text-ink">{fmtAuPrice(c.price)}</div>
                          </div>
                        </Card>
                        <div className="mt-2 rounded-card border border-hair bg-white text-[11px] shadow-card">
                          {[
                            [L('Enganche', 'Down'), c.down != null ? fmtAuPrice(c.down) : '—'],
                            [L('Mensual', 'Monthly'), `${moStr(c.price, c.down)}`],
                            [L('Millaje', 'Miles'), fmtMiles(c.miles, es)],
                            [L('Año', 'Year'), String(c.year)],
                            [L('Transmisión', 'Trans'), transLabel(c.trans)],
                            [L('Combustible', 'Fuel'), fuelLabel(c.fuel)],
                            ['MPG', c.mpg != null ? String(c.mpg) : '—'],
                          ].map(([k, v], i) => (
                            <div key={k} className={`flex flex-col gap-0.5 px-3 py-2 ${i > 0 ? 'border-t border-hair' : ''}`}>
                              <span className="text-[8.5px] font-extrabold uppercase tracking-[.04em] text-muted-2">{k}</span>
                              <span className="font-extrabold text-ink">{v}</span>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => openDetail(c)} className="mt-2 w-full cursor-pointer rounded-field bg-primary py-2.5 text-[11.5px] font-extrabold text-white shadow-cta-sm">{L('Ver', 'View')}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────── GUARDADOS ─────────── */}
          {view === 'guardados' && (
            <div>
              {viewHeader(L('Guardados', 'Saved'), user ? `${savedIds.size} ${savedIds.size === 1 ? L('auto guardado', 'saved car') : L('autos guardados', 'saved cars')}` : undefined)}
              {!user ? (
                <Card className="p-10 text-center">
                  <div className="text-[15px] font-extrabold text-ink">{L('Inicia sesión para ver tus guardados', 'Sign in to see your saved cars')}</div>
                  <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Tus favoritos te siguen en todos tus dispositivos.', 'Your favorites follow you across devices.')}</div>
                  <PrimaryBtn className="mx-auto mt-4 max-w-[240px]" onClick={() => router.push('/entrar/?entrar=1')}>{L('Iniciar sesión', 'Sign in')}</PrimaryBtn>
                </Card>
              ) : savedList == null ? (
                <SkeletonList count={3} className="flex flex-col gap-3" />
              ) : savedList.length === 0 ? (
                <Card className="p-10 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-lilac-2"><Heart size={26} stroke={2} className="text-muted-faint" /></span>
                  <div className="mt-3 text-[15px] font-extrabold text-ink">{L('Aún no guardas autos', 'No saved cars yet')}</div>
                  <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Toca el corazón en un auto para guardarlo.', 'Tap the heart on a car to save it.')}</div>
                  <PrimaryBtn className="mx-auto mt-4 max-w-[220px]" onClick={() => setView('descubrir')}>{L('Explorar', 'Browse')}</PrimaryBtn>
                </Card>
              ) : (
                <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">{savedList.map(rowH)}</div>
              )}
            </div>
          )}

          {/* ─────────── DEALERS ─────────── */}
          {view === 'dealers' && (
            <div>
              {viewHeader(L('Dealers y vendedores', 'Dealers & sellers'), L(`Los mejores de ${app.cityShort}`, `The best in ${app.cityShort}`))}
              <button onClick={() => router.push('/negocio/publicar')} className="mb-4 flex w-full items-center gap-3.5 rounded-card p-4 text-left shadow-band" style={{ background: 'linear-gradient(150deg,#6743E2,#8268FF)' }}>
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-tile bg-[rgba(255,255,255,.18)]"><Car size={22} stroke={2} className="text-white" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-extrabold text-white">{L('¿Eres dealer o vendes tu carro?', 'A dealer or selling your car?')}</span>
                  <span className="block text-[11px] font-semibold text-white/85">{L('Publica tu inventario y recibe clientes.', 'List your inventory and get customers.')}</span>
                </span>
                <span className="flex-none rounded-field bg-white px-3.5 py-2.5 text-[11.5px] font-extrabold text-primary-press">{L('Únete', 'Join')}</span>
              </button>
              {dealers == null ? (
                <SkeletonList count={4} className="flex flex-col gap-3" />
              ) : dealers.length === 0 ? (
                <Card className="p-10 text-center">
                  <div className="text-[15px] font-extrabold text-ink">{L(`Aún no hay dealers en ${app.cityShort}`, `No dealers in ${app.cityShort} yet`)}</div>
                  <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Sé el primero en unirte al directorio.', 'Be the first to join the directory.')}</div>
                </Card>
              ) : (
                <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
                  {dealers.map((a) => (
                    <Card key={a.id} className="flex items-center gap-3 p-3.5" onClick={() => router.push(`/negocios/?b=${encodeURIComponent(a.slug)}`)}>
                      {a.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgUrl(a.logo, ANCHO.icono)} alt="" className="h-12 w-12 flex-none rounded-tile object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-tile bg-lilac-2 text-[15px] font-extrabold text-primary-dark">{initialsOf(a.name)}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13.5px] font-extrabold text-ink">{a.name}</span>
                          {a.tier !== 'free' && <VerifiedBadge size={16} />}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] font-bold text-muted-2">
                          {a.rating != null && <span className="flex items-center gap-0.5"><StarFilled size={10} className="text-amber" />{a.rating.toFixed(1)} ({a.reviews})</span>}
                          <span>{a.inventory} {a.inventory === 1 ? L('auto', 'car') : L('autos', 'cars')}</span>
                          {a.city && <span>· {a.city}</span>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {a.bhph && <span className="rounded-full bg-amber-bg px-2 py-0.5 text-[9px] font-extrabold text-amber-ink">{L('Aquí pagas aquí', 'BHPH')}</span>}
                          {a.sellerType && <span className="rounded-full bg-lilac-2 px-2.5 py-0.5 text-[9.5px] font-extrabold text-primary-dark">{a.sellerType}</span>}
                        </div>
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

      {/* floating compare bar */}
      {compare.length > 0 && vSlug == null && view !== 'comparar' && (
        <div className="fixed inset-x-0 bottom-[62px] z-40 px-3.5 md:bottom-4 lg:bottom-6">
          <button onClick={() => setView('comparar')} className="mx-auto flex w-full max-w-[520px] cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-ink py-3.5 text-[13px] font-extrabold text-white shadow-modal">
            <Compare size={16} stroke={2.4} /> {L('Comparar autos', 'Compare cars')} ({compare.length})
          </button>
        </div>
      )}

      {/* ═══════════════════════════ OVERLAYS ═══════════════════════════ */}

      {/* FILTROS */}
      <Overlay open={filtersOpen} onClose={() => setFiltersOpen(false)} width={440}>
        <OverlayTitle title={L('Filtros', 'Filters')} onClose={() => setFiltersOpen(false)} />
        <div className="mb-2 text-[12px] font-extrabold text-ink">{L('Tipo de vehículo', 'Vehicle type')}</div>
        <div className="flex flex-wrap gap-2">
          <Chip active={filters.vtype == null} onClick={() => setFilters({ ...filters, vtype: null })}>{L('Todos', 'All')}</Chip>
          {AU_TYPES.map((t) => (<Chip key={t.id} active={filters.vtype === t.id} onClick={() => setFilters({ ...filters, vtype: filters.vtype === t.id ? null : t.id })}>{L(t.es, t.en)}</Chip>))}
        </div>
        <div className="mb-2 mt-4 text-[12px] font-extrabold text-ink">{L('Marca', 'Make')}</div>
        <div className="flex flex-wrap gap-2">
          <Chip active={filters.make == null} onClick={() => setFilters({ ...filters, make: null })}>{L('Todas', 'All')}</Chip>
          {AU_MAKES.map((mk) => (<Chip key={mk} active={filters.make === mk} onClick={() => setFilters({ ...filters, make: filters.make === mk ? null : mk })}>{mk}</Chip>))}
        </div>
        <div className="mb-2 mt-4 text-[12px] font-extrabold text-ink">{L('Precio', 'Price')}</div>
        <div className="flex flex-col gap-2">
          {PRICES.map((pr) => {
            const on = filters.min === pr.min && filters.max === pr.max;
            return (
              <button key={pr.es} onClick={() => setFilters({ ...filters, min: pr.min, max: pr.max })} className={`flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-field border-[1.5px] px-3 py-2.5 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                <span className={`flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-lilac-ring'}`}>{on && <span className="h-[9px] w-[9px] rounded-full bg-primary" />}</span>
                <span className="flex-1 text-[12.5px] font-bold text-ink">{L(pr.es, pr.en)}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input inputMode="numeric" value={filters.min ?? ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setFilters({ ...filters, min: v ? Number(v) : null }); }} placeholder={L('Mín $', 'Min $')} className="min-w-0 flex-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[12.5px] font-bold text-ink outline-none focus:border-primary placeholder:font-semibold placeholder:text-muted-2" />
          <span className="text-[12px] font-bold text-muted-2">—</span>
          <input inputMode="numeric" value={filters.max ?? ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setFilters({ ...filters, max: v ? Number(v) : null }); }} placeholder={L('Máx $', 'Max $')} className="min-w-0 flex-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[12.5px] font-bold text-ink outline-none focus:border-primary placeholder:font-semibold placeholder:text-muted-2" />
        </div>
        <div className="mb-2 mt-4 text-[12px] font-extrabold text-ink">{L('Año', 'Year')}</div>
        <div className="flex gap-2">
          {YEARS.map((y) => (
            <button key={String(y.v)} onClick={() => setFilters({ ...filters, yearMin: y.v })} className={`min-h-[40px] flex-1 cursor-pointer rounded-field text-[11.5px] font-extrabold ${filters.yearMin === y.v ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>{L(y.es, y.en)}</button>
          ))}
        </div>
        <div className="mb-2 mt-4 text-[12px] font-extrabold text-ink">{L('Millaje', 'Mileage')}</div>
        <div className="flex gap-2">
          {MILES.map((m) => (
            <button key={String(m.v)} onClick={() => setFilters({ ...filters, milesMax: m.v })} className={`min-h-[40px] flex-1 cursor-pointer rounded-field text-[11.5px] font-extrabold ${filters.milesMax === m.v ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>{L(m.es, m.en)}</button>
          ))}
        </div>
        <button onClick={() => setBhph(!bhph)} className={`mt-4 flex w-full cursor-pointer items-center gap-3 rounded-field border-[1.5px] p-3 text-left ${bhph ? 'border-amber bg-amber-bg' : 'border-lilac-line bg-white'}`}>
          <Coin size={18} stroke={2} className="flex-none text-amber-ink" />
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-extrabold text-ink">{L('Aquí pagas aquí', 'Buy-here pay-here')}</span>
            <span className="block text-[10px] font-semibold text-ink-soft">{L('Sin verificación de crédito', 'No credit check')}</span>
          </span>
          <Switch on={bhph} onClick={() => setBhph(!bhph)} label="BHPH" />
        </button>
        <div className="mt-4 flex items-center gap-2.5">
          <button onClick={() => { setFilters(EMPTY_FILTERS); setBhph(false); }} className="flex-none cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3 text-[12.5px] font-extrabold text-ink-2">{L('Limpiar', 'Reset')}</button>
          <PrimaryBtn className="flex-1" onClick={() => setFiltersOpen(false)}>{results == null ? L('Ver resultados', 'Show results') : `${L('Ver', 'Show')} ${total} ${total === 1 ? L('resultado', 'result') : L('resultados', 'results')}`}</PrimaryBtn>
        </div>
      </Overlay>

      {/* CALCULADORA */}
      <Overlay open={calc != null} onClose={() => setCalc(null)} width={440}>
        {calc && calcOut && (
          <>
            <OverlayTitle title={L('Calculadora de pago', 'Payment calculator')} onClose={() => setCalc(null)} />
            <div className="rounded-card p-5 text-center shadow-cta-sm" style={{ background: 'linear-gradient(135deg,#6D4DF6,#7B61FF)' }}>
              <div className="text-[10.5px] font-bold text-white/80">{L('Pago mensual estimado', 'Estimated monthly payment')}</div>
              <div className="mt-1 text-[36px] font-extrabold tracking-[-.02em] text-white">${Math.round(calcOut.monthly).toLocaleString()}</div>
              <div className="text-[10.5px] font-semibold text-white/80">{L('por', 'for')} {calc.months} {L('meses', 'months')} · APR {calc.apr.toFixed(1)}%</div>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12px] font-extrabold"><span className="text-ink">{L('Precio del auto', 'Car price')}</span><span className="text-primary-dark">${calc.price.toLocaleString()}</span></div>
                <input type="range" min={5000} max={80000} step={500} value={calc.price} onChange={(e) => setCalc({ ...calc, price: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12px] font-extrabold"><span className="text-ink">{L('Enganche', 'Down payment')}</span><span className="text-primary-dark">{calc.downPct}% · ${calcDown.toLocaleString()}</span></div>
                <input type="range" min={0} max={50} step={1} value={calc.downPct} onChange={(e) => setCalc({ ...calc, downPct: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12px] font-extrabold"><span className="text-ink">{L('Tasa (APR)', 'Rate (APR)')}</span><span className="text-primary-dark">{calc.apr.toFixed(1)}%</span></div>
                <input type="range" min={0} max={24} step={0.1} value={calc.apr} onChange={(e) => setCalc({ ...calc, apr: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
              <div>
                <div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Plazo', 'Term')}</div>
                <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
                  {TERMS.map((m) => (
                    <button key={m} onClick={() => setCalc({ ...calc, months: m })} className={`min-h-[40px] flex-none cursor-pointer rounded-field px-3 text-[11.5px] font-extrabold ${calc.months === m ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>{m} {L('meses', 'mo')}</button>
                  ))}
                </div>
              </div>
            </div>
            <Card className="mt-4 divide-y divide-[rgba(30,27,46,.06)] px-3.5">
              {[
                [L('Monto financiado', 'Amount financed'), calcOut.loan],
                [L('Interés total', 'Total interest'), calcOut.totalInterest],
                [L('Total a pagar', 'Total cost'), calcOut.totalCost],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between py-2.5 text-[12.5px]"><span className="font-semibold text-ink-2">{k}</span><span className="font-extrabold text-ink">${Math.round(v as number).toLocaleString()}</span></div>
              ))}
            </Card>
            <div className="mt-3 flex items-start gap-2 rounded-field bg-lilac-2 px-3 py-2.5">
              <InfoCircle size={15} stroke={2.2} className="mt-0.5 flex-none text-primary-dark" />
              <span className="text-[10.5px] font-semibold leading-snug text-ink-soft">{L('Estimado — no es una oferta de crédito. El dealer confirma tu tasa al pre-calificar.', 'Estimate — not a credit offer. The dealer confirms your rate when you pre-qualify.')}</span>
            </div>
            <PrimaryBtn className="mt-4" onClick={() => { setCalc(null); openPrequal(detail?.slug ?? null); }}>{L('Pre-calificar ahora', 'Get pre-qualified now')}</PrimaryBtn>
          </>
        )}
      </Overlay>

      {/* PRE-CALIFICACIÓN */}
      <Overlay open={prequal != null} onClose={() => setPrequal(null)} width={460} fullHeightSheet>
        {prequal && !prequal.done && (
          <>
            <OverlayTitle title={L('Pre-calificación', 'Pre-qualification')} onClose={() => setPrequal(null)} onBack={prequal.step > 0 ? () => setPrequal({ ...prequal, step: prequal.step - 1 }) : undefined} />
            <div className="mb-3 flex items-start gap-2 rounded-field bg-green-bg px-3 py-2.5">
              <ShieldCheck size={16} stroke={2.2} className="mt-0.5 flex-none text-green-dark" />
              <span className="text-[11px] font-bold leading-snug text-green-dark">{L('No afecta tu crédito · sin número social (ITIN OK)', "Doesn't affect your credit · no SSN (ITIN OK)")}</span>
            </div>
            {/* stepper */}
            <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
              {[L('Datos', 'Info'), L('Ingresos', 'Income'), L('Enganche', 'Down')].map((lbl, i) => {
                const on = i === prequal.step; const done = i < prequal.step;
                return (
                  <span key={lbl} className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${on ? 'bg-primary text-white' : done ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted-2'}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white ${on ? 'bg-[rgba(255,255,255,.25)]' : done ? 'bg-primary' : 'bg-muted-faint'}`}>{done ? '✓' : i + 1}</span>{lbl}
                  </span>
                );
              })}
            </div>

            {prequal.step === 0 && (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Nombre completo', 'Full name')} *</div>
                  <input value={prequal.name} onChange={(e) => setPrequal({ ...prequal, name: e.target.value })} placeholder={L('Tu nombre', 'Your name')} className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2" />
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Correo', 'Email')} *</div>
                  <input value={prequal.email} onChange={(e) => setPrequal({ ...prequal, email: e.target.value })} inputMode="email" placeholder="tu@correo.com" className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2" />
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Teléfono', 'Phone')}</div>
                  <input value={prequal.phone} onChange={(e) => setPrequal({ ...prequal, phone: e.target.value })} inputMode="tel" placeholder="(713) 555-0139" className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2" />
                </div>
              </div>
            )}

            {prequal.step === 1 && (
              <div className="flex flex-col gap-3.5">
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Ingreso mensual', 'Monthly income')} *</div>
                  <div className="flex flex-col gap-2">
                    {INCOME_OPTS.map((o) => {
                      const on = prequal.income === o.v;
                      return (
                        <button key={o.v} onClick={() => setPrequal({ ...prequal, income: o.v })} className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-field border-[1.5px] px-3 py-2.5 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                          <span className={`flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-lilac-ring'}`}>{on && <span className="h-[9px] w-[9px] rounded-full bg-primary" />}</span>
                          <span className="text-[12.5px] font-bold text-ink">{L(o.es, o.en)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Tipo de empleo', 'Employment type')} *</div>
                  <div className="flex gap-2">
                    {EMPLOY_OPTS.map((o) => (
                      <button key={o.id} onClick={() => setPrequal({ ...prequal, employ: o.id })} className={`min-h-[42px] flex-1 cursor-pointer rounded-field px-1 text-[11px] font-extrabold ${prequal.employ === o.id ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>{L(o.es, o.en)}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('¿Cómo está tu crédito?', 'How is your credit?')} *</div>
                  <div className="flex gap-2">
                    {CREDIT_OPTS.map((o) => (
                      <button key={o.id} onClick={() => setPrequal({ ...prequal, credit: o.id })} className={`min-h-[42px] flex-1 cursor-pointer rounded-field px-1 text-[11px] font-extrabold ${prequal.credit === o.id ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>{L(o.es, o.en)}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {prequal.step === 2 && (
              <div className="flex flex-col gap-3.5">
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Enganche disponible', 'Available down payment')}</div>
                  <div className="flex items-center gap-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary">
                    <span className="text-[15px] font-extrabold text-muted-2">$</span>
                    <input value={prequal.down} onChange={(e) => setPrequal({ ...prequal, down: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="2,000" className="min-w-0 flex-1 bg-transparent py-3 text-[15px] font-extrabold text-ink outline-none placeholder:font-semibold placeholder:text-muted-2" />
                  </div>
                </div>
                <button onClick={() => setPrequal({ ...prequal, consent: !prequal.consent })} className="flex cursor-pointer items-start gap-2.5 text-left">
                  <span className={`mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] border-[1.5px] ${prequal.consent ? 'border-primary bg-primary' : 'border-lilac-ring bg-white'}`}>{prequal.consent && <Check size={13} stroke={3.4} className="text-white" />}</span>
                  <span className="text-[11px] font-semibold leading-snug text-ink-soft">{L('Autorizo al dealer a contactarme para una pre-calificación suave. Entiendo que no afecta mi crédito.', 'I authorize the dealer to contact me for a soft pre-qualification. I understand it does not affect my credit.')}</span>
                </button>
              </div>
            )}

            <PrimaryBtn className="mt-4" disabled={!prequalCanNext || prequal.busy} onClick={() => void prequalNext()}>
              {prequal.busy ? L('Enviando…', 'Sending…') : prequal.step < 2 ? L('Continuar', 'Continue') : L('Ver mi resultado', 'See my result')}
            </PrimaryBtn>
          </>
        )}
        {prequal && prequal.done && prequal.result && (
          <div className="flex flex-col items-center px-1 py-4 text-center">
            <div className="w-full rounded-card p-6 text-center shadow-cta-sm" style={{ background: 'linear-gradient(140deg,#1E1B2E,#3A2E63)' }}>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(255,255,255,.12)]"><Check size={28} stroke={3} className="text-green" /></span>
              <div className="mt-3 text-[18px] font-extrabold text-white">{L('¡Estás pre-aprobado!', "You're pre-approved!")}</div>
              <div className="mt-3 text-[11px] font-bold uppercase tracking-[.05em] text-white/70">{L('Aprobado hasta', 'Approved up to')}</div>
              <div className="text-[38px] font-extrabold tracking-[-.02em] text-white">{fmtAuPrice(prequal.result.amount)}</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-tile bg-[rgba(255,255,255,.1)] px-2 py-2.5"><div className="text-[9px] font-bold uppercase text-white/60">APR</div><div className="text-[15px] font-extrabold text-white">{prequal.result.apr.toFixed(1)}%</div></div>
                <div className="rounded-tile bg-[rgba(255,255,255,.1)] px-2 py-2.5"><div className="text-[9px] font-bold uppercase text-white/60">{L('Mensual', 'Monthly')}</div><div className="text-[15px] font-extrabold text-white">${Math.round(prequal.result.monthly).toLocaleString()}<span className="text-[10px] font-bold text-white/70">{L('/mes', '/mo')}</span></div></div>
              </div>
            </div>
            <div className="mt-3 text-[10.5px] font-semibold leading-snug text-muted-2">{L('Estimado ilustrativo según tu información. El dealer confirmará los detalles.', 'Illustrative estimate based on your info. The dealer will confirm the details.')}</div>
            <PrimaryBtn className="mt-4" onClick={() => { setPrequal(null); if (vSlug) closeDetail(); setView('descubrir'); }}>{L('Ver autos', 'Browse cars')}</PrimaryBtn>
          </div>
        )}
      </Overlay>

      {/* PRUEBA DE MANEJO */}
      <Overlay open={testF != null} onClose={() => setTestF(null)} width={460} fullHeightSheet>
        {testF && d && !testF.done && (
          <>
            <OverlayTitle title={L('Prueba de manejo', 'Test drive')} onClose={() => setTestF(null)} />
            <div className="mb-3 truncate text-[12px] font-semibold text-muted">{d.year} {d.make} {d.model} · {fmtAuPrice(d.price)}</div>
            <div className="mb-2 text-[13px] font-extrabold text-ink">{L('Elige el día', 'Pick a day')}</div>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {tourDays.map((td, i) => {
                const on = testF.day === i;
                return (
                  <button key={i} onClick={() => setTestF({ ...testF, day: i })} className={`flex min-w-[52px] flex-none cursor-pointer flex-col items-center rounded-tile border-[1.5px] px-3 py-2 ${on ? 'border-primary bg-primary' : 'border-lilac-line bg-white'}`}>
                    <span className={`text-[9.5px] font-extrabold uppercase ${on ? 'text-white/80' : 'text-muted-2'}`}>{L(td.wdEs, td.wdEn)}</span>
                    <span className={`text-[16px] font-extrabold leading-tight ${on ? 'text-white' : 'text-ink'}`}>{td.num}</span>
                  </button>
                );
              })}
            </div>
            <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Horario', 'Time')}</div>
            <div className="grid grid-cols-3 gap-2">
              {AU_SLOTS.map((h, i) => {
                const on = testF.slot === i;
                return (
                  <button key={h} onClick={() => setTestF({ ...testF, slot: i })} className={`min-h-[42px] cursor-pointer rounded-field border-[1.5px] text-[11.5px] font-extrabold ${on ? 'border-primary bg-lilac-3 text-primary-dark' : 'border-lilac-line bg-white text-ink-soft'}`}>{fmt12h(h)}</button>
                );
              })}
            </div>
            <div className="mb-2 mt-4 text-[13px] font-extrabold text-ink">{L('Tus datos', 'Your info')}</div>
            <div className="flex flex-col gap-2.5">
              <input value={testF.name} onChange={(e) => setTestF({ ...testF, name: e.target.value })} placeholder={`${L('Nombre completo', 'Full name')} *`} className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2" />
              <input value={testF.phone} onChange={(e) => setTestF({ ...testF, phone: e.target.value })} inputMode="tel" placeholder={L('Teléfono (opcional)', 'Phone (optional)')} className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2" />
              <textarea value={testF.msg} onChange={(e) => setTestF({ ...testF, msg: e.target.value })} rows={2} maxLength={400} placeholder={L('Mensaje para el dealer (opcional)', 'Message for the dealer (optional)')} className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium text-ink outline-none focus:border-primary placeholder:text-muted-2" />
            </div>
            <PrimaryBtn className="mt-4" disabled={testF.busy || testF.slot < 0 || !testF.name.trim()} onClick={() => void confirmTest()}>
              {testF.busy ? L('Agendando…', 'Booking…') : testF.slot < 0 ? L('Elige un horario', 'Pick a time') : !testF.name.trim() ? L('Escribe tu nombre', 'Enter your name') : L('Confirmar prueba', 'Confirm test drive')}
            </PrimaryBtn>
          </>
        )}
        {testF && d && testF.done && (
          <div className="flex flex-col items-center px-2 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg"><Check size={28} stroke={3} className="text-green" /></span>
            <div className="mt-4 text-[19px] font-extrabold text-ink">{L('¡Prueba agendada!', 'Test drive booked!')}</div>
            <div className="mt-1.5 max-w-[300px] text-[12.5px] font-semibold leading-relaxed text-muted">{L('Le avisamos al dealer — te confirmará el horario.', 'We notified the dealer — they will confirm your time.')}</div>
            <Card className="mt-4 w-full max-w-[310px] divide-y divide-[rgba(30,27,46,.06)] px-3.5 text-left">
              <div className="flex items-center justify-between py-2.5 text-[12.5px]"><span className="font-semibold text-muted">{L('Auto', 'Car')}</span><span className="font-extrabold text-ink">{d.year} {d.make} {d.model}</span></div>
              <div className="flex items-center justify-between py-2.5 text-[12.5px]"><span className="font-semibold text-muted">{L('Cuándo', 'When')}</span><span className="font-extrabold text-ink">{testF.doneAt}</span></div>
              {d.bizName && <div className="flex items-center justify-between py-2.5 text-[12.5px]"><span className="font-semibold text-muted">{L('Dealer', 'Dealer')}</span><span className="font-extrabold text-ink">{d.bizName}</span></div>}
            </Card>
            <PrimaryBtn className="mt-5 max-w-[310px]" onClick={() => setTestF(null)}>{L('Listo', 'Done')}</PrimaryBtn>
          </div>
        )}
      </Overlay>

      {/* TRADE-IN */}
      <Overlay open={tradein != null} onClose={() => setTradein(null)} width={440}>
        {tradein && !tradein.result && (
          <>
            <OverlayTitle title={L('Valúa tu auto', 'Value your car')} onClose={() => setTradein(null)} />
            <div className="mb-3 text-[12px] font-semibold text-muted">{L('Trade-in en 1 minuto — sin compromiso.', 'Trade-in in 1 minute — no commitment.')}</div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Año', 'Year')}</div>
                  <input value={tradein.year} onChange={(e) => setTradein({ ...tradein, year: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })} inputMode="numeric" placeholder="2019" className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Millaje', 'Mileage')}</div>
                  <input value={tradein.miles} onChange={(e) => setTradein({ ...tradein, miles: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="60,000" className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2" />
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Marca', 'Make')}</div>
                <select value={tradein.make} onChange={(e) => setTradein({ ...tradein, make: e.target.value })} className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary">
                  {AU_MAKES.map((mk) => <option key={mk} value={mk}>{mk}</option>)}
                </select>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Modelo', 'Model')}</div>
                <input value={tradein.model} onChange={(e) => setTradein({ ...tradein, model: e.target.value })} placeholder="Corolla" className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2" />
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Condición', 'Condition')}</div>
                <div className="flex gap-2">
                  {TRADE_CONDS.map((c) => (
                    <button key={c.id} onClick={() => setTradein({ ...tradein, cond: c.id })} className={`min-h-[42px] flex-1 cursor-pointer rounded-field text-[11.5px] font-extrabold ${tradein.cond === c.id ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>{L(c.es, c.en)}</button>
                  ))}
                </div>
              </div>
            </div>
            <PrimaryBtn className="mt-4" disabled={!tradein.year} onClick={computeTradein}>{L('Ver mi estimado', 'See my estimate')}</PrimaryBtn>
          </>
        )}
        {tradein && tradein.result && (
          <div className="flex flex-col items-center px-1 py-2 text-center">
            <OverlayTitle title={L('Valor estimado de trade-in', 'Estimated trade-in value')} onClose={() => setTradein(null)} />
            <div className="w-full rounded-card p-6 text-center shadow-cta-sm" style={{ background: 'linear-gradient(140deg,#0E7A44,#1F9D57)' }}>
              <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-white/80">{L('Estimado para tu', 'Estimate for your')} {tradein.year} {tradein.make} {tradein.model}</div>
              <div className="mt-1 text-[34px] font-extrabold tracking-[-.02em] text-white">{fmtAuPrice(tradein.result[1])}</div>
              <div className="text-[12px] font-bold text-white/85">{fmtAuPrice(tradein.result[0])} – {fmtAuPrice(tradein.result[2])}</div>
            </div>
            <div className="mt-3 text-[11px] font-semibold leading-snug text-muted-2">{L('El dealer confirma el valor al inspeccionar el vehículo.', 'The dealer confirms the value when inspecting the vehicle.')}</div>
            <div className="mt-4 flex w-full gap-2.5">
              <button onClick={() => setTradein({ ...tradein, result: null })} className="flex-none cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3 text-[12.5px] font-extrabold text-ink-2">{L('Editar', 'Edit')}</button>
              <PrimaryBtn className="flex-1" onClick={() => { const mid = tradein.result![1]; setTradein(null); openCalc(results?.[0]?.price ?? 25000, mid); }}>{L('Aplicar a una compra', 'Apply to a purchase')}</PrimaryBtn>
            </div>
          </div>
        )}
      </Overlay>

      {/* VENDER MI CARRO */}
      <Overlay open={vender != null} onClose={() => setVender(null)} width={460} fullHeightSheet>
        {vender && (
          <>
            <OverlayTitle title={L('Vender mi carro', 'Sell my car')} onClose={() => setVender(null)} onBack={vender.step > 0 ? () => setVender({ ...vender, step: 0 }) : undefined} />
            <div className="mb-3 flex items-start gap-2 rounded-field bg-lilac-2 px-3 py-2.5">
              <InfoCircle size={15} stroke={2.2} className="mt-0.5 flex-none text-primary-dark" />
              <span className="text-[10.5px] font-semibold leading-snug text-ink-soft">{L('Publicar es gratis. Terminas tu anuncio en el panel de vendedor para que aparezca ante los compradores.', 'Listing is free. You finish your ad in the seller panel so buyers can see it.')}</span>
            </div>
            {vender.step === 0 ? (
              <div className="flex flex-col gap-3.5">
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Condición', 'Condition')}</div>
                  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
                    {AU_CONDS.map((c) => (<button key={c.id} onClick={() => setVender({ ...vender, cond: c.id })} className={`min-h-[40px] flex-none cursor-pointer rounded-field px-3 text-[11.5px] font-extrabold ${vender.cond === c.id ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>{L(c.es, c.en)}</button>))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Tipo', 'Type')}</div>
                  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
                    {AU_TYPES.map((t) => (<button key={t.id} onClick={() => setVender({ ...vender, vtype: t.id })} className={`min-h-[40px] flex-none cursor-pointer rounded-field px-3 text-[11.5px] font-extrabold ${vender.vtype === t.id ? 'bg-primary text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-soft'}`}>{L(t.es, t.en)}</button>))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Marca', 'Make')}</div>
                  <select value={vender.make} onChange={(e) => setVender({ ...vender, make: e.target.value })} className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary">
                    <option value="">{L('Selecciona', 'Select')}</option>
                    {AU_MAKES.map((mk) => <option key={mk} value={mk}>{mk}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Modelo', 'Model')}</div>
                  <input value={vender.model} onChange={(e) => setVender({ ...vender, model: e.target.value })} placeholder="Civic" className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2" />
                </div>
                <PrimaryBtn disabled={!vender.make || !vender.model.trim()} onClick={() => setVender({ ...vender, step: 1 })}>{L('Continuar', 'Continue')}</PrimaryBtn>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                <div className="flex gap-2.5">
                  <div className="min-w-0 flex-1"><div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Año', 'Year')}</div><input value={vender.year} onChange={(e) => setVender({ ...vender, year: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })} inputMode="numeric" placeholder="2019" className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2" /></div>
                  <div className="min-w-0 flex-1"><div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Millaje', 'Mileage')}</div><input value={vender.miles} onChange={(e) => setVender({ ...vender, miles: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="60,000" className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary placeholder:text-muted-2" /></div>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Precio', 'Price')}</div>
                  <div className="flex items-center gap-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary"><span className="text-[15px] font-extrabold text-muted-2">$</span><input value={vender.price} onChange={(e) => setVender({ ...vender, price: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="15,000" className="min-w-0 flex-1 bg-transparent py-3 text-[15px] font-extrabold text-ink outline-none placeholder:font-semibold placeholder:text-muted-2" /></div>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Descripción', 'About')}</div>
                  <textarea value={vender.desc} onChange={(e) => setVender({ ...vender, desc: e.target.value })} rows={3} maxLength={600} placeholder={L('Cuéntales a los compradores sobre tu auto…', 'Tell buyers about your car…')} className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium text-ink outline-none focus:border-primary placeholder:text-muted-2" />
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Fotos', 'Photos')}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {vender.photos.map((ph, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-tile bg-cover bg-center" style={{ backgroundImage: `url("${imgUrl(ph, ANCHO.tarjeta)}")` }}>
                        <button onClick={() => setVender({ ...vender, photos: vender.photos.filter((_, j) => j !== i) })} aria-label={L('Quitar', 'Remove')} className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[rgba(30,27,46,.6)]"><XIcon size={12} stroke={2.6} className="text-white" /></button>
                        {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-ink px-1.5 py-0.5 text-[8px] font-extrabold text-white">{L('Portada', 'Cover')}</span>}
                      </div>
                    ))}
                    {vender.photos.length < 12 && (
                      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-tile border-[1.5px] border-dashed border-lilac-ring bg-white text-muted-2">
                        <Camera size={20} stroke={2} /><span className="text-[9.5px] font-extrabold">{L('Agregar', 'Add')}</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onVenderPhotos(e.target.files)} />
                      </label>
                    )}
                  </div>
                </div>
                <PrimaryBtn disabled={!vender.year || !vender.price} onClick={() => { setVender(null); flash(L('Continúa tu anuncio en el panel', 'Continue your ad in the panel')); router.push('/negocio/publicar'); }}>{L('Publicar mi carro', 'Publish my car')}</PrimaryBtn>
              </div>
            )}
          </>
        )}
      </Overlay>

      {/* MENSAJE AL DEALER */}
      <Overlay open={contact != null} onClose={() => setContact(null)} width={440}>
        {contact && d && (
          <>
            <OverlayTitle title={L('Mensaje al dealer', 'Message dealer')} onClose={() => setContact(null)} />
            {d.bizName && (
              <div className="mb-3 flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3">
                {d.bizLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgUrl(d.bizLogo, ANCHO.icono)} alt="" className="h-10 w-10 flex-none rounded-tile object-cover" />
                ) : (
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-tile bg-lilac-2 text-[13px] font-extrabold text-primary-dark">{initialsOf(d.bizName)}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><span className="truncate text-[12.5px] font-extrabold text-ink">{d.bizName}</span>{d.bizTier && d.bizTier !== 'free' && <VerifiedBadge size={15} />}</div>
                  <div className="truncate text-[10.5px] font-bold text-muted-2">{d.year} {d.make} {d.model}</div>
                </div>
              </div>
            )}
            <textarea value={contact.msg} onChange={(e) => setContact({ ...contact, msg: e.target.value })} rows={4} maxLength={800} className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium leading-relaxed text-ink outline-none focus:border-primary" />
            <PrimaryBtn className="mt-3" disabled={contact.busy || !contact.msg.trim()} onClick={() => void sendContact()}>{contact.busy ? L('Enviando…', 'Sending…') : L('Enviar mensaje', 'Send message')}</PrimaryBtn>
          </>
        )}
      </Overlay>

      {/* REPORTE DE HISTORIAL */}
      <Overlay open={historyOpen} onClose={() => setHistoryOpen(false)} width={440}>
        {d && (
          <>
            <OverlayTitle title={L('Reporte de historial', 'History report')} onClose={() => setHistoryOpen(false)} />
            <div className="mb-3 text-[12px] font-semibold text-muted">{d.year} {d.make} {d.model}{d.vin && <span className="text-muted-2"> · VIN {d.vin}</span>}</div>
            <Card className="divide-y divide-[rgba(30,27,46,.06)] px-3.5">
              {[
                [L('Título limpio', 'Clean title'), d.history.cleanTitle ? L('Sí', 'Yes') : L('Revisar', 'Check')],
                [L('Sin daños reportados', 'No reported damage'), (d.history.accidents ?? 0) === 0 ? L('Sí', 'Yes') : `${d.history.accidents}`],
                [L('Dueños', 'Owners'), d.history.owners != null ? String(d.history.owners) : '—'],
                [L('Servicio', 'Service'), d.history.serviced ? L('Al día', 'Up to date') : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2.5 text-[12.5px]"><span className="font-semibold text-muted">{k}</span><span className="font-extrabold text-ink">{v}</span></div>
              ))}
            </Card>
            {d.history.report && d.history.report.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-[13px] font-extrabold text-ink">{L('Registros disponibles', 'Records available')}</div>
                <div className="relative ml-1.5 border-l-2 border-lilac-line pl-4">
                  {d.history.report.map((r, i) => (
                    <div key={i} className="relative pb-3.5 last:pb-0">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary" />
                      <div className="text-[12px] font-extrabold text-ink">{r.t}</div>
                      <div className="text-[11px] font-semibold text-muted">{r.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 flex items-start gap-2 rounded-field bg-lilac-2 px-3 py-2.5">
              <InfoCircle size={15} stroke={2.2} className="mt-0.5 flex-none text-primary-dark" />
              <span className="text-[10.5px] font-semibold leading-snug text-ink-soft">{L('El reporte completo (estilo Carfax) estará disponible con nuestro socio de historial. El dealer puede compartirlo a solicitud.', 'The full Carfax-style report will be available via our history partner. The dealer can share it on request.')}</span>
            </div>
          </>
        )}
      </Overlay>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-[86px] left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-ink px-4 py-3 text-[12.5px] font-bold text-white shadow-modal md:bottom-6">
          <Check size={14} stroke={3} className="text-green" />{toast}
        </div>
      )}
    </div>
  );
}

// ── striped category placeholder (design-system rule) unless a real photo exists ──
function tileBg(cond: AuCond, photo?: string | null): CSSProperties {
  return photo
    ? { background: `center/cover url("${photo}")` }
    : { background: `repeating-linear-gradient(135deg,${AU_TILE[cond][0]} 0 11px,${AU_TILE[cond][1]} 11px 22px)` };
}
