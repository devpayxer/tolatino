'use client';

// Client-app header (Handoff v2): wordmark · city · global search · ES/EN ·
// bell · publish · avatar, plus the horizontal 7-category bar and the live
// grouped search-suggestions dropdown.

import { usePathname, useRouter } from 'next/navigation';
import { Bell, Briefcase, Calendar, Car, Home, MapPin, Plus, Search, Store, Truck, Users, X } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { Chip, SoonTag, Wordmark, YouAvatar } from '@/components/ui';
import { NAV_CATS, VIEW_PATH, bizTile, eventTile } from '@/data/fixtures';
import { useLiveData } from '@/lib/live';
import { CAT, tile } from '@/lib/tiles';

const NAV_ICONS = { users: Users, store: Store, calendar: Calendar, truck: Truck, home: Home, car: Car, briefcase: Briefcase };

export function LangToggle({ mini = false }: { mini?: boolean }) {
  const { lang, setLang } = useLang();
  const base = mini ? 'px-[9px] py-[5px] text-[10.5px]' : 'px-3 py-1.5 text-[12px]';
  const btn = (code: 'es' | 'en', label: string) => (
    <button
      onClick={() => setLang(code)}
      className={`cursor-pointer rounded-full font-extrabold ${base} ${lang === code ? 'bg-primary text-white' : 'text-muted'}`}
    >
      {label}
    </button>
  );
  return (
    <span className="flex flex-none rounded-full bg-lilac-2 p-0.5">
      {btn('es', 'ES')}
      {btn('en', 'EN')}
    </span>
  );
}

function SearchBox({ mobile = false }: { mobile?: boolean }) {
  const { L } = useLang();
  const { query, setQuery, setSearch } = useApp();
  const router = useRouter();
  const commit = () => {
    if (!query.trim()) return;
    setSearch(query.trim());
    setQuery('');
    router.push(VIEW_PATH.negocios);
  };
  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-btn border-[1.5px] border-[#ECE9F6] bg-app px-[13px] ${
        mobile ? 'py-[10px]' : 'w-full max-w-[520px] py-[9px]'
      }`}
    >
      <Search size={16} className="flex-none text-primary" strokeWidth={2.2} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        placeholder={L('Busca tacos, mecánico, salón…', 'Search tacos, mechanic, salon…')}
        className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] font-medium text-ink outline-none placeholder:text-muted"
      />
      {query.length > 0 && (
        <button
          onClick={() => setQuery('')}
          className="flex h-5 w-5 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-line"
          aria-label="clear"
        >
          <X size={9} strokeWidth={3.4} className="text-ink-2" />
        </button>
      )}
    </div>
  );
}

function SearchDropdown() {
  const { L } = useLang();
  const { query, setQuery, setSearch } = useApp();
  const { businesses: BUSINESSES, events: EVENTS, posts: POSTS } = useLiveData();
  const router = useRouter();
  const ql = query.trim().toLowerCase();
  if (!ql) return null;

  const go = (view: 'comunidad' | 'negocios' | 'eventos') => {
    setSearch(query.trim());
    setQuery('');
    router.push(VIEW_PATH[view]);
  };

  const bizHits = BUSINESSES.filter((b) =>
    `${b.name} ${CAT[b.cat].es} ${CAT[b.cat].en} ${b.specEs} ${b.specEn}`.toLowerCase().includes(ql),
  );
  const evHits = EVENTS.filter((e) => `${e.tEs} ${e.tEn} ${e.lEs} ${e.lEn}`.toLowerCase().includes(ql));
  const postHits = POSTS.filter((p) => `${p.es} ${p.en} ${p.name} ${p.business ?? ''}`.toLowerCase().includes(ql));
  const total = bizHits.length + evHits.length + postHits.length;

  const groups: { label: string; count: number; items: { name: string; meta: string; tile: string; view: 'comunidad' | 'negocios' | 'eventos' }[] }[] = [
    { label: L('Negocios', 'Business'), count: bizHits.length, items: bizHits.slice(0, 3).map((b) => ({ name: b.name, meta: `${L(CAT[b.cat].es, CAT[b.cat].en)} · ★ ${b.rating}`, tile: bizTile(b), view: 'negocios' })) },
    { label: L('Eventos', 'Events'), count: evHits.length, items: evHits.slice(0, 3).map((e) => ({ name: L(e.tEs, e.tEn), meta: L(e.lEs, e.lEn), tile: eventTile(e), view: 'eventos' })) },
    { label: L('Comunidad', 'Community'), count: postHits.length, items: postHits.slice(0, 3).map((p) => ({ name: p.name, meta: L(p.es, p.en).slice(0, 54), tile: tile('#EFEBFF', '#E5DEF9', 8), view: 'comunidad' })) },
  ];

  return (
    <div className="absolute left-1/2 top-[calc(100%+6px)] z-[45] max-h-[340px] w-[calc(100%-20px)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-hair-strong bg-white p-2 shadow-pop md:w-[560px]">
      {groups.filter((g) => g.count > 0).map((g) => (
        <div key={g.label}>
          <div className="px-2.5 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[.06em] text-muted-2">
            {g.label} · {g.count}
          </div>
          {g.items.map((it) => (
            <button
              key={it.name}
              onClick={() => go(it.view)}
              className="flex w-full cursor-pointer items-center gap-[11px] rounded-field p-2.5 text-left hover:bg-app"
            >
              <span className="h-[38px] w-[38px] flex-none rounded-[10px]" style={{ background: it.tile }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-extrabold text-ink">{it.name}</span>
                <span className="mt-px block truncate text-[11px] font-semibold text-muted">{it.meta}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
      {total === 0 ? (
        <div className="px-3 py-6 text-center text-[12.5px] font-semibold text-muted">
          {L('Sin resultados para tu búsqueda', 'No results for your search')}
        </div>
      ) : (
        <button
          onClick={() => go('negocios')}
          className="mt-1.5 flex w-full cursor-pointer items-center justify-between rounded-btn bg-lilac-3 px-3.5 py-3 text-[12.5px] font-extrabold text-primary-dark"
        >
          {L('Ver todos los resultados', 'See all results')}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function AppHeader() {
  const { L } = useLang();
  const app = useApp();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-hair bg-[rgba(255,255,255,.94)] backdrop-blur-[8px] backdrop-saturate-[1.4]">
      <div className="relative mx-auto flex w-full max-w-[1180px] items-center gap-2 px-3.5 py-[11px] md:gap-3.5 md:px-[22px] md:py-[13px]">
        <Wordmark onClick={() => router.push(VIEW_PATH.comunidad)} size="sm" />
        <button
          onClick={() => app.setCityOpen(true)}
          className="flex flex-none cursor-pointer items-center gap-[5px] rounded-full bg-lilac-2 px-2.5 py-[7px] text-[12px] font-extrabold text-ink md:px-3 md:py-2"
        >
          <MapPin size={13} className="text-primary" strokeWidth={2.4} />
          <span className="max-w-[64px] truncate md:max-w-none">{app.city}</span>
        </button>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <SearchBox />
        </div>

        <div className="ml-auto flex flex-none items-center gap-2 md:gap-[9px]">
          <LangToggle mini />
          <button
            onClick={() => app.setNotifOpen(true)}
            className="relative hidden h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 md:flex"
            aria-label={L('Notificaciones', 'Notifications')}
          >
            <Bell size={18} strokeWidth={2} className="text-ink" />
            {app.unreadCount > 0 && (
              <span className="absolute right-[5px] top-[5px] flex h-[15px] min-w-[15px] items-center justify-center rounded-[9px] border-2 border-white bg-pink px-[3px] text-[9px] font-extrabold text-white">
                {app.unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => app.openPub()}
            className="hidden flex-none cursor-pointer items-center gap-[7px] rounded-field bg-ink px-[15px] py-2.5 text-[12.5px] font-extrabold text-white md:flex"
          >
            <Plus size={14} strokeWidth={2.4} className="text-amber" />
            <span className="hidden lg:inline">{L('Publicar', 'List')}</span>
          </button>
          <YouAvatar size={36} onClick={() => app.setUserOpen(true)} />
        </div>
        <SearchDropdown />
      </div>

      {/* mobile: own search row */}
      <div className="px-3.5 pb-[11px] md:hidden">
        <SearchBox mobile />
      </div>

      {/* 7-category bar — centered when it fits, scrolls from the start when it
          doesn't (w-max + mx-auto avoids the justify-center overflow cut-off). */}
      <nav className="no-scrollbar overflow-x-auto">
        <div className="mx-auto flex w-max max-w-[1180px] items-stretch gap-0.5 px-2.5 md:gap-1 md:px-[18px]">
          {NAV_CATS.map((c) => {
            const Icon = NAV_ICONS[c.icon];
            const active = pathname?.startsWith(VIEW_PATH[c.k]);
            return (
              <button
                key={c.k}
                onClick={() => router.push(VIEW_PATH[c.k])}
                className={`relative flex flex-none cursor-pointer items-center gap-1.5 whitespace-nowrap px-[11px] pb-3 pt-[13px] text-[13px] md:px-[13px] md:pb-[13px] md:pt-[15px] md:text-[13.5px] ${
                  active ? 'font-extrabold text-ink' : c.soon ? 'font-bold text-muted-faint2' : 'font-bold text-muted'
                }`}
              >
                <Icon size={16} strokeWidth={2} className={active ? 'text-primary' : c.soon ? 'text-muted-faint2' : 'text-muted'} />
                <span>{L(c.es, c.en)}</span>
                {c.soon && <SoonTag label={L('Pronto', 'Soon')} />}
                <span
                  className={`absolute bottom-0 left-[11px] right-[11px] h-[3px] rounded-t-[3px] ${active ? 'bg-primary' : 'bg-transparent'}`}
                />
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

/** Committed-search chip shown at the top of each section. */
export function SearchChip({ count, className = '' }: { count: number; className?: string }) {
  const { L } = useLang();
  const { search, setSearch } = useApp();
  if (!search) return null;
  return (
    <div className={`flex flex-wrap items-center gap-[9px] ${className}`}>
      <span className="text-[12.5px] font-bold text-ink-2">
        <span className="font-extrabold text-ink">{count}</span> {L('resultados para', 'results for')}
      </span>
      <span className="flex items-center gap-1.5 rounded-full bg-primary py-1.5 pl-3 pr-2 text-[11.5px] font-extrabold text-white">
        “{search}”
        <button
          onClick={() => setSearch('')}
          className="flex h-4 w-4 flex-none cursor-pointer items-center justify-center rounded-full bg-[rgba(255,255,255,.28)]"
          aria-label="clear search"
        >
          <X size={8} strokeWidth={4} />
        </button>
      </span>
    </div>
  );
}

export { Chip };
