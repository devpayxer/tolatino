'use client';

// Estadísticas — the dedicated analytics tab (lives under "Cómo te encuentran").
// Benchmarked against Google Business Profile Insights / Yelp Business: a date-
// range selector (7/30/90 días), total interactions with a trend vs the previous
// period, a views time-series, the customer-actions breakdown (Guardados · Cómo
// llegar · Llamadas) each with its own trend + sparkline, reputation, and — for
// sellers — sales over the range. Everything is REAL for a signed-in business
// (business_metrics 0077/0078 for discovery, business_orders/reviews for the
// rest, owner-self excluded); demo mode shows a believable sample so the tab
// stays explorable. NO fabricated numbers for a real business (non-negotiable #8).
// 'search' (search-appearance) is still deferred — shown honestly as "pronto".

import { useEffect, useMemo, useState } from 'react';
import {
  IconEye as Eye, IconHeart as Heart, IconNavigation as Navigation, IconPhone as Phone,
  IconStar as Star, IconTrendingUp as TrendingUp, IconTrendingDown as TrendingDown,
  IconShoppingBag as ShoppingBag, IconActivity as Activity, IconSearch as Search,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { useBizAdmin } from '@/lib/bizAdmin';
import { fetchBusinessMetrics, tzDayKeys } from '@/lib/live';
import { activeMods, type PanelCtx } from '@/screens/negocio/tabs';

const card = 'rounded-card-sm border border-hair bg-white shadow-card';
const money = (n: number) => '$' + n.toFixed(2);
const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Metric = { day: string; kind: string; count: number };
type OrderLite = { total: number; status: string; created_at: string };
type ReviewLite = { replied: boolean; created_at: string };

// Deterministic demo metrics (no Math.random — stable across SSR/CSR): a gentle
// upward trend so the sample shows positive deltas. Only ever used in demo mode.
function demoMetrics(range: number): Metric[] {
  const rows: Metric[] = [];
  const base = new Date(); base.setHours(0, 0, 0, 0);
  const amp: Record<string, number> = { search: 58, view: 26, save: 4, direction: 3, call: 2 };
  const phase: Record<string, number> = { search: 0, view: 1, save: 2, direction: 3, call: 4 };
  for (let i = 0; i < range * 2; i++) {
    const d = new Date(base); d.setDate(d.getDate() - i); const dk = dayKey(d);
    const growth = 1 - i / (range * 4); // recent days slightly higher
    for (const k of ['search', 'view', 'save', 'direction', 'call']) {
      const c = Math.max(0, Math.round(amp[k] * growth * (0.62 + 0.38 * Math.abs(Math.sin((i + phase[k]) / 2)))));
      if (c > 0) rows.push({ day: dk, kind: k, count: c });
    }
  }
  return rows;
}

export function Estadisticas({ ctx }: { ctx: PanelCtx }) {
  const { L, es, go } = ctx;
  const admin = useBizAdmin();
  const real = admin.active;
  const persistable = !admin.demo && !!real;
  const am = activeMods(ctx);
  const sells = am.menu || am.services || am.products || am.rental || am.events;

  const [range, setRange] = useState<7 | 30 | 90>(7);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [reviews, setReviews] = useState<ReviewLite[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let cancelled = false;
    if (!persistable || !real || !supabase) {
      if (admin.demo) { setMetrics(demoMetrics(range)); setOrders([]); setReviews([]); }
      else { setMetrics([]); setOrders([]); setReviews([]); }
      return;
    }
    (async () => {
      const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (range * 2 - 1));
      const [mtr, ord, rev] = await Promise.all([
        fetchBusinessMetrics(real.slug, range * 2),
        sells
          ? supabase!.from('business_orders').select('total,status,created_at').eq('business_id', real.id).gte('created_at', since.toISOString()).limit(1000)
          : Promise.resolve({ data: [] as unknown[] }),
        supabase!.from('reviews').select('replied_at,created_at').eq('business_id', real.id).order('created_at', { ascending: false }).limit(500),
      ]);
      if (cancelled) return;
      setMetrics(mtr as Metric[]);
      setOrders(((ord as { data?: Record<string, unknown>[] }).data ?? []).map((r) => ({ total: Number(r.total ?? 0), status: String(r.status ?? 'new'), created_at: String(r.created_at ?? '') })));
      setReviews(((rev as { data?: Record<string, unknown>[] }).data ?? []).map((r) => ({ replied: r.replied_at != null, created_at: String(r.created_at ?? '') })));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, persistable, admin.demo, range, sells]);

  // ── window keys in the BUSINESS timezone (0079) so the bars line up exactly
  //    with the DB's biz-local day buckets — current window + previous equal window ──
  const tz = real?.timezone ?? 'America/Chicago';
  const { curKeys, cutoff } = useMemo(() => {
    const keys = tzDayKeys(tz, range);
    return { curKeys: keys, cutoff: keys[0] };
  }, [tz, range]);
  // bucket a timestamp by the business-local day (matches curKeys / the DB rollup)
  const dkTz = (iso: string) => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)); } catch { return dayKey(new Date(iso)); } };

  // metrics rolled up by kind → day
  const byKindDay = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const r of metrics) { const dk = r.day.slice(0, 10); (m[r.kind] ||= {})[dk] = (m[r.kind][dk] ?? 0) + r.count; }
    return m;
  }, [metrics]);

  const seriesOf = (kind: string) => curKeys.map((dk) => byKindDay[kind]?.[dk] ?? 0);
  const curSum = (kind: string) => seriesOf(kind).reduce((a, b) => a + b, 0);
  const prevSum = (kind: string) => { const map = byKindDay[kind] ?? {}; let s = 0; for (const dk in map) if (dk < cutoff) s += map[dk]; return s; };

  // interactions = every discovery kind combined
  const KINDS = ['view', 'save', 'direction', 'call'];
  const interSeries = curKeys.map((dk) => KINDS.reduce((s, k) => s + (byKindDay[k]?.[dk] ?? 0), 0));
  const interCur = interSeries.reduce((a, b) => a + b, 0);
  const interPrev = KINDS.reduce((s, k) => s + prevSum(k), 0);

  // sales over the range (sellers, real)
  const revByDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of orders) { if (o.status === 'cancelled') continue; const dk = dkTz(o.created_at); m[dk] = (m[dk] ?? 0) + o.total; }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, tz]);
  const ordCountByDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of orders) { if (o.status === 'cancelled') continue; const dk = dkTz(o.created_at); m[dk] = (m[dk] ?? 0) + 1; }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, tz]);
  const revSeries = curKeys.map((dk) => revByDay[dk] ?? 0);
  const revCur = revSeries.reduce((a, b) => a + b, 0);
  const revPrev = (() => { let s = 0; for (const dk in revByDay) if (dk < cutoff) s += revByDay[dk]; return s; })();
  const ordCur = curKeys.reduce((s, dk) => s + (ordCountByDay[dk] ?? 0), 0);

  // reputation (real)
  const unreplied = reviews.filter((r) => !r.replied).length;
  const newReviews = reviews.filter((r) => dkTz(r.created_at) >= cutoff).length;
  const rating = real ? ((real.reviews_count ?? 0) > 0 ? Number(real.rating).toFixed(1) : '—') : (admin.demo ? '4.8' : '—');
  const totalReviews = real ? (real.reviews_count ?? 0) : (admin.demo ? 128 : 0);

  const delta = (cur: number, prev: number): number | null => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
  const rangeLabel = L(`${range} días`, `${range} days`);

  // ── small UI pieces ─────────────────────────────────────────────────────────
  const Trend = ({ d }: { d: number | null }) => {
    if (d == null) return <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-muted-2">{L('nuevo', 'new')}</span>;
    if (d === 0) return <span className="text-[10px] font-extrabold text-muted-2">0%</span>;
    const up = d > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold ${up ? 'text-green-dark' : 'text-pink-dark'}`}>
        {up ? <TrendingUp size={11} stroke={2.6} /> : <TrendingDown size={11} stroke={2.6} />}{Math.abs(d)}%
      </span>
    );
  };
  const Area = ({ data, color = '#7B61FF' }: { data: number[]; color?: string }) => {
    const w = 320, h = 90, n = data.length, max = Math.max(...data, 1);
    const pts = data.map((v, i) => [n === 1 ? w / 2 : (i * (w - 16)) / (n - 1) + 8, 82 - (v / max) * 70] as const);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const id = 'ar' + color.replace('#', '');
    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block h-[84px] w-full">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".22" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={`${line} L${pts[n - 1][0].toFixed(1)},90 L${pts[0][0].toFixed(1)},90 Z`} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };
  const Spark = ({ data, color }: { data: number[]; color: string }) => {
    const w = 96, h = 26, n = data.length, max = Math.max(...data, 1);
    const pts = data.map((v, i) => [n === 1 ? w / 2 : (i * w) / (n - 1), 23 - (v / max) * 20] as const);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    return <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block h-[24px] w-full"><path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" /></svg>;
  };
  const Sec = ({ title }: { title: string }) => <h2 className="mt-1 px-0.5 text-[14px] font-extrabold tracking-[-.01em] text-ink">{title}</h2>;

  type Metp = { icon: typeof Eye; label: string; kind: string; color: string; bg: string };
  // Alcance (impressions — top of funnel): search appearances + page views.
  const reach: Metp[] = [
    { icon: Search, label: L('Búsquedas', 'Searches'), kind: 'search', color: '#5B6BE1', bg: 'bg-blue-bg' },
    { icon: Eye, label: L('Vistas', 'Views'), kind: 'view', color: '#7B61FF', bg: 'bg-lilac' },
  ];
  // Acciones del cliente (what they DO after finding you).
  const acts: Metp[] = [
    { icon: Heart, label: L('Guardados', 'Saves'), kind: 'save', color: '#E14E8A', bg: 'bg-pink-bg' },
    { icon: Navigation, label: L('Cómo llegar', 'Directions'), kind: 'direction', color: '#C77B2B', bg: 'bg-amber-bg' },
    { icon: Phone, label: L('Llamadas', 'Calls'), kind: 'call', color: '#1F9D57', bg: 'bg-green-bg' },
  ];
  const MetCard = ({ a }: { a: Metp }) => {
    const cur = curSum(a.kind); const prev = prevSum(a.kind); const s = seriesOf(a.kind);
    return (
      <div className={`${card} p-3.5`}>
        <div className="flex items-center justify-between">
          <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${a.bg}`}><a.icon size={15} stroke={2.3} style={{ color: a.color }} /></span>
          <Trend d={delta(cur, prev)} />
        </div>
        <div className="mt-2 text-[22px] font-extrabold tracking-[-.02em] text-ink">{cur.toLocaleString()}</div>
        <div className="text-[10.5px] font-bold text-muted-2">{a.label}</div>
        {cur > 0 && <div className="mt-1.5"><Spark data={s} color={a.color} /></div>}
      </div>
    );
  };

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-3.5">
      {/* range selector */}
      <div className="flex items-center gap-1.5">
        {([7, 30, 90] as const).map((r) => (
          <button key={r} onClick={() => setRange(r)} className={`cursor-pointer rounded-full px-3.5 py-2 text-[11.5px] font-extrabold ${range === r ? 'bg-primary text-white shadow-cta-sm' : 'bg-white text-ink-soft shadow-card'}`}>
            {L(`${r} días`, `${r} days`)}
          </button>
        ))}
        <span className="ml-auto hidden text-[10.5px] font-bold text-muted-2 sm:block">{mounted ? L('vs. periodo anterior', 'vs. previous period') : ''}</span>
      </div>

      {/* interactions hero */}
      <div className={`${card} p-4`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-muted-2"><Activity size={13} stroke={2.4} className="text-primary-dark" />{L('Interacciones totales', 'Total interactions')} · {rangeLabel}</div>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-[30px] font-extrabold leading-none tracking-[-.03em] text-ink">{interCur.toLocaleString()}</span>
              <span className="mb-0.5"><Trend d={delta(interCur, interPrev)} /></span>
            </div>
          </div>
          <span className="rounded-full bg-lilac px-2.5 py-1 text-[10px] font-extrabold text-primary-dark">{L('vistas + acciones', 'views + actions')}</span>
        </div>
        {interCur > 0 ? (
          <div className="mt-3"><Area data={interSeries} /></div>
        ) : (
          <div className="mt-2 rounded-field bg-app px-3 py-4 text-center text-[11.5px] font-semibold text-muted">{L('Aún sin interacciones en este periodo. Comparte tu página para que te descubran.', 'No interactions yet in this period. Share your page so people discover you.')}</div>
        )}
      </div>

      {/* how they find you — reach (impressions) then customer actions */}
      <Sec title={L('Cómo te encuentran', 'How they find you')} />
      <div className="px-0.5 text-[10px] font-bold uppercase tracking-[.05em] text-muted-2">{L('Alcance', 'Reach')}</div>
      <div className="grid grid-cols-2 gap-2.5">
        {reach.map((a) => <MetCard key={a.kind} a={a} />)}
      </div>
      <div className="px-0.5 text-[10px] font-bold uppercase tracking-[.05em] text-muted-2">{L('Acciones del cliente', 'Customer actions')}</div>
      <div className="grid grid-cols-3 gap-2.5">
        {acts.map((a) => <MetCard key={a.kind} a={a} />)}
      </div>
      <div className="flex items-center gap-2 rounded-field bg-app px-3 py-2.5">
        <Search size={14} stroke={2.3} className="flex-none text-muted-2" />
        <span className="text-[10.5px] font-semibold text-muted">{L('Búsquedas = veces que apareciste en resultados. Tus propias visitas no cuentan; acciones repetidas en la misma sesión no se duplican.', 'Searches = times you appeared in results. Your own visits don’t count; repeat actions in one session aren’t double-counted.')}</span>
      </div>

      {/* reputation */}
      <Sec title={L('Reputación', 'Reputation')} />
      <div className={`${card} flex items-stretch divide-x divide-hair`}>
        <div className="flex-1 p-3.5 text-center">
          <div className="flex items-center justify-center gap-1 text-[22px] font-extrabold tracking-[-.02em] text-ink">{rating}<Star size={15} className="fill-amber text-amber" stroke={0} /></div>
          <div className="mt-0.5 text-[10px] font-bold text-muted-2">{L('Calificación', 'Rating')}</div>
        </div>
        <div className="flex-1 p-3.5 text-center">
          <div className="text-[22px] font-extrabold tracking-[-.02em] text-ink">{totalReviews.toLocaleString()}</div>
          <div className="mt-0.5 text-[10px] font-bold text-muted-2">{L('Reseñas', 'Reviews')}</div>
        </div>
        <div className="flex-1 p-3.5 text-center">
          <div className="text-[22px] font-extrabold tracking-[-.02em] text-ink">{newReviews}</div>
          <div className="mt-0.5 text-[10px] font-bold text-muted-2">{L('En el periodo', 'This period')}</div>
        </div>
        <button onClick={() => go('reviews')} className={`flex-1 cursor-pointer p-3.5 text-center ${unreplied > 0 ? '' : 'opacity-90'}`}>
          <div className={`text-[22px] font-extrabold tracking-[-.02em] ${unreplied > 0 ? 'text-pink-dark' : 'text-ink'}`}>{unreplied}</div>
          <div className="mt-0.5 text-[10px] font-bold text-muted-2">{L('Sin responder', 'Unanswered')}</div>
        </button>
      </div>

      {/* sales (sellers) */}
      {sells && (
        <>
          <Sec title={L('Ventas', 'Sales')} />
          <div className={`${card} p-4`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-muted-2"><ShoppingBag size={13} stroke={2.4} className="text-green-dark" />{L('Ingresos', 'Revenue')} · {rangeLabel}</div>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-[26px] font-extrabold leading-none tracking-[-.03em] text-ink">{money(revCur)}</span>
                  <span className="mb-0.5"><Trend d={delta(revCur, revPrev)} /></span>
                </div>
                <div className="mt-1 text-[10.5px] font-bold text-muted-2">{ordCur > 0 ? L(`${ordCur} ${ordCur === 1 ? 'pedido' : 'pedidos'}`, `${ordCur} order${ordCur === 1 ? '' : 's'}`) : L('Aún sin pedidos', 'No orders yet')}</div>
              </div>
              <button onClick={() => go('orders')} className="cursor-pointer rounded-[10px] bg-lilac px-3 py-2 text-[10.5px] font-extrabold text-primary-dark">{L('Ver pedidos', 'View orders')}</button>
            </div>
            {revCur > 0 && <div className="mt-3"><Area data={revSeries} color="#1F9D57" /></div>}
          </div>
        </>
      )}

      <div className="mt-1 mb-2 px-0.5 text-[9.5px] font-semibold text-muted-2">{L('Datos reales de tu listado · cada vista/acción cuenta (sin las tuyas) · comparado con el periodo inmediatamente anterior.', 'Real listing data · every view/action counts (excluding your own) · compared to the immediately preceding period.')}</div>
    </div>
  );
}
