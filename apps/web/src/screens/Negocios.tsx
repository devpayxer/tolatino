'use client';

// Negocios (`/negocios`) — Yelp-style directory (Handoff v2).
// Desktop: sticky filter rail + results grid + map placeholder.
// Mobile: swipeable category chips + "Filtros" bottom sheet.
// Card variant A ("Lista") — the prototype default.

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Heart, Map as MapIcon, MapPin, Phone, SlidersHorizontal, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { Avatar, Card, Overlay, OverlayTitle, PrimaryBtn, VerifiedBadge } from '@/components/ui';
import { SearchChip } from '@/components/AppHeader';
import { FEATURES_BY_CAT, FEATURES_COMMON, SUBCATS, bizTile, type Business } from '@/data/fixtures';
import { useLiveData } from '@/lib/live';
import { AVATAR_PALETTE, CAT, CAT_KEYS, tile, type CatKey } from '@/lib/tiles';
import { BizDetail } from '@/screens/BizDetail';

const DIST_MIN = 5;
const DIST_MAX = 50;
const DIST_DEFAULT = 15;
const PAGE_SIZE = 6;

// es → en lookup for subcategory labels (filter stores the canonical es value).
const SUB_EN: Record<string, string> = {};
for (const arr of Object.values(SUBCATS)) for (const [es, en] of arr) SUB_EN[es] = en;

// es → en lookup for feature labels (common + every category's set).
const FEAT_EN: Record<string, string> = {};
for (const [es, en] of FEATURES_COMMON) FEAT_EN[es] = en;
for (const arr of Object.values(FEATURES_BY_CAT)) for (const [es, en] of arr) FEAT_EN[es] = en;

// Canonical labels of the universal ("Sugeridos") features — kept when the user
// switches category (category-specific picks are dropped, they wouldn't match).
const COMMON_SET = new Set(FEATURES_COMMON.map(([es]) => es));

// How many category features show before "Ver todas".
const FEAT_PREVIEW = 8;

type Filters = {
  cat: CatKey | 'all';
  subCat: string | null;
  price: string | null;
  rating: string | null;
  maxDist: number;
  openNow: boolean;
  features: string[]; // canonical (es) feature labels — business must offer all
};

const DEFAULT_FILTERS: Filters = { cat: 'all', subCat: null, price: null, rating: null, maxDist: DIST_DEFAULT, openNow: false, features: [] };

export function NegociosScreen() {
  const { L } = useLang();
  const app = useApp();
  const { businesses: BUSINESSES } = useLiveData();
  const [f, setF] = useState<Filters>(DEFAULT_FILTERS);
  const [catOpen, setCatOpen] = useState<CatKey | null>(null);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [detailBiz, setDetailBiz] = useState<Business | null>(null);
  const [openFilter, setOpenFilter] = useState<null | 'dist' | 'rating' | 'price'>(null);
  const [showAllFeat, setShowAllFeat] = useState(false);

  const patch = (p: Partial<Filters>) => {
    setF((cur) => ({ ...cur, ...p }));
    setPage(1);
  };

  // Toggle a feature on/off (works for both "Sugeridos" and category features).
  const toggleFeature = (es: string) =>
    patch({ features: f.features.includes(es) ? f.features.filter((x) => x !== es) : [...f.features, es] });

  const sl = app.search.trim().toLowerCase();
  const results = useMemo(() => {
    let list = BUSINESSES.slice();
    if (f.cat !== 'all') list = list.filter((b) => b.cat === f.cat);
    if (f.subCat) list = list.filter((b) => (b.subcats ?? []).includes(f.subCat as string));
    if (f.price) list = list.filter((b) => b.price === f.price);
    if (f.rating) list = list.filter((b) => parseFloat(b.rating) >= parseFloat(f.rating!));
    if (f.openNow) list = list.filter((b) => b.open);
    if (f.features.length) list = list.filter((b) => f.features.every((x) => (b.features ?? []).includes(x)));
    // distance always applies; keep businesses with unknown distance ("— mi")
    list = list.filter((b) => {
      const d = parseFloat(b.dist);
      return Number.isNaN(d) || d <= f.maxDist;
    });
    if (sl) {
      list = list.filter((b) => {
        const subs = (b.subcats ?? []).map((s) => `${s} ${SUB_EN[s] ?? ''}`).join(' ');
        return `${b.name} ${CAT[b.cat].es} ${CAT[b.cat].en} ${b.specEs} ${b.specEn} ${subs}`.toLowerCase().includes(sl);
      });
    }
    // Verified businesses ALWAYS rank first (a paid/earned placement). Array.sort
    // is stable, so the backend's relevance order is kept inside each tier.
    list = list.slice().sort((a, b) => (a.verified ? 0 : 1) - (b.verified ? 0 : 1));
    return list;
  }, [f, sl, BUSINESSES]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageResults = results.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  const counts = useMemo(() => {
    const m: Partial<Record<CatKey, number>> = {};
    BUSINESSES.forEach((b) => (m[b.cat] = (m[b.cat] ?? 0) + 1));
    return m;
  }, [BUSINESSES]);

  // Total active filters (drives the "Filtros" badge and the clear-all link).
  const activeCount =
    (sl ? 1 : 0) +
    (f.cat !== 'all' ? 1 : 0) +
    (f.subCat ? 1 : 0) +
    (f.price ? 1 : 0) +
    (f.rating ? 1 : 0) +
    (f.openNow ? 1 : 0) +
    f.features.length +
    (f.maxDist !== DIST_DEFAULT ? 1 : 0);

  // Applied-chip row shows ONLY what isn't already visible elsewhere: the search
  // term and the picked subcategory. Distance/rating/price/open live on their
  // pills (which highlight + show the value); the category shows on its chip.
  const appliedChips: { label: string; onRemove: () => void }[] = [];
  if (sl) appliedChips.push({ label: `“${app.search}”`, onRemove: () => app.setSearch('') });
  if (f.subCat) appliedChips.push({ label: L(f.subCat, SUB_EN[f.subCat] ?? f.subCat), onRemove: () => patch({ subCat: null }) });
  for (const ft of f.features) appliedChips.push({ label: L(ft, FEAT_EN[ft] ?? ft), onRemove: () => toggleFeature(ft) });

  const clearAll = () => {
    setF(DEFAULT_FILTERS);
    setCatOpen(null);
    setShowAllFeat(false);
    app.setSearch('');
    setPage(1);
  };

  const seg = (on: boolean) =>
    `flex-1 cursor-pointer rounded-[9px] border-[1.5px] py-2 text-center text-[12.5px] font-extrabold ${
      on ? 'border-primary bg-lilac-3 text-ink' : 'border-[#ECEAF4] bg-white text-ink-soft'
    }`;

  if (detailBiz !== null) {
    return <BizDetail b={detailBiz} all={BUSINESSES} onClose={() => setDetailBiz(null)} onOpenOther={(biz) => setDetailBiz(biz)} />;
  }

  // Feature pill (shared by "Sugeridos" and the per-category "Características").
  const featChip = ([es, en]: [string, string]) => {
    const on = f.features.includes(es);
    return (
      <button
        key={es}
        onClick={() => toggleFeature(es)}
        className={`cursor-pointer rounded-full px-[11px] py-1.5 text-[11.5px] ${
          on ? 'bg-primary font-extrabold text-white' : 'bg-lilac-2 font-bold text-ink-3'
        }`}
      >
        {L(es, en)}
      </button>
    );
  };

  // Category-specific features (the dynamic half). Only when a real category is
  // picked — mirrors Yelp, where "Features" change with the chosen category.
  const catFeatures = f.cat !== 'all' ? FEATURES_BY_CAT[f.cat] ?? [] : [];
  const shownFeatures = showAllFeat ? catFeatures : catFeatures.slice(0, FEAT_PREVIEW);

  const secLabel = 'mb-1.5 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted';

  const filterPanel = (
    <>
      {/* Sugeridos — universal quick features (apply to every category) */}
      <div className={secLabel}>{L('Sugeridos', 'Suggested')}</div>
      <div className="mb-4 flex flex-wrap gap-1.5">{FEATURES_COMMON.map(featChip)}</div>

      {/* category accordion */}
      <div className={`${secLabel} mt-1`}>{L('Categoría', 'Category')}</div>
      <button
        onClick={() => {
          patch({ cat: 'all', subCat: null, features: f.features.filter((x) => COMMON_SET.has(x)) });
          setCatOpen(null);
          setShowAllFeat(false);
        }}
        className={`flex w-full cursor-pointer items-center justify-between rounded-[10px] px-[11px] py-[9px] text-left text-[13px] ${
          f.cat === 'all' ? 'bg-lilac-3 font-extrabold text-ink' : 'font-bold text-ink-soft'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {L('Todos', 'All')}
        </span>
        <span className="text-[11px] font-bold text-muted-faint">{BUSINESSES.length}</span>
      </button>
      {CAT_KEYS.map((k) => {
        const open = catOpen === k;
        const active = f.cat === k;
        const subs = SUBCATS[k] ?? [];
        return (
          <div key={k}>
            <button
              onClick={() => {
                setCatOpen(open ? null : k);
                setShowAllFeat(false);
                // switching category drops category-specific feature picks (they
                // wouldn't match a different rubro); keep the universal ones.
                const keepFeatures = active ? f.features : f.features.filter((x) => COMMON_SET.has(x));
                patch({ cat: k, subCat: open ? f.subCat : null, features: keepFeatures });
              }}
              className={`flex w-full cursor-pointer items-center justify-between rounded-[10px] px-[11px] py-[9px] text-left text-[13px] ${
                active || open ? 'bg-lilac-3 font-extrabold text-ink' : 'font-bold text-ink-soft'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full" style={{ background: CAT[k].dot }} />
                {L(CAT[k].es, CAT[k].en)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-muted-faint">{counts[k] ?? 0}</span>
                {subs.length > 0 && (
                  <ChevronDown size={13} strokeWidth={2.6} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                )}
              </span>
            </button>
            {open && subs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-2 py-2">
                {subs.map(([se, en]) => {
                  const on = f.subCat === se;
                  return (
                    <button
                      key={se}
                      onClick={() => patch({ cat: k, subCat: on ? null : se })}
                      className={`cursor-pointer rounded-full px-[11px] py-1.5 text-[11.5px] ${
                        on ? 'bg-primary font-extrabold text-white' : 'bg-lilac-2 font-bold text-ink-3'
                      }`}
                    >
                      {L(se, en)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Características — dynamic per selected category */}
      {catFeatures.length > 0 && (
        <div className="mt-5">
          <div className={secLabel}>
            {L('Características', 'Features')}
            <span className="ml-1.5 font-bold normal-case tracking-normal text-muted-faint">{L(CAT[f.cat as CatKey].es, CAT[f.cat as CatKey].en)}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">{shownFeatures.map(featChip)}</div>
          {catFeatures.length > FEAT_PREVIEW && (
            <button
              onClick={() => setShowAllFeat((v) => !v)}
              className="mt-2 cursor-pointer text-[11.5px] font-extrabold text-primary-dark"
            >
              {showAllFeat ? L('Ver menos', 'See less') : L(`Ver todas (${catFeatures.length})`, `See all (${catFeatures.length})`)}
            </button>
          )}
        </div>
      )}

      <button onClick={clearAll} className="mt-5 w-full cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white py-2.5 text-[12.5px] font-extrabold text-primary-dark">
        {L('Limpiar filtros', 'Clear')}
      </button>
    </>
  );

  // Quick-filter pills: each reveals its own control on demand (all screens).
  const pill = (active: boolean) =>
    `flex flex-none cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-extrabold ${
      active ? 'bg-primary text-white' : 'bg-white text-ink shadow-[inset_0_0_0_1px_rgba(30,27,46,.08)]'
    }`;

  const quickBar = (
    <div className="relative mb-4">
      <div className="no-scrollbar -mx-3.5 flex gap-2 overflow-x-auto px-3.5 lg:mx-0 lg:px-0">
        <button onClick={() => setOpenFilter(openFilter === 'dist' ? null : 'dist')} className={pill(openFilter === 'dist' || f.maxDist !== DIST_DEFAULT)}>
          {f.maxDist !== DIST_DEFAULT ? `≤ ${f.maxDist} mi` : L('Distancia', 'Distance')}
          <ChevronDown size={13} strokeWidth={2.6} className={`transition-transform ${openFilter === 'dist' ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={() => setOpenFilter(openFilter === 'rating' ? null : 'rating')} className={pill(openFilter === 'rating' || !!f.rating)}>
          {f.rating ? `★ ${f.rating}+` : L('Calificación', 'Rating')}
          <ChevronDown size={13} strokeWidth={2.6} className={`transition-transform ${openFilter === 'rating' ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={() => setOpenFilter(openFilter === 'price' ? null : 'price')} className={pill(openFilter === 'price' || !!f.price)}>
          {f.price ?? L('Precio', 'Price')}
          <ChevronDown size={13} strokeWidth={2.6} className={`transition-transform ${openFilter === 'price' ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={() => patch({ openNow: !f.openNow })} className={pill(f.openNow)}>
          {L('Abierto ahora', 'Open now')}
        </button>
      </div>

      {openFilter && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpenFilter(null)} />
          <div className="absolute left-0 z-40 mt-2 w-full rounded-2xl border border-hair bg-white p-4 shadow-pop md:w-[320px]">
            {openFilter === 'dist' && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Distancia', 'Distance')}</span>
                  <span className="text-[12px] font-extrabold text-primary-dark">≤ {f.maxDist} {L('millas', 'mi')}</span>
                </div>
                <input
                  type="range"
                  min={DIST_MIN}
                  max={DIST_MAX}
                  value={f.maxDist}
                  onChange={(e) => patch({ maxDist: parseInt(e.target.value, 10) })}
                  className="w-full accent-[#7B61FF]"
                />
                <div className="mt-1 flex justify-between text-[10.5px] font-bold text-muted-faint">
                  <span>{DIST_MIN} mi</span>
                  <span>{DIST_MAX} mi</span>
                </div>
              </>
            )}
            {openFilter === 'rating' && (
              <>
                <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Calificación', 'Rating')}</div>
                <div className="flex gap-2">
                  {(['4.5', '4.0', '3.5'] as const).map((r) => (
                    <button key={r} onClick={() => patch({ rating: f.rating === r ? null : r })} className={seg(f.rating === r)}>
                      ★ {r}
                    </button>
                  ))}
                </div>
              </>
            )}
            {openFilter === 'price' && (
              <>
                <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Precio', 'Price')}</div>
                <div className="flex gap-2">
                  {['$', '$$', '$$$'].map((p) => (
                    <button key={p} onClick={() => patch({ price: f.price === p ? null : p })} className={seg(f.price === p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div>
      {/* heading */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[20px] font-extrabold tracking-[-.02em] text-ink lg:text-[26px]">
            {L('Negocios cerca de ti', 'Businesses near you')}
          </h1>
          <div className="mt-0.5 text-[12.5px] font-semibold text-muted">
            <span className="font-extrabold text-ink">{results.length}</span>{' '}
            {L(`negocios en ${app.cityShort}`, `businesses in ${app.cityShort}`)}
          </div>
        </div>
        <div className="ml-auto flex flex-none items-center gap-2">
          <button
            onClick={() => setMapOpen(!mapOpen)}
            className={`hidden cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-extrabold md:flex ${
              mapOpen ? 'bg-primary text-white' : 'bg-white text-ink shadow-[inset_0_0_0_1px_rgba(30,27,46,.08)]'
            }`}
          >
            <MapIcon size={13} strokeWidth={2.4} />
            {L('Mapa', 'Map')}
          </button>
          <button
            onClick={() => setFiltersOpen(true)}
            className="relative flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[12px] font-extrabold text-ink shadow-[inset_0_0_0_1px_rgba(30,27,46,.08)] lg:hidden"
          >
            <SlidersHorizontal size={13} strokeWidth={2.4} />
            {L('Filtros', 'Filters')}
            {activeCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-extrabold text-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <SearchChip count={results.length} className="mb-3.5" />

      {/* quick-filter pills (distance / rating / price / open) */}
      {quickBar}

      {/* applied chips — only search + subcategory; plus a clear-all when any filter is on */}
      {activeCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {appliedChips.map((c) => (
            <span key={c.label} className="flex items-center gap-1.5 rounded-full bg-lilac py-1.5 pl-3 pr-2 text-[11.5px] font-extrabold text-primary-dark">
              {c.label}
              <button onClick={c.onRemove} className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-[rgba(109,77,246,.15)]">
                <X size={9} strokeWidth={3.4} />
              </button>
            </span>
          ))}
          <button onClick={clearAll} className="cursor-pointer text-[11.5px] font-extrabold text-muted underline">
            {L('Limpiar filtros', 'Clear')}
          </button>
        </div>
      )}

      <div className="grid items-start gap-[22px] lg:grid-cols-[252px_1fr]">
        {/* filter rail (desktop) */}
        <aside className="sticky top-[130px] hidden rounded-card-sm border border-hair bg-white p-[18px] shadow-card lg:block">
          {filterPanel}
        </aside>

        <div className="min-w-0">
          {mapOpen && (
            <div className="relative mb-4 hidden h-[180px] overflow-hidden rounded-card-sm md:block" style={{ background: tile('#E7ECF3', '#DCE3EC', 14) }}>
              {[
                { l: '22%', t: '38%' },
                { l: '47%', t: '58%' },
                { l: '66%', t: '30%' },
                { l: '81%', t: '62%' },
              ].map((p, i) => (
                <MapPin key={i} size={26} className="absolute -translate-x-1/2 -translate-y-full fill-primary text-white" style={{ left: p.l, top: p.t }} strokeWidth={1.5} />
              ))}
              <span className="absolute bottom-2.5 right-3 rounded-lg bg-[rgba(30,27,46,.6)] px-2.5 py-1 text-[10.5px] font-bold text-white">
                {L('Mapa (demo)', 'Map (demo)')}
              </span>
            </div>
          )}

          {results.length === 0 ? (
            <div className="rounded-card border border-hair bg-white p-10 text-center shadow-card">
              <div className="text-[15px] font-extrabold text-ink">{L('Sin resultados', 'No results')}</div>
              <div className="mt-1 text-[12.5px] font-semibold text-muted">{L('Prueba quitar algunos filtros.', 'Try removing some filters.')}</div>
            </div>
          ) : (
            <div className="grid gap-[15px] md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {pageResults.map((b, i) => {
                // Full-width label at the verified → sin-verificar boundary so the
                // two tiers read as distinct groups (verified always on top).
                const boundary = i > 0 && pageResults[i - 1].verified && !b.verified;
                return (
                  <div key={b.id} className="contents">
                    {boundary && (
                      <div className="col-span-full mt-1 flex items-center gap-2.5 md:col-span-2 lg:col-span-1 xl:col-span-2">
                        <span className="text-[12px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Más negocios cerca', 'More nearby')}</span>
                        <span className="h-px flex-1 bg-hair" />
                      </div>
                    )}
                    {b.verified ? <BizCardVerified b={b} onOpen={() => setDetailBiz(b)} /> : <BizCardBasic b={b} onOpen={() => setDetailBiz(b)} />}
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, curPage - 1))}
                className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border-[1.5px] border-lilac-line bg-white ${curPage > 1 ? 'cursor-pointer' : 'opacity-40'}`}
              >
                <ChevronLeft size={15} strokeWidth={2.4} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`flex h-[34px] min-w-[34px] cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] px-2 text-[12.5px] font-extrabold ${
                    n === curPage ? 'border-primary bg-primary text-white shadow-cta-sm' : 'border-lilac-line bg-white text-ink-soft'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, curPage + 1))}
                className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border-[1.5px] border-lilac-line bg-white ${curPage < totalPages ? 'cursor-pointer' : 'opacity-40'}`}
              >
                <ChevronRight size={15} strokeWidth={2.4} />
              </button>
              <span className="ml-2 text-[11.5px] font-bold text-muted">
                {(curPage - 1) * PAGE_SIZE + 1}–{Math.min(curPage * PAGE_SIZE, results.length)} {L('de', 'of')} {results.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* mobile/tablet filter sheet */}
      <Overlay open={filtersOpen} onClose={() => setFiltersOpen(false)} width={420}>
        <OverlayTitle title={L('Filtros', 'Filters')} onClose={() => setFiltersOpen(false)} />
        {filterPanel}
        <PrimaryBtn className="mt-4" onClick={() => setFiltersOpen(false)}>
          {L('Ver resultados', 'Show results')} ({results.length})
        </PrimaryBtn>
      </Overlay>
    </div>
  );
}

/** Small heart / save toggle shared by both card variants. */
function SaveBtn({ b, size = 17 }: { b: Business; size?: number }) {
  const { L } = useLang();
  const app = useApp();
  const savedOn = !!app.saved[b.id];
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        app.toggleSaved(b.id);
      }}
      className="ml-auto flex-none cursor-pointer p-1"
      aria-label={L('Guardar', 'Save')}
    >
      <Heart size={size} strokeWidth={2.2} className={savedOn ? 'text-pink' : 'text-[#D6D1E2]'} fill={savedOn ? '#F0466E' : 'none'} />
    </button>
  );
}

/** Rating · reviews · price · open — shared meta row. */
function BizMeta({ b }: { b: Business }) {
  const { L } = useLang();
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] font-bold">
      <span className="text-amber">★</span>
      <span className="font-extrabold text-ink">{b.rating}</span>
      <span className="text-muted-2">({b.reviews})</span>
      <span className="text-muted-2">· {b.price}</span>
      <span className={`font-extrabold ${b.open ? 'text-green' : 'text-[#A59FB6]'}`}>
        · {b.open ? L('Abierto', 'Open') : L('Cerrado', 'Closed')}
      </span>
    </div>
  );
}

/**
 * VERIFIED card — the richer listing (always ranked on top). Adds the specialty,
 * "what it offers" chips, a neighbor-endorsement bar with an avatar stack, a
 * featured review, and Call + View actions.
 */
function BizCardVerified({ b, onOpen }: { b: Business; onOpen: () => void }) {
  const { L } = useLang();
  const chips = b.amEs.length ? b.amEs.map((es, i) => [es, b.amEn[i] ?? es] as [string, string]) : [];
  const review = L(b.revEs, b.revEn).trim();

  return (
    <Card onClick={onOpen} className="border-[rgba(123,97,255,.22)] p-3.5 shadow-[0_2px_14px_rgba(123,97,255,.09)] transition-shadow hover:shadow-card-lg">
      <div className="flex items-start gap-3">
        <span className="h-[84px] w-[84px] flex-none rounded-tile" style={{ background: bizTile(b) }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15.5px] font-extrabold text-ink">{b.name}</span>
            <VerifiedBadge size={17} />
            <SaveBtn b={b} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-muted">
            <span className="rounded-md bg-lilac px-1.5 py-0.5 text-[11px] text-primary-dark">{L(CAT[b.cat].es, CAT[b.cat].en)}</span>
            <span>· {b.dist}</span>
          </div>
          <div className="mt-1.5">
            <BizMeta b={b} />
          </div>
          {b.specEs && (
            <div className="mt-1 truncate text-[12px] font-bold text-ink-3">{L(b.specEs, b.specEn)}</div>
          )}
        </div>
      </div>

      {/* what it offers — first 3 amenities */}
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.slice(0, 3).map(([es, en]) => (
            <span key={es} className="inline-flex items-center gap-1.5 rounded-full bg-lilac-2 px-2.5 py-1 text-[11px] font-bold text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {L(es, en)}
            </span>
          ))}
        </div>
      )}

      {/* neighbor endorsement */}
      {b.endorse > 0 && (
        <div className="mt-3 flex items-center gap-2.5 rounded-btn bg-lilac-2 px-3 py-2">
          <span className="flex flex-none">
            {['CR', 'DL', 'JP'].map((ini, i) => (
              <Avatar key={ini} initials={ini} color={AVATAR_PALETTE[i]} size={22} className={`border-2 border-lilac-2 text-[8px] ${i > 0 ? '-ml-2' : ''}`} />
            ))}
          </span>
          <span className="text-[11.5px] font-bold text-ink-3">
            {L('Recomendado por', 'Recommended by')} <span className="text-primary-dark">{b.endorse} {L('vecinos', 'neighbors')}</span>
          </span>
        </div>
      )}

      {/* featured review */}
      {review && (
        <div className="mt-2.5 line-clamp-2 text-[12px] font-medium leading-[1.5] text-muted">{review}</div>
      )}

      <div className="mt-3 flex gap-2 border-t border-hair pt-3">
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-field border-[1.5px] border-lilac-line bg-white py-2.5 text-[12.5px] font-extrabold text-ink"
        >
          <Phone size={13} strokeWidth={2.4} className="text-green" />
          {L('Llamar', 'Call')}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="flex flex-1 cursor-pointer items-center justify-center rounded-field bg-primary py-2.5 text-[12.5px] font-extrabold text-white"
        >
          {L('Ver perfil', 'View')}
        </button>
      </div>
    </Card>
  );
}

/**
 * BASIC card — the simple listing for a business that hasn't been verified yet.
 * Minimal content + a "Sin verificar" badge; a single "Ver perfil" action.
 */
function BizCardBasic({ b, onOpen }: { b: Business; onOpen: () => void }) {
  const { L } = useLang();

  return (
    <Card onClick={onOpen} className="p-3 transition-shadow hover:shadow-card-lg">
      <div className="flex items-start gap-3">
        <span className="h-[58px] w-[58px] flex-none rounded-tile opacity-90" style={{ background: bizTile(b) }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-extrabold text-ink">{b.name}</span>
            <SaveBtn b={b} size={16} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-hair px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-muted-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D6D1E2]" />
              {L('Sin verificar', 'Unverified')}
            </span>
            <span className="text-[11.5px] font-bold text-muted">{L(CAT[b.cat].es, CAT[b.cat].en)} · {b.dist}</span>
          </div>
          <div className="mt-1.5">
            <BizMeta b={b} />
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="flex-none cursor-pointer self-center rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-2 text-[12px] font-extrabold text-primary-dark"
        >
          {L('Ver perfil', 'View')}
        </button>
      </div>
    </Card>
  );
}
