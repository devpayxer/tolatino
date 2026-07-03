'use client';

// Negocios (`/negocios`) — Yelp-style directory (Handoff v2).
// Desktop: sticky filter rail + results grid + map placeholder.
// Mobile: swipeable category chips + "Filtros" bottom sheet.
// Card variant A ("Lista") — the prototype default.

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Heart, Map as MapIcon, MapPin, Phone, SlidersHorizontal, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { Card, Chip, Overlay, OverlayTitle, PrimaryBtn, VerifiedBadge } from '@/components/ui';
import { SearchChip } from '@/components/AppHeader';
import { SUBCATS, bizTile, type Business } from '@/data/fixtures';
import { useLiveData } from '@/lib/live';
import { CAT, CAT_KEYS, tile, type CatKey } from '@/lib/tiles';
import { BizDetail } from '@/screens/BizDetail';

const DIST_MAX = 25;
const PAGE_SIZE = 6;

// es → en lookup for subcategory labels (filter stores the canonical es value).
const SUB_EN: Record<string, string> = {};
for (const arr of Object.values(SUBCATS)) for (const [es, en] of arr) SUB_EN[es] = en;

type Filters = {
  cat: CatKey | 'all';
  subCat: string | null;
  price: string | null;
  rating: string | null;
  maxDist: number;
  openNow: boolean;
};

const DEFAULT_FILTERS: Filters = { cat: 'all', subCat: null, price: null, rating: null, maxDist: DIST_MAX, openNow: false };

export function NegociosScreen() {
  const { L } = useLang();
  const app = useApp();
  const { businesses: BUSINESSES } = useLiveData();
  const [f, setF] = useState<Filters>(DEFAULT_FILTERS);
  const [catOpen, setCatOpen] = useState<CatKey | null>(null);
  const [sort, setSort] = useState<'rel' | 'dist' | 'rating'>('rel');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [detailBiz, setDetailBiz] = useState<Business | null>(null);

  const patch = (p: Partial<Filters>) => {
    setF((cur) => ({ ...cur, ...p }));
    setPage(1);
  };

  const sl = app.search.trim().toLowerCase();
  const results = useMemo(() => {
    let list = BUSINESSES.slice();
    if (f.cat !== 'all') list = list.filter((b) => b.cat === f.cat);
    if (f.subCat) list = list.filter((b) => (b.subcats ?? []).includes(f.subCat as string));
    if (f.price) list = list.filter((b) => b.price === f.price);
    if (f.rating) list = list.filter((b) => parseFloat(b.rating) >= parseFloat(f.rating!));
    if (f.openNow) list = list.filter((b) => b.open);
    if (f.maxDist < DIST_MAX) list = list.filter((b) => parseFloat(b.dist) <= f.maxDist);
    if (sl) {
      list = list.filter((b) => {
        const subs = (b.subcats ?? []).map((s) => `${s} ${SUB_EN[s] ?? ''}`).join(' ');
        return `${b.name} ${CAT[b.cat].es} ${CAT[b.cat].en} ${b.specEs} ${b.specEn} ${subs}`.toLowerCase().includes(sl);
      });
    }
    if (sort === 'rating') list = list.slice().sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    if (sort === 'dist') list = list.slice().sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist));
    return list;
  }, [f, sl, sort, BUSINESSES]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageResults = results.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  const counts = useMemo(() => {
    const m: Partial<Record<CatKey, number>> = {};
    BUSINESSES.forEach((b) => (m[b.cat] = (m[b.cat] ?? 0) + 1));
    return m;
  }, [BUSINESSES]);

  const sortLabels = { rel: L('Relevancia', 'Relevance'), dist: L('Distancia', 'Distance'), rating: L('Calificación', 'Rating') };
  const toggleSort = () => setSort((s) => (s === 'rel' ? 'dist' : s === 'dist' ? 'rating' : 'rel'));

  const appliedChips: { label: string; onRemove: () => void }[] = [];
  if (sl) appliedChips.push({ label: `“${app.search}”`, onRemove: () => app.setSearch('') });
  if (f.cat !== 'all') appliedChips.push({ label: L(CAT[f.cat].es, CAT[f.cat].en), onRemove: () => patch({ cat: 'all', subCat: null }) });
  if (f.subCat) appliedChips.push({ label: L(f.subCat, SUB_EN[f.subCat] ?? f.subCat), onRemove: () => patch({ subCat: null }) });
  if (f.price) appliedChips.push({ label: f.price, onRemove: () => patch({ price: null }) });
  if (f.rating) appliedChips.push({ label: `★ ${f.rating}+`, onRemove: () => patch({ rating: null }) });
  if (f.openNow) appliedChips.push({ label: L('Abierto ahora', 'Open now'), onRemove: () => patch({ openNow: false }) });
  if (f.maxDist < DIST_MAX) appliedChips.push({ label: `≤ ${f.maxDist} mi`, onRemove: () => patch({ maxDist: DIST_MAX }) });

  const clearAll = () => {
    setF(DEFAULT_FILTERS);
    setCatOpen(null);
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

  const filterPanel = (
    <>
      {/* category accordion */}
      <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Categoría', 'Category')}</div>
      <button
        onClick={() => {
          patch({ cat: 'all', subCat: null });
          setCatOpen(null);
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
                patch({ cat: k, subCat: open ? f.subCat : null });
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

      <div className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Precio', 'Price')}</div>
      <div className="flex gap-2">
        {['$', '$$', '$$$'].map((p) => (
          <button key={p} onClick={() => patch({ price: f.price === p ? null : p })} className={seg(f.price === p)}>
            {p}
          </button>
        ))}
      </div>

      <div className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Calificación', 'Rating')}</div>
      <div className="flex gap-2">
        {(['4.5', '4.0', '3.5'] as const).map((r) => (
          <button key={r} onClick={() => patch({ rating: f.rating === r ? null : r })} className={seg(f.rating === r)}>
            ★ {r}
          </button>
        ))}
      </div>

      <div className="mb-2 mt-4 flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Distancia', 'Distance')}</span>
        <span className="text-[12px] font-extrabold text-primary-dark">
          {f.maxDist < DIST_MAX ? `≤ ${f.maxDist} mi` : L('Cualquiera', 'Any')}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={DIST_MAX}
        value={f.maxDist}
        onChange={(e) => patch({ maxDist: parseInt(e.target.value, 10) })}
        className="w-full accent-[#7B61FF]"
      />

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[13px] font-extrabold text-ink">{L('Abierto ahora', 'Open now')}</span>
        <button
          onClick={() => patch({ openNow: !f.openNow })}
          className={`relative h-[26px] w-11 flex-none cursor-pointer rounded-full transition-colors ${f.openNow ? 'bg-primary' : 'bg-[#E3DEF2]'}`}
          aria-label={L('Abierto ahora', 'Open now')}
        >
          <span
            className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ${f.openNow ? 'left-[21px]' : 'left-[3px]'}`}
          />
        </button>
      </div>

      <button onClick={clearAll} className="mt-5 w-full cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white py-2.5 text-[12.5px] font-extrabold text-primary-dark">
        {L('Limpiar filtros', 'Clear')}
      </button>
    </>
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
            onClick={toggleSort}
            className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[12px] font-extrabold text-ink shadow-[inset_0_0_0_1px_rgba(30,27,46,.08)]"
          >
            {sortLabels[sort]}
            <ChevronDown size={13} strokeWidth={2.6} className="text-muted" />
          </button>
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
            {appliedChips.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-extrabold text-white">
                {appliedChips.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <SearchChip count={results.length} className="mb-3.5" />

      {/* mobile category chips */}
      <div className="no-scrollbar -mx-3.5 mb-4 flex gap-2 overflow-x-auto px-3.5 lg:hidden">
        <Chip active={f.cat === 'all'} onClick={() => patch({ cat: 'all', subCat: null })}>
          {L('Todos', 'All')}
        </Chip>
        {CAT_KEYS.filter((k) => counts[k]).map((k) => (
          <Chip key={k} active={f.cat === k} onClick={() => patch({ cat: k, subCat: null })}>
            {L(CAT[k].es, CAT[k].en)}
          </Chip>
        ))}
      </div>

      {/* applied chips */}
      {appliedChips.length > 0 && (
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
              {pageResults.map((b) => (
                <BizCardA key={b.id} b={b} onOpen={() => setDetailBiz(b)} />
              ))}
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

/** Card variant A · "Lista" (prototype default). */
function BizCardA({ b, onOpen }: { b: Business; onOpen: () => void }) {
  const { L } = useLang();
  const app = useApp();
  const savedOn = !!app.saved[b.id];

  return (
    <Card
      onClick={onOpen}
      className={`p-3.5 transition-shadow hover:shadow-card-lg ${b.verified ? 'border-[rgba(123,97,255,.18)]' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className="h-[78px] w-[78px] flex-none rounded-tile" style={{ background: bizTile(b) }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-extrabold text-ink">{b.name}</span>
            {b.verified && <VerifiedBadge size={17} />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                app.toggleSaved(b.id);
              }}
              className="ml-auto flex-none cursor-pointer p-1"
              aria-label={L('Guardar', 'Save')}
            >
              <Heart size={17} strokeWidth={2.2} className={savedOn ? 'text-pink' : 'text-[#D6D1E2]'} fill={savedOn ? '#F0466E' : 'none'} />
            </button>
          </div>
          <div className="mt-0.5 truncate text-[12px] font-bold text-muted">
            {L(CAT[b.cat].es, CAT[b.cat].en)} · {b.dist}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] font-bold">
            <span className="text-amber">★</span>
            <span className="font-extrabold text-ink">{b.rating}</span>
            <span className="text-muted-2">({b.reviews})</span>
            <span className="text-muted-2">· {b.price}</span>
            <span className={`font-extrabold ${b.open ? 'text-green' : 'text-[#A59FB6]'}`}>
              · {b.open ? L('Abierto', 'Open') : L('Cerrado', 'Closed')}
            </span>
          </div>
          <div className={`mt-1 text-[11.5px] font-bold ${b.verified ? 'text-primary-dark' : 'text-muted-2'}`}>
            {b.verified
              ? L(`Recomendado por ${b.endorse} vecinos`, `Recommended by ${b.endorse} neighbors`)
              : L('Aún sin verificar', 'Not yet verified')}
          </div>
        </div>
      </div>
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
