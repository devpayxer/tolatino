'use client';

// Bienvenida (`/`) — landing pública. Rediseño completo según el handoff
// "ToLatino Home Page", VARIANTE B (full-bleed, hero a pantalla completa),
// 2026-07-29.
//
// Dos reglas gobiernan este archivo:
//
// 1. El handoff manda en lo VISUAL (regla #2): tokens, tamaños fluidos con
//    clamp(), rieles con scroll-snap, banda oscura de eventos, banda morada de
//    negocios. Lo que aquí se ve es lo que diseñó el handoff.
// 2. Los DATOS son reales (regla #8). El handoff avisa que sus negocios,
//    listados y testimonios son "representative sample data" — publicarlos sería
//    repetir lo que se limpió el 2026-07-29. Aquí todo sale de la base: negocios
//    y eventos de `useLiveData`, conteos/testimonios/mercado de la migración
//    0131. Sin datos → la sección se oculta o muestra su vacío honesto.
//
// Lo que el handoff deja configurable y aquí se decide:
//   · `showAppSection` = FALSE. El bloque de descarga lleva botones de App Store
//     y Google Play, y las apps NO existen. Un botón que no lleva a ningún lado
//     es un estado roto publicado como final (regla #8). Se activa el día que
//     haya apps. Anotado en docs/LAUNCH-CHECKLIST.md.
//   · `showBottomBar` = TRUE (barra de acción móvil).
//
// El handoff también propone un modal de registro propio. Aquí los CTA llevan al
// flujo de alta REAL que ya existe (`/entrar`, `/negocio/publicar`) en vez de
// duplicar la lógica de auth: ese flujo ya arregla el aviso de "confirma tu
// correo" y la creación del perfil, y duplicarlo sería divergir de él.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconBriefcase as Briefcase, IconCalendar as Calendar, IconCar as Car,
  IconChartBar as BarChart, IconCheck as Check, IconChevronDown as ChevronDown,
  IconCreditCard as CreditCard, IconGlobe as Globe, IconHome as HomeIcon,
  IconMapPin as MapPin, IconMenu2 as Menu, IconMessageCircle as MessageSquare,
  IconPackage as Package, IconSearch as Search, IconShieldCheck as ShieldCheck,
  IconStar as Star, IconToolsKitchen2 as Utensils, IconTruck as Truck,
  IconUsers as Users, IconTool as Wrench, IconX as X,
} from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useLiveData } from '@/lib/live';
import { useLandingData, compact, money } from '@/lib/landing';
import { CityModal } from '@/components/CityModal';
import { tile } from '@/lib/tiles';

// El bloque de descarga de app queda APAGADO hasta que existan las apps.
const SHOW_APP_SECTION = false;

// Ritmos del handoff (variante B).
const GUTTER = 'clamp(18px, 5vw, 64px)';
const MAXW = 1560;
const RAIL_PAD = `max(${GUTTER}, calc((100% - ${MAXW}px) / 2))`;

type Vertical = 'all' | 'food' | 'serv' | 'evt' | 'rent' | 're' | 'auto' | 'job';

export function LandingScreen() {
  const { L, lang, setLang } = useLang();
  const app = useApp();
  const router = useRouter();
  const live = useLiveData();
  const { stats, testimonials, market } = useLandingData();

  const [tab, setTab] = useState<Vertical>('all');
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const toastT = useRef<number | undefined>(undefined);

  const flash = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(''), 2200);
  }, []);
  useEffect(() => () => window.clearTimeout(toastT.current), []);

  // Barra fija: el fondo aparece al pasar 60px. Listener pasivo y `setState`
  // solo cuando el booleano cambia, como pide el handoff.
  useEffect(() => {
    const on = () => setScrolled((p) => {
      const next = window.scrollY > 60;
      return p === next ? p : next;
    });
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  // Bloquear el scroll del cuerpo con el menú abierto (el prototipo no lo hacía).
  useEffect(() => {
    if (!menu) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [menu]);

  // Búsqueda: reutiliza la búsqueda GLOBAL que ya funciona (`app.setSearch` +
  // ruta del vertical). No se inventa una ruta /buscar inexistente: cada
  // pantalla ya filtra por `app.search`.
  const VERT_PATH: Record<Vertical, string> = {
    all: '/negocios/', food: '/negocios/', serv: '/negocios/', evt: '/eventos/',
    rent: '/negocios/', re: '/bienes-raices/', auto: '/autos/', job: '/trabajos/',
  };
  const submitSearch = () => {
    app.setSearch(query.trim());
    router.push(VERT_PATH[tab]);
  };

  const go = (path: string) => router.push(path);
  const openSignup = (kind: 'user' | 'biz' = 'user') =>
    router.push(kind === 'biz' ? '/negocio/publicar/' : '/entrar/');

  const VERTICALS: { k: Vertical; es: string; en: string; Icon: typeof Search }[] = [
    { k: 'all', es: 'Todo', en: 'Everything', Icon: Search },
    { k: 'food', es: 'Comida', en: 'Food', Icon: Utensils },
    { k: 'serv', es: 'Servicios', en: 'Services', Icon: Wrench },
    { k: 'evt', es: 'Eventos', en: 'Events', Icon: Calendar },
    { k: 'rent', es: 'Renta', en: 'Rentals', Icon: Package },
    { k: 're', es: 'Casas', en: 'Homes', Icon: HomeIcon },
    { k: 'auto', es: 'Autos', en: 'Autos', Icon: Car },
    { k: 'job', es: 'Empleos', en: 'Jobs', Icon: Briefcase },
  ];
  const PLACEHOLDER: Record<Vertical, [string, string]> = {
    all: ['Busca comida, servicios, eventos, casas, autos o empleos…', 'Search food, services, events, homes, autos or jobs…'],
    food: ['Tacos, birria, mariscos, pastelería…', 'Tacos, birria, seafood, bakery…'],
    serv: ['Barbería, uñas, mecánico, limpieza…', 'Barber, nails, mechanic, cleaning…'],
    evt: ['Bailes, conciertos, ferias, quinceañeras…', 'Dances, concerts, fairs, quinceañeras…'],
    rent: ['Brincolines, mesas, sonido, herramientas…', 'Bounce houses, tables, sound, tools…'],
    re: ['Casas en venta, departamentos, cuartos…', 'Homes for sale, apartments, rooms…'],
    auto: ['Trocas, sedanes, aquí pagas aquí…', 'Trucks, sedans, buy here pay here…'],
    job: ['Construcción, cocina, limpieza, oficina…', 'Construction, kitchen, cleaning, office…'],
  };
  const POPULAR: Record<Vertical, [string[], string[]]> = {
    all: [['Tacos al pastor', 'Barbería cerca', 'Baile este sábado', 'Brincolines', 'Troca usada'],
          ['Al pastor tacos', 'Barber near me', 'Dance this Saturday', 'Bounce houses', 'Used truck']],
    food: [['Birria', 'Mariscos', 'Tamales', 'Pastelería', 'Taquiza'], ['Birria', 'Seafood', 'Tamales', 'Bakery', 'Catering']],
    serv: [['Barbería', 'Uñas', 'Mecánico', 'Limpieza', 'Dentista'], ['Barber', 'Nails', 'Mechanic', 'Cleaning', 'Dentist']],
    evt: [['Banda en vivo', 'Lucha libre', 'Feria', 'Gratis', 'Familiar'], ['Live banda', 'Lucha libre', 'Fair', 'Free', 'Family']],
    rent: [['Brincolines', 'Mesas y sillas', 'Sonido', 'Herramientas', 'Camping'], ['Bounce houses', 'Tables & chairs', 'Sound', 'Tools', 'Camping']],
    re: [['Casas en venta', 'Renta 2 recámaras', 'Cuartos', 'Local comercial'], ['Homes for sale', '2 bd rentals', 'Rooms', 'Retail space']],
    auto: [['Aquí pagas aquí', 'Trocas', 'Sin crédito', 'Vans'], ['Buy here pay here', 'Trucks', 'No credit', 'Vans']],
    job: [['Efectivo', 'Por día', 'Cocinero', 'Limpieza', 'Bilingüe'], ['Cash pay', 'Day labor', 'Cook', 'Cleaning', 'Bilingual']],
  };

  const cityShort = app.cityShort || app.city;
  const bizCount = stats?.businesses ?? null;

  // Categorías: color e icono del handoff, CONTEOS REALES. El conteo solo se
  // pinta si la base lo da — nunca se inventa un "312 negocios".
  const CATS = useMemo(() => {
    const c = stats?.by_category ?? {};
    const sum = (...keys: string[]) => {
      const n = keys.reduce((a, k) => a + (c[k] ?? 0), 0);
      return n > 0 ? n : null;
    };
    return [
      { es: 'Restaurantes', en: 'Restaurants', n: sum('FoodDrinks'), unit: ['negocios', 'places'], color: '#D6336C', bg: 'rgba(214,51,108,.12)', glow: 'rgba(214,51,108,.07)', Icon: Utensils, path: '/negocios/' },
      { es: 'Servicios', en: 'Services', n: sum('ProServices', 'HomeServices'), unit: ['negocios', 'places'], color: '#0E9488', bg: 'rgba(14,148,136,.12)', glow: 'rgba(14,148,136,.07)', Icon: Wrench, path: '/negocios/' },
      { es: 'Eventos', en: 'Events', n: stats?.events_week ?? null, unit: ['esta semana', 'this week'], color: '#E8954A', bg: 'rgba(232,149,74,.16)', glow: 'rgba(232,149,74,.09)', Icon: Calendar, path: '/eventos/' },
      { es: 'Renta', en: 'Rentals', n: sum('Party', 'Sports'), unit: ['negocios', 'places'], color: '#C26A1A', bg: 'rgba(194,106,26,.13)', glow: 'rgba(194,106,26,.07)', Icon: Package, path: '/negocios/' },
      { es: 'Bienes Raíces', en: 'Real Estate', n: stats?.properties ?? null, unit: ['propiedades', 'listings'], color: '#2A6CB0', bg: 'rgba(42,108,176,.12)', glow: 'rgba(42,108,176,.07)', Icon: HomeIcon, path: '/bienes-raices/' },
      { es: 'Autos', en: 'Autos', n: stats?.vehicles ?? null, unit: ['vehículos', 'vehicles'], color: '#1F9D57', bg: 'rgba(31,157,87,.12)', glow: 'rgba(31,157,87,.07)', Icon: Car, path: '/autos/' },
      { es: 'Empleos', en: 'Jobs', n: stats?.jobs ?? null, unit: ['vacantes', 'openings'], color: '#7B61FF', bg: 'rgba(123,97,255,.13)', glow: 'rgba(123,97,255,.08)', Icon: Briefcase, path: '/trabajos/' },
      { es: 'Belleza', en: 'Beauty', n: sum('BeautyHealth'), unit: ['negocios', 'places'], color: '#B0357E', bg: 'rgba(176,53,126,.12)', glow: 'rgba(176,53,126,.07)', Icon: Star, path: '/negocios/' },
      { es: 'Transporte', en: 'Transport', n: sum('Transportation'), unit: ['negocios', 'places'], color: '#5B5570', bg: 'rgba(91,85,112,.12)', glow: 'rgba(91,85,112,.07)', Icon: Truck, path: '/negocios/' },
      { es: 'Comunidad', en: 'Community', n: stats?.posts ?? null, unit: ['publicaciones', 'posts'], color: '#6D4DF6', bg: 'rgba(109,77,246,.12)', glow: 'rgba(109,77,246,.07)', Icon: MessageSquare, path: '/comunidad/' },
    ];
  }, [stats]);

  const NAV = [
    { id: 'explorar', es: 'Explorar', en: 'Explore' },
    { id: 'negocios', es: 'Negocios', en: 'Businesses' },
    { id: 'eventos', es: 'Eventos', en: 'Events' },
    { id: 'mercado', es: 'Mercado', en: 'Marketplace' },
    { id: 'como', es: 'Cómo funciona', en: 'How it works' },
    { id: 'para-negocios', es: 'Para negocios', en: 'For businesses' },
  ];

  const Brand = ({ size = 'clamp(19px, 2.4vw, 23px)' }: { size?: string }) => (
    <span className="flex items-baseline font-extrabold" style={{ fontSize: size, letterSpacing: '-.03em' }}>
      <span className="text-white">To</span>
      <span className="text-primary-on-dark">Latino</span>
      <i className="ml-1 inline-block h-1.5 w-1.5 rotate-45 bg-amber" aria-hidden />
    </span>
  );

  const sectionStyle = { paddingLeft: GUTTER, paddingRight: GUTTER, maxWidth: MAXW, margin: '0 auto' } as const;
  const h2 = { font: '800 clamp(23px, 3.4vw, 40px)/1.1 inherit', letterSpacing: '-.035em' } as const;

  return (
    <div className="bg-page" style={{ overflowX: 'clip' }}>
      {/* ═══════ BARRA FIJA ═══════ */}
      <header className="fixed inset-x-0 top-0 z-50" style={{ height: 'clamp(58px, 8vw, 72px)' }}>
        <div aria-hidden className="absolute inset-0 transition-opacity duration-300"
             style={{ background: 'rgba(17,14,31,.86)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,.09)', opacity: scrolled || menu ? 1 : 0 }} />
        <div className="relative flex h-full items-center overflow-hidden" style={{ ...sectionStyle, gap: 'clamp(10px, 2vw, 18px)' }}>
          <button onClick={() => go('/')} className="flex-none cursor-pointer" aria-label="To'Latino"><Brand /></button>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden xl:flex">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`}
                 className="whitespace-nowrap rounded-[10px] px-[13px] py-[9px] text-[13px] font-bold text-white/75 transition-colors hover:bg-white/10 hover:text-white">
                {L(n.es, n.en)}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex flex-none items-center rounded-full border border-white/10 bg-white/10 p-[3px]">
            {(['es', 'en'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                      className={`cursor-pointer rounded-full px-[13px] py-1.5 text-[11.5px] font-extrabold uppercase ${lang === l ? 'bg-primary text-white' : 'text-white/60'}`}>
                {l}
              </button>
            ))}
          </div>

          <button onClick={() => go('/entrar/')} className="hidden flex-none cursor-pointer text-[13px] font-extrabold text-white/80 sm:block">
            {L('Entrar', 'Log in')}
          </button>
          <button onClick={() => openSignup('user')}
                  className="hidden flex-none cursor-pointer rounded-btn bg-primary px-[18px] py-[11px] text-[13px] font-extrabold text-white sm:block"
                  style={{ boxShadow: '0 10px 24px rgba(123,97,255,.42)' }}>
            {L('Crear cuenta', 'Sign up')}
          </button>

          <button onClick={() => setMenu(true)} aria-label={L('Menú', 'Menu')}
                  className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-btn border border-white/15 bg-white/10 xl:hidden">
            <Menu size={18} stroke={2.4} className="text-white" />
          </button>
        </div>
      </header>

      {/* ═══════ HERO ═══════ */}
      <section className="relative flex flex-col overflow-hidden bg-night"
               style={{ minHeight: '100svh', paddingTop: 'clamp(84px, 13vw, 124px)', paddingBottom: 'clamp(20px, 3vw, 32px)', paddingLeft: GUTTER, paddingRight: GUTTER }}>
        <span aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2"
              style={{ top: '-24%', width: 'min(1400px, 150vw)', height: 'min(900px, 110vh)', background: 'radial-gradient(ellipse at center, rgba(123,97,255,.42), transparent 62%)' }} />
        <span aria-hidden className="pointer-events-none absolute"
              style={{ bottom: '-18%', right: '-18%', width: 'min(760px, 90vw)', height: 'min(760px, 90vw)', background: 'radial-gradient(circle, rgba(214,51,108,.30), transparent 66%)' }} />
        <span aria-hidden className="pointer-events-none absolute"
              style={{ bottom: '-10%', left: '-22%', width: 'min(620px, 80vw)', height: 'min(620px, 80vw)', background: 'radial-gradient(circle, rgba(244,183,64,.16), transparent 66%)' }} />
        <span aria-hidden className="pointer-events-none absolute inset-0"
              style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.03) 0 2px, transparent 2px 22px)' }} />

        <div className="relative flex w-full flex-1 flex-col justify-center" style={{ maxWidth: MAXW, margin: '0 auto' }}>
          <span className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-[14px] py-[7px]">
            <i className="tl-pulse inline-block h-[7px] w-[7px] rounded-full" style={{ background: '#4ADE80' }} aria-hidden />
            <span className="font-bold text-white/85" style={{ fontSize: 'clamp(10.5px, 1.5vw, 12px)' }}>
              {bizCount != null
                ? L(`En vivo en ${cityShort} · ${compact(bizCount)} negocios latinos`, `Live in ${cityShort} · ${compact(bizCount)} Latino businesses`)
                : L(`En vivo en ${cityShort}`, `Live in ${cityShort}`)}
            </span>
          </span>

          <h1 className="text-white" style={{ font: '800 clamp(31px, 7.6vw, 76px)/1.04 inherit', letterSpacing: '-.04em', maxWidth: '15ch', textWrap: 'balance', marginTop: 'clamp(16px, 2.4vw, 26px)' }}>
            {L(`Todo lo latino de ${cityShort},`, `Everything Latino in ${cityShort},`)}
          </h1>

          {/* rotador CSS puro: no se reinicia al teclear en el buscador */}
          <div aria-hidden style={{ height: '1.3em', overflow: 'hidden', marginTop: '.06em' }}>
            <div className="tl-roll">
              {[
                L('para comer.', 'to eat.'), L('para tu fiesta.', 'for your party.'),
                L('para tu casa.', 'for your home.'), L('para tu troca.', 'for your truck.'),
                L('para tu chamba.', 'for your work.'), L('en un toque.', 'in one tap.'),
                L('para comer.', 'to eat.'),
              ].map((w, i) => (
                <div key={i} style={{
                  height: '1.3em', whiteSpace: 'nowrap',
                  font: '800 clamp(31px, 7.6vw, 76px)/1.3 inherit', letterSpacing: '-.04em',
                  background: 'linear-gradient(96deg, #C9B6FF, #FF7FB0 52%, #F4B740)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                }}>{w}</div>
              ))}
            </div>
          </div>

          <p className="hidden sm:block" style={{ font: '500 clamp(14px, 1.5vw, 17.5px)/1.6 inherit', color: 'rgba(255,255,255,.62)', maxWidth: '56ch', textWrap: 'pretty', marginTop: 14 }}>
            {L('Come, agenda, celebra, renta, múdate y trabaja — con negocios verificados de tu comunidad, en tu idioma.',
               'Eat, book, celebrate, rent, move and work — with verified businesses from your community, in your language.')}
          </p>

          <div className="no-scrollbar flex gap-[7px] overflow-x-auto" style={{ marginTop: 'clamp(18px, 2.6vw, 28px)' }}>
            {VERTICALS.map(({ k, es, en, Icon }) => {
              const on = tab === k;
              return (
                <button key={k} onClick={() => setTab(k)}
                        className={`flex flex-none cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full border px-[15px] py-[9px] text-[12.5px] font-extrabold ${on ? 'border-primary bg-primary text-white' : 'border-white/20 bg-white/[.07] text-white/80'}`}>
                  <Icon size={14} stroke={2.2} className={on ? 'text-white' : 'text-white/60'} />
                  {L(es, en)}
                </button>
              );
            })}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]"
               style={{ background: '#fff', borderRadius: 'clamp(16px, 2vw, 20px)', padding: 8, maxWidth: 900, marginTop: 11, boxShadow: '0 26px 60px rgba(10,6,30,.5)' }}>
            <div className="flex min-w-0 items-center gap-2.5 px-2">
              <Search size={19} className="flex-none text-muted-2" />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                     onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                     placeholder={L(PLACEHOLDER[tab][0], PLACEHOLDER[tab][1])}
                     aria-label={L('Buscar', 'Search')}
                     className="min-w-0 flex-1 bg-transparent py-[13px] font-semibold text-ink outline-none placeholder:text-muted-faint"
                     style={{ fontSize: 'clamp(14px, 1.4vw, 15px)' }} />
              <span className="hidden h-6 w-px flex-none bg-hair sm:block" />
              <button onClick={() => app.setCityOpen(true)} className="hidden flex-none cursor-pointer items-center gap-1.5 pr-1 sm:flex">
                <MapPin size={15} className="text-primary" />
                <span className="text-[13px] font-bold text-ink-soft">{app.city}</span>
              </button>
            </div>
            <button onClick={submitSearch}
                    className="cursor-pointer rounded-[13px] bg-primary py-[14px] text-[14px] font-extrabold text-white"
                    style={{ paddingInline: 'clamp(20px, 3vw, 30px)', boxShadow: '0 10px 22px rgba(123,97,255,.34)' }}>
              {L('Buscar', 'Search')}
            </button>
          </div>

          <div className="mt-3 hidden flex-wrap items-center gap-2 sm:flex">
            <span className="text-[11.5px] font-bold text-white/45">{L('Popular:', 'Popular:')}</span>
            {POPULAR[tab][lang === 'es' ? 0 : 1].map((t) => (
              <button key={t} onClick={() => setQuery(t)}
                      className="cursor-pointer rounded-full border border-white/20 bg-white/[.06] px-3 py-1.5 text-[11.5px] font-bold text-white/80">
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* franja de confianza — cifras REALES; sin dato, guion */}
        <div className="relative w-full" style={{ maxWidth: MAXW, margin: '0 auto', borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 'clamp(16px, 2.2vw, 22px)' }}>
          <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 'clamp(10px, 1.6vw, 16px)' }}>
            {[
              { v: compact(stats?.verified), es: 'Negocios verificados', en: 'Verified businesses', Icon: ShieldCheck, c: '#7BE0A8' },
              { v: compact(stats?.neighbors), es: 'Vecinos activos', en: 'Active neighbors', Icon: Users, c: '#C9B6FF' },
              { v: stats?.avg_rating != null ? `${stats.avg_rating} ★` : '—', es: 'Calificación promedio', en: 'Average rating', Icon: Star, c: '#F4B740' },
              { v: 'ES / EN', es: 'Todo bilingüe', en: 'Fully bilingual', Icon: Globe, c: '#8FC5F5' },
            ].map((s) => (
              <div key={s.es} className="flex min-w-0 items-center gap-2.5">
                <span className="flex flex-none items-center justify-center rounded-[11px] bg-white/10"
                      style={{ width: 'clamp(30px, 3.4vw, 38px)', height: 'clamp(30px, 3.4vw, 38px)' }}>
                  <s.Icon size={16} style={{ color: s.c }} />
                </span>
                <span className="min-w-0">
                  <span className="block font-extrabold text-white" style={{ fontSize: 'clamp(13px, 1.5vw, 16px)' }}>{s.v}</span>
                  <span className="block truncate font-semibold text-white/50" style={{ fontSize: 'clamp(10px, 1.1vw, 11.5px)' }}>{L(s.es, s.en)}</span>
                </span>
              </div>
            ))}
          </div>
          <a href="#explorar" className="tl-bob mx-auto mt-4 hidden w-fit items-center gap-1.5 text-[11px] font-bold uppercase text-white/40 sm:flex" style={{ letterSpacing: '.1em' }}>
            {L('Desliza', 'Scroll')} <ChevronDown size={13} />
          </a>
        </div>
      </section>

      {/* ═══════ CATEGORÍAS ═══════ */}
      <section id="explorar" style={{ ...sectionStyle, paddingTop: 'clamp(44px, 7vw, 88px)' }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-ink" style={h2}>{L('Explora por categoría', 'Explore by category')}</h2>
            <p className="mt-[7px] font-medium text-ink-2" style={{ fontSize: 'clamp(13px, 1.4vw, 15.5px)', maxWidth: '52ch' }}>
              {L('Todo lo que necesitas, de gente que habla tu idioma.', 'Everything you need, from people who speak your language.')}
            </p>
          </div>
          <button onClick={() => openSignup('user')}
                  className="cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white px-[18px] py-3 text-[12.5px] font-extrabold text-primary-dark">
            {L('Crear cuenta gratis', 'Create free account')}
          </button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'clamp(10px, 1.2vw, 14px)', marginTop: 'clamp(18px, 2.4vw, 26px)' }}>
          {CATS.map((c) => (
            <button key={c.es} onClick={() => go(c.path)}
                    className="tl-cat relative cursor-pointer overflow-hidden rounded-card-sm border border-hair bg-white text-left"
                    style={{ padding: 'clamp(14px, 1.6vw, 19px)', boxShadow: '0 5px 16px rgba(60,50,110,.05)' }}>
              <span aria-hidden className="absolute rounded-full" style={{ top: -26, right: -26, width: 92, height: 92, background: c.glow }} />
              <span className="relative flex items-center justify-center rounded-tile"
                    style={{ width: 'clamp(40px, 4.4vw, 46px)', height: 'clamp(40px, 4.4vw, 46px)', background: c.bg }}>
                <c.Icon size={22} stroke={2} style={{ color: c.color }} />
              </span>
              <span className="relative mt-[13px] block font-extrabold text-ink" style={{ fontSize: 'clamp(13.5px, 1.4vw, 15px)', letterSpacing: '-.01em' }}>
                {L(c.es, c.en)}
              </span>
              {c.n != null && (
                <span className="relative mt-[3px] block text-[11.5px] font-semibold text-muted-2">
                  {c.n.toLocaleString('en-US')} {L(c.unit[0], c.unit[1])}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ═══════ NEGOCIOS DESTACADOS (reales) ═══════ */}
      <section id="negocios" style={{ paddingTop: 'clamp(44px, 7vw, 88px)' }}>
        <div style={sectionStyle}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="flex w-fit items-center gap-1.5 rounded-full bg-green-bg px-[11px] py-[5px]">
                <i className="inline-block h-1.5 w-1.5 rounded-full bg-green" aria-hidden />
                <span className="text-[10px] font-extrabold uppercase text-green-dark" style={{ letterSpacing: '.09em' }}>{L('Cerca de ti', 'Near you')}</span>
              </span>
              <h2 className="mt-2.5 text-ink" style={h2}>{L('Negocios destacados', 'Featured businesses')}</h2>
              <p className="mt-[7px] font-medium text-ink-2" style={{ fontSize: 'clamp(13px, 1.4vw, 15.5px)' }}>
                {L('Verificados, con reseñas reales de la comunidad.', 'Verified, with real reviews from the community.')}
              </p>
            </div>
            <button onClick={() => go('/negocios/')} className="cursor-pointer text-[12.5px] font-extrabold text-primary-dark">
              {bizCount != null ? L(`Ver los ${compact(bizCount)} →`, `See all ${compact(bizCount)} →`) : L('Ver negocios →', 'See businesses →')}
            </button>
          </div>
        </div>

        {live.businesses.length > 0 ? (
          <div className="no-scrollbar mt-5 flex overflow-x-auto" style={{ gap: 'clamp(11px, 1.2vw, 16px)', paddingInline: RAIL_PAD, scrollSnapType: 'x mandatory' }}>
            {live.businesses.slice(0, 10).map((b) => (
              <button key={b.slug} onClick={() => go(`/negocios/${b.slug}/`)}
                      className="tl-biz flex-none cursor-pointer overflow-hidden rounded-card border border-hair bg-white text-left"
                      style={{ flexBasis: 'clamp(244px, 74vw, 318px)', boxShadow: '0 6px 18px rgba(60,50,110,.06)', scrollSnapAlign: 'start' }}>
                <span className="relative block" style={{ height: 'clamp(124px, 15vw, 150px)', background: tile(b.t[0], b.t[1]) }}>
                  {b.open && (
                    <span className="absolute bottom-[11px] left-[11px] flex items-center gap-1.5 rounded-lg px-2.5 py-[5px]" style={{ background: 'rgba(255,255,255,.94)' }}>
                      <i className="inline-block h-1.5 w-1.5 rounded-full bg-green" aria-hidden />
                      <span className="text-[9.5px] font-extrabold text-green-dark">{L('Abierto ahora', 'Open now')}</span>
                    </span>
                  )}
                </span>
                <span className="block px-[15px] pb-[15px] pt-[14px]">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-extrabold text-ink" style={{ letterSpacing: '-.015em' }}>{b.name}</span>
                    {b.verified && (
                      <span className="flex h-[15px] w-[15px] flex-none items-center justify-center rounded-full bg-primary">
                        <Check size={9} stroke={3.6} className="text-white" />
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] font-semibold text-muted-2">
                    {[lang === 'es' ? b.specEs : b.specEn, b.city].filter(Boolean).join(' · ')}
                  </span>
                  <span className="mt-[11px] flex items-center gap-1.5 border-t border-hair pt-[11px]">
                    <Star size={12} className="fill-amber text-amber" />
                    <span className="text-[12px] font-extrabold text-ink">{b.rating}</span>
                    <span className="text-[11px] font-semibold text-muted-2">({b.reviews})</span>
                    {b.dist && <span className="ml-auto text-[11px] font-bold text-ink-soft">{b.dist}</span>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div style={sectionStyle}>
            <div className="mt-5 rounded-card border border-hair bg-white p-8 text-center">
              <p className="text-[14px] font-extrabold text-ink">{L('Aún no hay negocios cerca de ti', 'No businesses near you yet')}</p>
              <p className="mt-1 text-[12.5px] font-medium text-muted">{L('Sé el primero en publicar el tuyo — es gratis.', 'Be the first to publish yours — it’s free.')}</p>
              <button onClick={() => openSignup('biz')} className="mt-4 cursor-pointer rounded-btn bg-primary px-5 py-3 text-[13px] font-extrabold text-white">
                {L('Publicar mi negocio', 'Publish my business')}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ═══════ EVENTOS — banda oscura (reales) ═══════ */}
      <section id="eventos" className="relative overflow-hidden bg-night-band"
               style={{ padding: 'clamp(40px, 6vw, 76px) 0', marginTop: 'clamp(44px, 7vw, 88px)' }}>
        <span aria-hidden className="pointer-events-none absolute" style={{ top: '-30%', right: '-15%', width: 'min(680px, 80vw)', height: 'min(680px, 80vw)', background: 'radial-gradient(circle, rgba(214,51,108,.30), transparent 66%)' }} />
        <span aria-hidden className="pointer-events-none absolute" style={{ bottom: '-30%', left: '-15%', width: 'min(620px, 76vw)', height: 'min(620px, 76vw)', background: 'radial-gradient(circle, rgba(123,97,255,.26), transparent 66%)' }} />

        <div className="relative" style={sectionStyle}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="w-fit rounded-full px-[11px] py-[5px] text-[10px] font-extrabold uppercase text-amber"
                    style={{ background: 'rgba(244,183,64,.16)', letterSpacing: '.09em' }}>
                {L('Este fin de semana', 'This weekend')}
              </span>
              <h2 className="mt-2.5 text-white" style={h2}>{L('Eventos de tu comunidad', 'Events in your community')}</h2>
              <p className="mt-[7px] font-medium text-white/60" style={{ fontSize: 'clamp(13px, 1.4vw, 15.5px)' }}>
                {L('Bailes, ferias y celebraciones — con boletos en la app.', 'Dances, fairs and celebrations — with tickets in the app.')}
              </p>
            </div>
            <button onClick={() => go('/eventos/')} className="cursor-pointer rounded-btn border border-white/20 bg-white/10 px-[18px] py-3 text-[12.5px] font-extrabold text-white">
              {L('Ver todos los eventos', 'See all events')}
            </button>
          </div>
        </div>

        {live.events.length > 0 ? (
          <div className="no-scrollbar relative mt-5 flex overflow-x-auto" style={{ gap: 'clamp(11px, 1.2vw, 16px)', paddingInline: RAIL_PAD, scrollSnapType: 'x mandatory' }}>
            {live.events.slice(0, 10).map((e, i) => (
              <button key={`${e.tEs}-${i}`} onClick={() => go('/eventos/')}
                      className="tl-evt flex-none cursor-pointer overflow-hidden rounded-[19px] border border-white/10 bg-white/[.06] text-left"
                      style={{ flexBasis: 'clamp(238px, 72vw, 306px)', scrollSnapAlign: 'start' }}>
                <span className="relative block" style={{ height: 'clamp(112px, 13vw, 132px)', background: tile(e.t[0], e.t[1]) }}>
                  <span className="absolute left-[11px] top-[11px] rounded-[9px] bg-white px-[9px] py-[5px] text-center">
                    <span className="block text-[8.5px] font-extrabold uppercase text-rose" style={{ letterSpacing: '.06em' }}>{e.dEs}</span>
                    <span className="block text-[15px] font-extrabold leading-none text-ink">{e.day}</span>
                  </span>
                </span>
                <span className="block px-[14px] pb-[14px] pt-[13px]">
                  <span className="block text-[14.5px] font-extrabold leading-[1.25] text-white" style={{ letterSpacing: '-.01em' }}>{L(e.tEs, e.tEn)}</span>
                  <span className="mt-1 block truncate text-[11px] font-semibold text-white/55">
                    {[L(e.lEs, e.lEn), L(e.timeEs, e.timeEn)].filter(Boolean).join(' · ')}
                  </span>
                  <span className="mt-2.5 flex items-center">
                    <span className={`text-[13px] font-extrabold ${e.free ? 'text-mint' : 'text-amber'}`}>
                      {e.free ? L('Gratis', 'Free') : (e.price ?? '')}
                    </span>
                    {e.going != null && (
                      <span className="ml-auto text-[10.5px] font-bold text-white/50">{compact(e.going)} {L('van', 'going')}</span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="relative" style={sectionStyle}>
            <div className="mt-5 rounded-card border border-white/10 bg-white/[.06] p-8 text-center">
              <p className="text-[14px] font-extrabold text-white">{L('Todavía no hay eventos cerca', 'No events near you yet')}</p>
              <p className="mt-1 text-[12.5px] font-medium text-white/60">{L('¿Organizas algo? Publícalo y vende boletos.', 'Organizing something? Publish it and sell tickets.')}</p>
            </div>
          </div>
        )}
      </section>

      {/* ═══════ MERCADO (reales) ═══════ */}
      <section id="mercado" style={{ ...sectionStyle, paddingTop: 'clamp(44px, 7vw, 88px)' }}>
        <div style={{ maxWidth: 620 }}>
          <h2 className="text-ink" style={h2}>{L('Un mercado completo', 'A complete marketplace')}</h2>
          <p className="mt-[7px] font-medium text-ink-2" style={{ fontSize: 'clamp(13px, 1.4vw, 15.5px)' }}>
            {L('Casas, autos y empleos de la comunidad — sin intermediarios que no te entienden.',
               'Homes, autos and jobs from the community — without middlemen who don’t get you.')}
          </p>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: 'clamp(12px, 1.4vw, 18px)', marginTop: 'clamp(18px, 2.4vw, 26px)' }}>
          {([
            { key: 'homes' as const, Icon: HomeIcon, color: '#2A6CB0', bg: 'rgba(42,108,176,.12)', es: 'Casas y rentas', en: 'Homes & rentals', n: stats?.properties, unit: ['propiedades', 'listings'], cta: ['Ver propiedades', 'Browse homes'], path: '/bienes-raices/', money: true },
            { key: 'autos' as const, Icon: Car, color: '#1F9D57', bg: 'rgba(31,157,87,.12)', es: 'Autos y trocas', en: 'Autos & trucks', n: stats?.vehicles, unit: ['vehículos', 'vehicles'], cta: ['Ver autos', 'Browse autos'], path: '/autos/', money: true },
            { key: 'jobs' as const, Icon: Briefcase, color: '#7B61FF', bg: 'rgba(123,97,255,.13)', es: 'Empleos cerca', en: 'Jobs near you', n: stats?.jobs, unit: ['vacantes', 'openings'], cta: ['Ver empleos', 'Browse jobs'], path: '/trabajos/', money: false },
          ]).map((col) => {
            const rows = market[col.key];
            return (
              <div key={col.key} className="rounded-[22px] border border-hair bg-white" style={{ padding: 'clamp(16px, 1.8vw, 22px)', boxShadow: '0 6px 18px rgba(60,50,110,.05)' }}>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn" style={{ background: col.bg }}>
                    <col.Icon size={20} stroke={2} style={{ color: col.color }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15.5px] font-extrabold text-ink" style={{ letterSpacing: '-.015em' }}>{L(col.es, col.en)}</span>
                    {col.n != null && (
                      <span className="block text-[11px] font-semibold text-muted-2">{col.n.toLocaleString('en-US')} {L(col.unit[0], col.unit[1])}</span>
                    )}
                  </span>
                </div>

                <div className="mt-3.5 flex flex-col gap-2.5">
                  {rows.length > 0 ? rows.map((r, i) => (
                    <button key={r.slug ?? r.id ?? i} onClick={() => go(col.path)}
                            className="tl-row flex cursor-pointer items-center gap-[11px] rounded-tile border border-hair p-[11px] text-left">
                      <span className="h-[46px] w-[46px] flex-none rounded-[11px]" style={{ background: tile('#EFEBFF', '#E5DEF9') }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-extrabold text-ink">{r.name}</span>
                        {r.meta && <span className="block truncate text-[10.5px] font-semibold text-muted-2">{r.meta}</span>}
                      </span>
                      <span className="flex-none text-right">
                        <span className={`block text-[13px] font-extrabold ${col.money ? 'text-ink' : 'text-green-dark'}`}>
                          {col.money ? money(r.price) : (r.pay ?? '—')}
                        </span>
                        {col.key === 'autos' && r.bhph && (
                          <span className="mt-1 inline-block whitespace-nowrap rounded-md bg-amber-bg px-[7px] py-[3px] text-[8.5px] font-extrabold text-amber-ink">
                            {L('Aquí pagas aquí', 'Buy here pay here')}
                          </span>
                        )}
                      </span>
                    </button>
                  )) : (
                    <p className="py-6 text-center text-[12px] font-semibold text-muted-2">
                      {L('Aún no hay publicaciones aquí.', 'Nothing listed here yet.')}
                    </p>
                  )}
                </div>

                <button onClick={() => go(col.path)}
                        className="mt-3.5 w-full cursor-pointer rounded-btn border-[1.5px] border-lilac-line py-3 text-[12px] font-extrabold text-primary-dark">
                  {L(col.cta[0], col.cta[1])}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════ CÓMO FUNCIONA ═══════ */}
      <section id="como" style={{ ...sectionStyle, paddingTop: 'clamp(44px, 7vw, 88px)' }}>
        <div className="mx-auto text-center" style={{ maxWidth: 620 }}>
          <span className="text-[10px] font-extrabold uppercase text-primary" style={{ letterSpacing: '.16em' }}>{L('Cómo funciona', 'How it works')}</span>
          <h2 className="mt-2 text-ink" style={{ font: '800 clamp(24px, 3.4vw, 40px)/1.1 inherit', letterSpacing: '-.035em' }}>
            {L('Tres pasos y ya', 'Three steps and done')}
          </h2>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 'clamp(12px, 1.4vw, 18px)', marginTop: 'clamp(22px, 3vw, 34px)' }}>
          {[
            { t: ['Crea tu cuenta gratis', 'Create your free account'], b: ['Con tu correo. No pedimos tarjeta ni papeles.', 'With your email. No card, no paperwork.'] },
            { t: ['Busca en tu idioma', 'Search in your language'], b: ['Filtra por barrio, precio y horario. Todo verificado y con reseñas.', 'Filter by neighborhood, price and hours. All verified and reviewed.'] },
            { t: ['Pide, agenda o aplica', 'Order, book or apply'], b: ['Paga protegido en la app o contacta directo por chat y WhatsApp.', 'Pay protected in the app or contact directly by chat and WhatsApp.'] },
          ].map((s, i) => (
            <div key={i} className="rounded-card border border-hair bg-white text-center" style={{ padding: 'clamp(20px, 2.2vw, 26px)' }}>
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-tile bg-lilac-2 text-[16px] font-extrabold text-primary-dark">{i + 1}</span>
              <h3 className="mt-3.5 font-extrabold text-ink" style={{ fontSize: 'clamp(15px, 1.6vw, 17px)' }}>{L(s.t[0], s.t[1])}</h3>
              <p className="mt-1.5 text-[13px] font-medium leading-[1.6] text-ink-2" style={{ textWrap: 'pretty' }}>{L(s.b[0], s.b[1])}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ PARA NEGOCIOS — banda morada ═══════ */}
      <section id="para-negocios" className="relative overflow-hidden"
               style={{ background: 'linear-gradient(140deg, #6D4DF6, #8B6BFF 52%, #B0357E)', padding: 'clamp(40px, 6vw, 80px) 0', marginTop: 'clamp(44px, 7vw, 88px)' }}>
        <span aria-hidden className="pointer-events-none absolute rounded-full"
              style={{ bottom: '-45%', left: '-12%', width: 'min(620px, 80vw)', height: 'min(620px, 80vw)', background: 'rgba(255,255,255,.09)' }} />
        <div className="relative grid items-center" style={{ ...sectionStyle, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'clamp(26px, 3.4vw, 48px)' }}>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-white/80" style={{ letterSpacing: '.16em' }}>
              {L('Para dueños de negocio', 'For business owners')}
            </span>
            <h2 className="mt-2 text-white" style={{ font: '800 clamp(25px, 3.6vw, 44px)/1.1 inherit', letterSpacing: '-.035em', textWrap: 'balance' }}>
              {L('Tu negocio completo, desde tu celular', 'Your whole business, from your phone')}
            </h2>
            <p className="mt-3 font-medium leading-[1.65] text-white/80" style={{ fontSize: 'clamp(13.5px, 1.4vw, 15.5px)', maxWidth: '52ch' }}>
              {L('Publica gratis y crece cuando quieras: menú, citas, boletos, rentas, empleados, cobros y clientes — todo en un panel en español.',
                 'List free and grow when you want: menu, bookings, tickets, rentals, staff, payments and customers — all in one Spanish dashboard.')}
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button onClick={() => openSignup('biz')}
                      className="cursor-pointer rounded-[13px] bg-white px-6 py-[15px] text-[13.5px] font-extrabold text-primary-dark"
                      style={{ boxShadow: '0 14px 30px rgba(20,10,50,.26)' }}>
                {L('Registrar mi negocio', 'Register my business')}
              </button>
              <a href="#como" className="cursor-pointer rounded-[13px] border border-white/30 bg-white/10 px-6 py-[15px] text-[13.5px] font-extrabold text-white">
                {L('Ver cómo funciona', 'See how it works')}
              </a>
            </div>
            <p className="mt-4 text-[11.5px] font-bold text-white/70">
              {bizCount != null
                ? L(`Gratis para empezar · sin contratos · ${compact(bizCount)} negocios ya están aquí`, `Free to start · no contracts · ${compact(bizCount)} businesses already here`)
                : L('Gratis para empezar · sin contratos', 'Free to start · no contracts')}
            </p>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 145px), 1fr))', gap: 11 }}>
            {[
              { Icon: ShieldCheck, t: ['Perfil verificado', 'Verified profile'], b: ['Insignia morada y prioridad en búsqueda', 'Purple badge and search priority'] },
              { Icon: Utensils, t: ['Menú y pedidos', 'Menu & orders'], b: ['Cobra en línea, entrega o recoge', 'Charge online, deliver or pick up'] },
              { Icon: Calendar, t: ['Citas y agenda', 'Bookings & calendar'], b: ['Recordatorios automáticos', 'Automatic reminders'] },
              { Icon: Package, t: ['Boletos y rentas', 'Tickets & rentals'], b: ['QR, depósitos y devoluciones', 'QR, deposits and returns'] },
              { Icon: CreditCard, t: ['Cobros protegidos', 'Protected payments'], b: ['Tarjeta, efectivo y facturas', 'Card, cash and invoices'] },
              { Icon: BarChart, t: ['Analíticas claras', 'Clear analytics'], b: ['Vistas, clientes y ventas', 'Views, customers and sales'] },
            ].map((p) => (
              <div key={p.t[0]} className="rounded-[15px] border border-white/20 bg-white/[.13] p-3.5">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-white/20">
                  <p.Icon size={15} className="text-white" />
                </span>
                <span className="mt-2.5 block text-[12.5px] font-extrabold text-white">{L(p.t[0], p.t[1])}</span>
                <span className="block text-[10.5px] font-medium leading-[1.45] text-white/70">{L(p.b[0], p.b[1])}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIOS — solo si son REALES ═══════ */}
      {testimonials.length > 0 && (
        <section style={{ paddingTop: 'clamp(44px, 7vw, 88px)' }}>
          <div style={sectionStyle}>
            <h2 className="text-ink" style={h2}>{L('Lo que dice la comunidad', 'What the community says')}</h2>
          </div>
          <div className="no-scrollbar mt-5 flex overflow-x-auto" style={{ gap: 'clamp(11px, 1.2vw, 16px)', paddingInline: RAIL_PAD, scrollSnapType: 'x mandatory' }}>
            {testimonials.map((t, i) => (
              <div key={t.id} className="flex-none rounded-card border border-hair bg-white"
                   style={{ flexBasis: 'clamp(268px, 84vw, 430px)', padding: 'clamp(18px, 2vw, 24px)', boxShadow: '0 6px 18px rgba(60,50,110,.05)', scrollSnapAlign: 'start' }}>
                <span className="block text-[13px] font-extrabold text-amber" style={{ letterSpacing: '.08em' }}>★★★★★</span>
                <p className="mt-3 font-medium leading-[1.65] text-ink-soft" style={{ fontSize: 'clamp(13.5px, 1.4vw, 15px)', textWrap: 'pretty' }}>
                  “{(lang === 'es' ? t.body_es : t.body_en) || t.body_es || t.body_en}”
                </p>
                <div className="mt-4 flex items-center gap-2.5 border-t border-hair pt-3.5">
                  <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] text-[12px] font-extrabold text-white"
                        style={{ background: ['#7B61FF', '#D6336C', '#1F9D57'][i % 3] }}>
                    {t.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-extrabold text-ink">{t.author}</span>
                    <span className="block truncate text-[11px] font-semibold text-muted-2">{L('Sobre', 'On')} {t.biz_name}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════ PIE ═══════ */}
      <footer className="bg-night" style={{ marginTop: 'clamp(44px, 7vw, 88px)' }}>
        <div className="grid" style={{ ...sectionStyle, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 'clamp(24px, 3vw, 40px)', paddingTop: 'clamp(36px, 5vw, 60px)', paddingBottom: 'clamp(28px, 3vw, 40px)' }}>
          <div style={{ gridColumn: '1/-1', maxWidth: 360 }}>
            <Brand size="21px" />
            <p className="mt-3 text-[12.5px] font-medium leading-[1.6] text-white/50">
              {L(`La plataforma de la comunidad latina de ${cityShort}. Hecha por nosotros, para nosotros.`,
                 `The platform for the Latino community of ${cityShort}. Made by us, for us.`)}
            </p>
          </div>
          {[
            { h: ['Explorar', 'Explore'], items: [[L('Restaurantes', 'Restaurants'), '/negocios/'], [L('Servicios', 'Services'), '/negocios/'], [L('Eventos', 'Events'), '/eventos/'], [L('Comunidad', 'Community'), '/comunidad/']] as [string, string][] },
            { h: ['Mercado', 'Marketplace'], items: [[L('Bienes Raíces', 'Real Estate'), '/bienes-raices/'], [L('Autos', 'Autos'), '/autos/'], [L('Empleos', 'Jobs'), '/trabajos/'], [L('Transporte', 'Transport'), '/transporte/']] as [string, string][] },
            { h: ['Negocios', 'Business'], items: [[L('Registrar mi negocio', 'Register my business'), '/negocio/publicar/'], [L('Mi panel', 'My dashboard'), '/negocio/']] as [string, string][] },
            { h: ['Compañía', 'Company'], items: [[L('Privacidad', 'Privacy'), '/privacidad/'], [L('Términos', 'Terms'), '/terminos/']] as [string, string][] },
          ].map((col) => (
            <div key={col.h[0]}>
              <p className="mb-3 text-[10px] font-extrabold uppercase text-white/40" style={{ letterSpacing: '.12em' }}>{L(col.h[0], col.h[1])}</p>
              <div className="flex flex-col gap-2.5">
                {col.items.map(([label, path]) => (
                  <button key={label} onClick={() => go(path)} className="cursor-pointer text-left text-[12.5px] font-semibold text-white/65 transition-colors hover:text-white">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2"
             style={{ ...sectionStyle, borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 16, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
          <span className="text-[11.5px] font-medium text-white/40">
            © {new Date().getFullYear()} To&rsquo;Latino. {L('Todos los derechos reservados.', 'All rights reserved.')}
          </span>
          <span className="text-[11.5px] font-semibold text-white/40">{L(`Hecho con orgullo en ${app.city}`, `Made with pride in ${app.city}`)}</span>
        </div>
        <div className="h-[84px] md:hidden" aria-hidden />
      </footer>

      {/* ═══════ BARRA DE ACCIÓN MÓVIL ═══════ */}
      <div className="fixed inset-x-0 bottom-0 z-[45] flex gap-2.5 border-t border-white/10 md:hidden"
           style={{ background: 'rgba(18,15,32,.9)', backdropFilter: 'blur(20px)', padding: '10px 14px calc(10px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-btn-lg border border-white/20 bg-white/10 py-3.5 text-[13px] font-extrabold text-white">
          <Search size={16} /> {L('Buscar', 'Search')}
        </button>
        <button onClick={() => openSignup('user')}
                className="cursor-pointer rounded-btn-lg bg-primary py-3.5 text-[13px] font-extrabold text-white"
                style={{ flex: 1.15, boxShadow: '0 10px 24px rgba(123,97,255,.4)' }}>
          {L('Crear cuenta', 'Sign up')}
        </button>
      </div>

      {/* ═══════ MENÚ MÓVIL ═══════ */}
      {menu && (
        <div className="tl-menu fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-night" style={{ padding: GUTTER }}>
          <span aria-hidden className="pointer-events-none absolute" style={{ top: '-20%', right: '-20%', width: 'min(560px, 90vw)', height: 'min(560px, 90vw)', background: 'radial-gradient(circle, rgba(123,97,255,.28), transparent 66%)' }} />
          <div className="relative flex items-center justify-between" style={{ height: 'clamp(40px, 8vw, 48px)' }}>
            <Brand size="21px" />
            <button onClick={() => setMenu(false)} aria-label={L('Cerrar', 'Close')}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-btn border border-white/15 bg-white/10">
              <X size={16} stroke={2.6} className="text-white" />
            </button>
          </div>
          <nav className="relative mt-7 flex flex-col">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} onClick={() => setMenu(false)}
                 className="border-b border-white/10 py-[11px] font-extrabold text-white"
                 style={{ fontSize: 'clamp(26px, 8vw, 34px)', letterSpacing: '-.035em' }}>
                {L(n.es, n.en)}
              </a>
            ))}
          </nav>
          <div className="relative mt-auto flex flex-col gap-2.5 pt-8">
            <button onClick={() => { setMenu(false); openSignup('user'); }}
                    className="w-full cursor-pointer rounded-btn-lg bg-primary py-4 text-[14px] font-extrabold text-white">
              {L('Crear cuenta', 'Sign up')}
            </button>
            <button onClick={() => { setMenu(false); go('/entrar/'); }}
                    className="w-full cursor-pointer rounded-btn-lg border border-white/20 bg-white/[.06] py-4 text-[14px] font-extrabold text-white">
              {L('Iniciar sesión', 'Log in')}
            </button>
            <div className="mt-2 flex items-center gap-3 text-[11.5px] font-bold text-white/40">
              <span>{L('Idioma', 'Language')}</span>
              <div className="flex items-center rounded-full border border-white/10 bg-white/10 p-[3px]">
                {(['es', 'en'] as const).map((l) => (
                  <button key={l} onClick={() => setLang(l)}
                          className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-extrabold uppercase ${lang === l ? 'bg-primary text-white' : 'text-white/60'}`}>{l}</button>
                ))}
              </div>
              <span className="ml-auto truncate">{app.city}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TOAST ═══════ */}
      {toast && (
        <div role="status" className="tl-pop fixed left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-[13px] bg-ink px-5 py-3.5 text-[12.5px] font-extrabold text-white"
             style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))', boxShadow: '0 18px 44px rgba(28,24,46,.5)', maxWidth: 'calc(100vw - 32px)' }}>
          <Check size={15} className="text-mint" /> {toast}
        </div>
      )}

      <CityModal />

      <style jsx global>{`
        html { scroll-behavior: smooth; scroll-padding-top: 80px; }
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .tl-cat { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .tl-cat:hover { transform: translateY(-3px); border-color: rgba(123,97,255,.36); box-shadow: 0 14px 30px rgba(60,50,110,.13); }
        .tl-biz { transition: box-shadow .18s ease; }
        .tl-biz:hover { box-shadow: 0 18px 36px rgba(60,50,110,.14); }
        .tl-evt { transition: border-color .18s ease; }
        .tl-evt:hover { border-color: rgba(244,183,64,.45); }
        .tl-row { transition: border-color .18s ease, background .18s ease; }
        .tl-row:hover { border-color: rgba(123,97,255,.3); background: #FBFAFE; }
        @keyframes tlroll {
          0%,12% { transform: translateY(0) }
          16.6%,28.6% { transform: translateY(-1.3em) }
          33.3%,45.3% { transform: translateY(-2.6em) }
          50%,62% { transform: translateY(-3.9em) }
          66.6%,78.6% { transform: translateY(-5.2em) }
          83.3%,95.3% { transform: translateY(-6.5em) }
          100% { transform: translateY(-7.8em) }
        }
        .tl-roll { animation: tlroll 14s cubic-bezier(.76,0,.24,1) infinite; }
        @keyframes tlp { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
        .tl-pulse { animation: tlp 1.8s ease-in-out infinite; }
        @keyframes tlbob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(7px) } }
        .tl-bob { animation: tlbob 2.6s ease-in-out infinite; }
        @keyframes tlmenu { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: none } }
        .tl-menu { animation: tlmenu .22s ease; }
        @keyframes tlpop { from { opacity: 0; transform: translate(-50%, 10px) } to { opacity: 1; transform: translate(-50%, 0) } }
        .tl-pop { animation: tlpop .22s ease; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .tl-roll, .tl-pulse, .tl-bob, .tl-menu, .tl-pop { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
