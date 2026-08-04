'use client';

// Client-app header (Handoff v2): wordmark · city · global search · ES/EN ·
// bell · publish · avatar, plus the horizontal 7-category bar and the live
// grouped search-suggestions dropdown.

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { IconBell as Bell, IconBriefcase as Briefcase, IconCalendar as Calendar, IconCar as Car, IconHome as Home, IconMapPin as MapPin, IconPlus as Plus, IconSearch as Search, IconBuildingStore as Store, IconClock as Clock, IconTruck as Truck, IconUsers as Users, IconX as X } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useNotifications } from '@/lib/notifications';
import { useAuth } from '@/lib/auth';
import { Avatar, Chip, SoonTag, Wordmark, YouAvatar } from '@/components/ui';
import { NAV_CATS, VIEW_PATH, bizTile, eventTile, type Business, type EventItem, type Post } from '@/data/fixtures';
import { useLiveData, searchBusinesses, searchEvents } from '@/lib/live';
import { borrarReciente, borrarTodasLasRecientes, guardarReciente, leerRecientes, type Reciente } from '@/lib/recientes';
import { supabase } from '@/lib/supabase';
import { CAT, tile } from '@/lib/tiles';

const NAV_ICONS = { users: Users, store: Store, calendar: Calendar, truck: Truck, home: Home, car: Car, briefcase: Briefcase };

export function LangToggle({ mini = false }: { mini?: boolean }) {
  const { lang, setLang } = useLang();
  // La pastilla se sigue viendo igual de baja, pero cada mitad mide 44px de
  // ancho: son dos botones PEGADOS, asi que la zona de toque no puede crecer a
  // los lados con un pseudo-elemento sin robarle el toque al de al lado — tiene
  // que ser ancho de verdad. (2a auditoria de Comunidad.)
  const base = mini ? 'min-w-11 justify-center py-[5px] text-[10.5px]' : 'px-3 py-1.5 text-[12px]';
  const btn = (code: 'es' | 'en', label: string) => (
    <button
      onClick={() => setLang(code)}
      className={`tap-y flex cursor-pointer rounded-full font-extrabold ${base} ${lang === code ? 'bg-primary text-white' : 'text-muted'}`}
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
      <Search size={16} className="flex-none text-primary" stroke={2.2} />
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
          aria-label={L('Borrar la búsqueda', 'Clear search')}
        >
          <X size={9} stroke={3.4} className="text-ink-2" />
        </button>
      )}
    </div>
  );
}

// Misma caja para los dos estados del desplegable (recientes y resultados), para
// que no puedan divergir.
// Atajos del estado sin-resultados: las categorías que más se buscan. No son
// decorativos — rellenan el buscador y disparan la búsqueda de verdad.
const ATAJOS = [
  { es: 'mecánico', en: 'mechanic' },
  { es: 'comida', en: 'food' },
  { es: 'salón', en: 'salon' },
  { es: 'tienda', en: 'store' },
  { es: 'plomero', en: 'plumber' },
];

const CAJA = 'absolute left-1/2 top-[calc(100%+6px)] z-[45] max-h-[340px] w-[calc(100%-20px)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-hair-strong bg-white p-2 shadow-pop md:w-[560px]';

function SearchDropdown() {
  const { L } = useLang();
  const { query, setQuery, setSearch, city, coords } = useApp();
  const { businesses: BUSINESSES, events: EVENTS, posts: POSTS } = useLiveData();
  const router = useRouter();
  // Full-catalog business suggestions via server FTS (same RPC the Negocios
  // section uses), so the preview surfaces matches beyond the loaded geo slice.
  // Debounced; falls back to the client substring filter when empty/offline.
  const [serverBiz, setServerBiz] = useState<Business[] | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setServerBiz(null); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      searchBusinesses({ q, lat: coords?.lat ?? null, lng: coords?.lng ?? null, city, limit: 6 })
        .then((r) => { if (!cancelled) setServerBiz(r); });
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, city, coords?.lat, coords?.lng]);

  // Full-catalog event suggestions via the same server FTS the Eventos section uses
  // (surfaces matches beyond the loaded geo slice). Debounced; client fallback.
  const [serverEv, setServerEv] = useState<EventItem[] | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setServerEv(null); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      searchEvents({ q, lat: coords?.lat ?? null, lng: coords?.lng ?? null, limit: 6 })
        .then((r) => { if (!cancelled) setServerEv(r); });
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, coords?.lat, coords?.lng]);

  // Sugerencias de Comunidad contra la BASE, igual que Negocios y Eventos. Antes
  // solo miraba las publicaciones ya cargadas: escribir algo de la semana pasada
  // no sugería nada aunque existiera. (Auditoría de Comunidad, 2026-08-03.)
  const [serverPosts, setServerPosts] = useState<Post[] | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !supabase) { setServerPosts(null); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      supabase!.rpc('search_posts', { in_q: q, user_lat: coords?.lat ?? null, user_lng: coords?.lng ?? null, max_results: 6 })
        .then(({ data, error }) => {
          if (cancelled) return;
          setServerPosts(error || !Array.isArray(data) ? [] : (data as Record<string, unknown>[]).map((r) => ({
            id: String(r.id), type: r.type as Post['type'], initials: String(r.author_initials),
            color: String(r.author_color), name: String(r.author_name), hoodEs: String(r.hood ?? ''),
            city: (r.city as string) ?? undefined, timeEs: '', timeEn: '', recommends: 0,
            es: String(r.body_es), en: String(r.body_en),
          })));
        });
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, coords?.lat, coords?.lng]);

  // ── AÑADIDO: recientes ─────────────────────────────────────────────────
  // Se leen una vez al montar y tras cada búsqueda; `localStorage` no avisa de
  // sus propios cambios, así que se refresca a mano con `sello`.
  const [sello, setSello] = useState(0);
  const [recientes, setRecientes] = useState<Reciente[]>([]);
  useEffect(() => { setRecientes(leerRecientes()); }, [sello]);

  // ── AÑADIDO: «¿quisiste decir…?» ───────────────────────────────────────
  // Solo se pregunta cuando la búsqueda va MAL (poco o nada), no siempre: si ya
  // encontró lo que buscaba, corregirle la palabra es ruido.
  const [correccion, setCorreccion] = useState<string | null>(null);
  const pocosResultados =
    (serverBiz?.length ?? 0) + (serverEv?.length ?? 0) + (serverPosts?.length ?? 0) === 0;
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || !supabase || !pocosResultados) { setCorreccion(null); return; }
    let cancelado = false;
    const t = setTimeout(() => {
      supabase!.rpc('sugerir_termino', { in_q: q }).then(({ data, error }) => {
        if (cancelado) return;
        const s = !error && typeof data === 'string' ? data.trim() : '';
        setCorreccion(s && s.toLowerCase() !== q.toLowerCase() ? s : null);
      });
    }, 320);
    return () => { cancelado = true; clearTimeout(t); };
  }, [query, pocosResultados]);

  const ql = query.trim().toLowerCase();

  const go = (view: 'comunidad' | 'negocios' | 'eventos') => {
    const q = query.trim();
    guardarReciente(q);
    setSello((n) => n + 1);
    setSearch(q);
    setQuery('');
    router.push(VIEW_PATH[view]);
  };

  // Sin nada escrito: en vez de no mostrar nada, las últimas búsquedas. Es el
  // momento en que el buscador puede ahorrarle a alguien teclear otra vez.
  if (!ql) {
    if (recientes.length === 0) return null;
    return (
      <div className={CAJA}>
        <div className="flex items-baseline justify-between px-2.5 pb-1 pt-2">
          <span className="text-[10px] font-extrabold uppercase tracking-[.06em] text-muted-2">
            {L('Búsquedas recientes', 'Recent searches')}
          </span>
          <button
            onClick={() => { borrarTodasLasRecientes(); setSello((n) => n + 1); }}
            className="cursor-pointer text-[11px] font-extrabold text-primary-dark"
          >
            {L('Borrar todo', 'Clear all')}
          </button>
        </div>
        {recientes.map((r) => (
          <div key={r.q} className="flex items-center gap-1 rounded-field pr-1 hover:bg-app">
            <button
              onClick={() => { setQuery(r.q); setSearch(r.q); guardarReciente(r.q); setSello((n) => n + 1); }}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-[11px] p-2.5 text-left"
            >
              <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-lilac-2">
                <Clock size={17} stroke={2.2} className="text-primary-dark" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-ink">{r.q}</span>
            </button>
            <button
              onClick={() => { borrarReciente(r.q); setSello((n) => n + 1); }}
              className="tap flex-none cursor-pointer rounded-full p-1.5 text-muted-2 hover:text-ink"
              aria-label={L(`Quitar ${r.q} de recientes`, `Remove ${r.q} from recent`)}
            >
              <X size={14} stroke={2.6} />
            </button>
          </div>
        ))}
      </div>
    );
  }

  const clientBizHits = BUSINESSES.filter((b) =>
    `${b.name} ${CAT[b.cat].es} ${CAT[b.cat].en} ${b.specEs} ${b.specEn}`.toLowerCase().includes(ql),
  );
  const bizHits = serverBiz != null && serverBiz.length > 0 ? serverBiz : clientBizHits;
  const clientEvHits = EVENTS.filter((e) => `${e.tEs} ${e.tEn} ${e.lEs} ${e.lEn}`.toLowerCase().includes(ql));
  const evHits = serverEv != null && serverEv.length > 0 ? serverEv : clientEvHits;
  const clientPostHits = POSTS.filter((p) => `${p.es} ${p.en} ${p.name} ${p.business ?? ''}`.toLowerCase().includes(ql));
  const postHits = serverPosts != null && serverPosts.length > 0 ? serverPosts : clientPostHits;
  const total = bizHits.length + evHits.length + postHits.length;

  const groups: { label: string; count: number; items: { name: string; meta: string; tile: string; view: 'comunidad' | 'negocios' | 'eventos' }[] }[] = [
    { label: L('Negocios', 'Business'), count: bizHits.length, items: bizHits.slice(0, 3).map((b) => ({ name: b.name, meta: `${L(CAT[b.cat].es, CAT[b.cat].en)} · ★ ${b.rating}`, tile: bizTile(b), view: 'negocios' })) },
    { label: L('Eventos', 'Events'), count: evHits.length, items: evHits.slice(0, 3).map((e) => ({ name: L(e.tEs, e.tEn), meta: L(e.lEs, e.lEn), tile: eventTile(e), view: 'eventos' })) },
    { label: L('Comunidad', 'Community'), count: postHits.length, items: postHits.slice(0, 3).map((p) => ({ name: p.name, meta: L(p.es, p.en).slice(0, 54), tile: tile('#EFEBFF', '#E5DEF9', 8), view: 'comunidad' })) },
  ];

  return (
    <div className={CAJA}>
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
      {/* AÑADIDO · «¿Quisiste decir…?». Antes de rendirse, el buscador propone.
          La corrección sale del vocabulario de la propia app (los términos de
          las categorías y las claves de sinónimos), así que solo sugiere
          palabras que de verdad llevan a algún sitio. */}
      {correccion && (
        <button
          onClick={() => { setQuery(correccion); setCorreccion(null); }}
          className="mb-1 flex w-full cursor-pointer items-center gap-2 rounded-field bg-amber-bg px-3 py-2.5 text-left"
        >
          <Search size={14} stroke={2.4} className="flex-none text-amber-ink" />
          <span className="min-w-0 text-[12.5px] font-semibold text-amber-ink">
            {L('¿Quisiste decir', 'Did you mean')}{' '}
            <span className="font-extrabold underline">{correccion}</span>?
          </span>
        </button>
      )}

      {total === 0 ? (
        /* AÑADIDO · sin resultados CON SALIDA. Antes era una línea muerta: te
           decía que no había nada y te dejaba ahí. Un buscador serio siempre
           ofrece el siguiente paso. */
        <div className="px-3 py-5">
          <div className="text-center text-[13px] font-extrabold text-ink">
            {L(`Nada por aquí para “${query.trim()}”`, `Nothing here for “${query.trim()}”`)}
          </div>
          <div className="mx-auto mt-1 max-w-[300px] text-center text-[11.5px] font-semibold leading-[1.5] text-muted">
            {L('Puede que aún no esté en tu zona. Prueba con otra palabra o mira por categoría.',
               'It may not be in your area yet. Try another word or browse by category.')}
          </div>
          <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
            {ATAJOS.map((a) => (
              <button
                key={a.es}
                onClick={() => { setQuery(L(a.es, a.en)); }}
                className="tap-y cursor-pointer rounded-full bg-lilac-2 px-3 py-1.5 text-[11.5px] font-extrabold text-primary-dark"
              >
                {L(a.es, a.en)}
              </button>
            ))}
          </div>
          <button
            onClick={() => go('negocios')}
            className="mt-3.5 flex w-full cursor-pointer items-center justify-center rounded-btn bg-lilac-3 px-3.5 py-2.5 text-[12.5px] font-extrabold text-primary-dark"
          >
            {L('Ver todos los negocios cerca', 'See all businesses nearby')}
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            // land on the section with the most matches, not always Negocios
            const best = ([['negocios', bizHits.length], ['eventos', evHits.length], ['comunidad', postHits.length]] as [ 'negocios' | 'eventos' | 'comunidad', number][])
              .sort((a, b) => b[1] - a[1])[0][0];
            go(best);
          }}
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
  const { unreadCount } = useNotifications();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-hair bg-[rgba(255,255,255,.94)] backdrop-blur-[8px] backdrop-saturate-[1.4]">
      <div className="relative mx-auto flex w-full max-w-[1180px] items-center gap-2 px-3.5 py-[11px] md:gap-3.5 md:px-[22px] md:py-[13px]">
        <Wordmark onClick={() => router.push(VIEW_PATH.comunidad)} size="sm" />
        <button
          onClick={() => app.setCityOpen(true)}
          className="tap flex flex-none cursor-pointer items-center gap-[5px] rounded-full bg-lilac-2 px-2.5 py-[7px] text-[12px] font-extrabold text-ink md:px-3 md:py-2"
        >
          <MapPin size={13} className="text-primary" stroke={2.4} />
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
            <Bell size={18} stroke={2} className="text-ink" />
            {unreadCount > 0 && (
              <span className="absolute right-[5px] top-[5px] flex h-[15px] min-w-[15px] items-center justify-center rounded-[9px] border-2 border-white bg-pink px-[3px] text-[9px] font-extrabold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => app.openPub()}
            className="hidden flex-none cursor-pointer items-center gap-[7px] rounded-field bg-ink px-[15px] py-2.5 text-[12.5px] font-extrabold text-white md:flex"
          >
            <Plus size={14} stroke={2.4} className="text-amber" />
            <span className="hidden lg:inline">{L('Publicar', 'List')}</span>
          </button>
          {auth.profile ? (
            <button onClick={() => app.setUserOpen(true)} className="tap flex-none cursor-pointer rounded-full" aria-label={auth.profile.display_name}>
              <Avatar initials={auth.profile.initials} color={auth.profile.avatar_color} src={auth.profile.avatar_url} size={36} className="border-2 border-lilac-ring" />
            </button>
          ) : (
            <YouAvatar size={36} onClick={() => app.setUserOpen(true)} />
          )}
        </div>
        {/* desktop: dropdown anchors to the centered top-bar search box */}
        <div className="hidden md:block">
          <SearchDropdown />
        </div>
      </div>

      {/* mobile: own search row — relative so the dropdown anchors under THIS input */}
      <div className="relative px-3.5 pb-[11px] md:hidden">
        <SearchBox mobile />
        <SearchDropdown />
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
                onClick={() => { window.dispatchEvent(new CustomEvent('tl:navtab', { detail: VIEW_PATH[c.k] })); router.push(VIEW_PATH[c.k]); }}
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
          aria-label={L('Borrar la búsqueda', 'Clear search')}
        >
          <X size={8} stroke={4} />
        </button>
      </span>
    </div>
  );
}

export { Chip };
