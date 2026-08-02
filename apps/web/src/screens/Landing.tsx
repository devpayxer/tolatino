'use client';

// Bienvenida (`/`) — landing pública. Handoff "ToLatino — Home Page (public
// landing)", variante CONTENIDA (2026-07-29, el bundle correcto: el primero que
// llegó era la variante full-bleed y se descartó).
//
// Estructura: contenedor de 1280px centrado sobre #FBFAFE, barra superior CLARA
// y pegajosa, hero blanco centrado, y luego rejillas (no rieles). Tres saltos
// responsive: ≤1040, ≤760, ≤560.
//
// Dos reglas gobiernan este archivo:
//
// 1. El handoff manda en lo VISUAL (regla #2).
// 2. Los DATOS son reales (regla #8). El handoff avisa que sus negocios,
//    listados y testimonios son "representative sample data". Publicarlos sería
//    repetir lo que se limpió el 2026-07-29 — y en la página más vista, con
//    testimonios de personas inventadas, que es lo más dañino para la confianza.
//    Aquí todo sale de la base: negocios y eventos de `useLiveData`, conteos /
//    testimonios / mercado de la migración 0131. Sin datos, la sección se oculta
//    o muestra un vacío honesto con invitación a publicar.
//
// HUECOS DEL PROTOTIPO QUE EL PROPIO HANDOFF PIDE CERRAR (§Accessibility) y que
// aquí quedan cerrados:
//   · Menú móvil — el handoff lo llama "the single biggest gap": bajo 1040px sus
//     seis enlaces desaparecían sin reemplazo. Aquí hay hoja a pantalla completa.
//   · `scroll-padding-top` para que la barra pegajosa no tape los anclajes.
//   · Botones y enlaces REALES (no `<div onClick>`), con nombres accesibles.
//   · Contraste: se usa #8A86A0 en vez de #B7B0CE, y blanco al 60% en la tarjeta
//     oscura, como recomienda el propio handoff.
//   · Anillos de foco visibles, `prefers-reduced-motion`, y la calificación con
//     alternativa textual en vez de "★★★★★" suelto.
//
// Lo que queda APAGADO a propósito: el bloque de descarga de app. Sus botones de
// App Store y Google Play no llevan a ningún lado porque las apps no existen —
// un estado roto publicado como final (regla #8). Anotado en LAUNCH-CHECKLIST.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconBriefcase as Briefcase, IconCalendar as Calendar, IconCar as Car,
  IconChartBar as BarChart, IconCheck as Check, IconCreditCard as CreditCard,
  IconGlobe as Globe, IconHome as HomeIcon, IconMapPin as MapPin,
  IconMenu2 as Menu, IconMessageCircle as MessageSquare, IconPackage as Package,
  IconSearch as Search, IconShieldCheck as ShieldCheck, IconStar as Star,
  IconToolsKitchen2 as Utensils, IconTruck as Truck, IconUsers as Users,
  IconTool as Wrench, IconX as X,
} from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useLiveData } from '@/lib/live';
import { useLandingData, compact, money } from '@/lib/landing';
import { CityModal } from '@/components/CityModal';
import { tile } from '@/lib/tiles';

const SHOW_APP_SECTION = false; // sin apps publicadas, el bloque no se muestra

type Vertical = 'all' | 'food' | 'serv' | 'evt' | 'rent' | 're' | 'auto' | 'job';

export function LandingScreen() {
  const { L, lang, setLang } = useLang();
  const app = useApp();
  const router = useRouter();
  const live = useLiveData();
  const { stats, testimonials, market } = useLandingData();

  const [tab, setTab] = useState<Vertical>('all');
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const toastT = useRef<number | undefined>(undefined);

  const flash = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(''), 2000);
  }, []);
  useEffect(() => () => window.clearTimeout(toastT.current), []);

  // Bloquear el scroll del cuerpo con el menú abierto, y cerrarlo con Escape.
  useEffect(() => {
    if (!menu) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [menu]);

  // Búsqueda: reutiliza la búsqueda GLOBAL que ya funciona (`app.setSearch` +
  // ruta del vertical). No se inventa una ruta /buscar inexistente: cada
  // pantalla de la app ya filtra por `app.search`.
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
    all: ['Busca negocios, comida, eventos, casas, autos o empleos…', 'Search businesses, food, events, homes, autos or jobs…'],
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
      { es: 'Eventos', en: 'Events', n: stats?.events_week ?? null, unit: ['esta semana', 'this week'], color: '#B8860B', bg: 'rgba(244,183,64,.16)', glow: 'rgba(244,183,64,.09)', Icon: Calendar, path: '/eventos/' },
      { es: 'Renta', en: 'Rentals', n: sum('Party', 'Sports'), unit: ['negocios', 'places'], color: '#E8954A', bg: 'rgba(232,149,74,.14)', glow: 'rgba(232,149,74,.08)', Icon: Package, path: '/negocios/' },
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
    { id: 'para-negocios', es: 'Para negocios', en: 'For business' },
  ];

  // Marca sobre claro (ink + morado), como pide esta variante.
  const Brand = ({ size = 23 }: { size?: number }) => (
    <span className="flex items-baseline font-extrabold" style={{ fontSize: size, letterSpacing: '-.03em' }}>
      <span className="text-ink">To</span>
      <span className="text-primary">Latino</span>
      <i className="ml-1 inline-block h-1.5 w-1.5 rotate-45 bg-amber" aria-hidden />
    </span>
  );

  // Contenedor de 1280px con los gutters de los tres saltos.
  const wrap = 'mx-auto w-full max-w-[1280px] px-4 min-[561px]:px-[22px] min-[1041px]:px-[30px]';
  const secTop = 'pt-[54px]';
  const h2cls = 'text-[21px] min-[561px]:text-[24px] min-[761px]:text-[30px] font-extrabold text-ink tracking-[-.03em]';

  const LangPill = () => (
    <div role="group" aria-label={L('Idioma', 'Language')} className="flex flex-none items-center rounded-full bg-lilac-2 p-[3px]">
      {(['es', 'en'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                className={`tl-focus cursor-pointer rounded-full px-3 py-1.5 text-[11.5px] font-extrabold uppercase ${lang === l ? 'bg-primary text-white' : 'text-muted'}`}>
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-page">
      {/* ═══════ BARRA SUPERIOR (clara, pegajosa) ═══════ */}
      <header className="sticky top-0 z-40 border-b border-hair" style={{ background: 'rgba(251,250,254,.92)', backdropFilter: 'blur(14px)' }}>
        <div className={`${wrap} flex items-center gap-4 py-[13px]`}>
          <button onClick={() => go('/')} className="tl-focus flex-none cursor-pointer" aria-label="To'Latino"><Brand /></button>

          <nav aria-label={L('Secciones', 'Sections')} className="no-scrollbar hidden min-w-0 flex-1 gap-0.5 overflow-x-auto min-[1041px]:flex">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`}
                 className="tl-focus whitespace-nowrap rounded-[10px] px-3 py-[9px] text-[13px] font-bold text-ink-soft transition-colors hover:bg-lilac-2">
                {L(n.es, n.en)}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2 min-[1041px]:ml-0">
            {/* Bajo 561px la pastilla de idioma se oculta AQUÍ para que quepan la
                marca, "Crear cuenta" y el botón de menú (si no, el menú se salía
                de la pantalla a 390px). El idioma sigue disponible dentro del
                menú móvil, que es donde se busca en un teléfono. */}
            <span className="hidden min-[561px]:block"><LangPill /></span>
            <button onClick={() => go('/entrar/')} className="tl-focus hidden cursor-pointer px-1 py-[9px] text-[13px] font-extrabold text-ink-soft min-[561px]:block">
              {L('Iniciar sesión', 'Log in')}
            </button>
            <button onClick={() => openSignup('user')}
                    className="tl-focus flex-none cursor-pointer rounded-btn bg-primary px-[18px] py-[11px] text-[13px] font-extrabold text-white"
                    style={{ boxShadow: '0 10px 22px rgba(123,97,255,.32)' }}>
              {L('Crear cuenta', 'Sign up')}
            </button>
            {/* Menú móvil: el handoff lo pide como su hueco más grande. */}
            <button onClick={() => setMenu(true)} aria-label={L('Abrir menú', 'Open menu')}
                    className="tl-focus flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-btn border border-hair bg-white min-[1041px]:hidden">
              <Menu size={18} stroke={2.4} className="text-ink" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══════ HERO (blanco, centrado) ═══════ */}
      <section className="relative overflow-hidden border-b border-hair bg-white">
        <span aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2"
              style={{ top: -320, width: 1100, height: 640, background: 'radial-gradient(ellipse at center, rgba(123,97,255,.13), transparent 66%)' }} />
        <span aria-hidden className="pointer-events-none absolute"
              style={{ top: 40, right: -120, width: 420, height: 420, background: 'radial-gradient(circle, rgba(244,183,64,.12), transparent 68%)' }} />

        <div className={`${wrap} relative pb-11 pt-14 text-center`}>
          <span className="mb-[22px] inline-flex items-center gap-2 rounded-full bg-lilac-2 px-[14px] py-[7px]" style={{ border: '1px solid rgba(123,97,255,.2)' }}>
            <i className="tl-pulse inline-block h-[7px] w-[7px] rounded-full bg-green" aria-hidden />
            <span className="text-[11.5px] font-bold" style={{ color: '#4A3B8A' }}>
              {bizCount != null
                ? L(`Ya estamos en vivo en ${cityShort} · ${compact(bizCount)} negocios latinos`, `Now live in ${cityShort} · ${compact(bizCount)} Latino businesses`)
                : L(`Ya estamos en vivo en ${cityShort}`, `Now live in ${cityShort}`)}
            </span>
          </span>

          <h1 className="mx-auto max-w-[880px] text-[30px] font-extrabold leading-[1.05] tracking-[-.035em] text-ink min-[561px]:text-[36px] min-[761px]:text-[44px] min-[1041px]:text-[56px]" style={{ textWrap: 'balance' }}>
            {L(`Todo lo latino de ${cityShort},`, `Everything Latino in ${cityShort},`)}{' '}
            <span style={{ background: 'linear-gradient(100deg, #7B61FF, #D6336C 60%, #F4B740)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {L('en un solo lugar.', 'in one place.')}
            </span>
          </h1>

          {/* El handoff avisa que su ES y su EN dicen cosas distintas y pide
              alinearlos. Se toma la voz ES (con el "to'" coloquial, que es marca
              de la casa) y se traduce fiel al inglés. */}
          <p className="mx-auto mt-5 max-w-[600px] text-[17px] font-medium leading-[1.6] text-ink-2" style={{ textWrap: 'pretty' }}>
            {L(`Encuentra to' los negocios, productos y servicios latinos de ${cityShort}.`,
               `Find all the Latino businesses, products and services in ${cityShort}.`)}
          </p>

          <div className="mx-auto mt-8 max-w-[820px]">
            <div className="no-scrollbar flex justify-start gap-[7px] overflow-x-auto pb-3 min-[761px]:justify-center">
              {VERTICALS.map(({ k, es, en, Icon }) => {
                const on = tab === k;
                return (
                  <button key={k} onClick={() => setTab(k)} aria-pressed={on}
                          className={`tl-focus flex flex-none cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full px-[15px] py-[9px] text-[12.5px] font-extrabold ${on ? 'border border-primary bg-primary text-white' : 'border border-hair bg-white text-ink-soft'}`}>
                    <Icon size={14} stroke={2.2} className={on ? 'text-white' : 'text-muted'} />
                    {L(es, en)}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 rounded-[15px] border-[1.5px] border-hair bg-white p-[11px] min-[561px]:rounded-[18px] min-[561px]:py-[9px] min-[561px]:pl-[18px] min-[561px]:pr-[9px]"
                 style={{ boxShadow: '0 16px 40px rgba(60,50,110,.1)' }}>
              <Search size={19} className="flex-none text-muted-2" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                     onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                     placeholder={L(PLACEHOLDER[tab][0], PLACEHOLDER[tab][1])}
                     aria-label={L('Buscar', 'Search')}
                     className="tl-focus min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:text-muted-2" />
              <span className="hidden h-6 w-px flex-none bg-hair min-[561px]:block" aria-hidden />
              <button onClick={() => app.setCityOpen(true)} className="tl-focus flex flex-none cursor-pointer items-center gap-1.5">
                <MapPin size={15} className="text-primary" aria-hidden />
                <span className="text-[13px] font-bold text-ink-soft">{app.city}</span>
              </button>
              <button onClick={submitSearch}
                      className="tl-focus w-full flex-none cursor-pointer rounded-[13px] bg-primary px-[26px] py-[13px] text-[14px] font-extrabold text-white min-[561px]:w-auto min-[561px]:py-[14px]"
                      style={{ boxShadow: '0 10px 22px rgba(123,97,255,.34)' }}>
                {L('Buscar', 'Search')}
              </button>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11.5px] font-bold text-muted-2">{L('Popular:', 'Popular:')}</span>
              {POPULAR[tab][lang === 'es' ? 0 : 1].map((t) => (
                <button key={t} onClick={() => setQuery(t)}
                        className="tl-focus cursor-pointer rounded-full border border-hair bg-white px-3 py-1.5 text-[11.5px] font-bold text-ink-soft">
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Fila de confianza — cifras REALES; sin dato, guion */}
          <div className="mt-9 grid grid-cols-2 gap-3 min-[561px]:flex min-[561px]:flex-wrap min-[561px]:justify-center min-[561px]:gap-4 min-[761px]:gap-[26px]">
            {[
              { v: compact(stats?.verified), es: 'Negocios verificados', en: 'Verified businesses', Icon: ShieldCheck, c: '#1F9D57', bg: '#E3F5EA' },
              { v: compact(stats?.neighbors), es: 'Vecinos activos', en: 'Active neighbors', Icon: Users, c: '#7B61FF', bg: '#EFEBFF' },
              { v: stats?.avg_rating != null ? `${stats.avg_rating} ★` : '—', es: 'Calificación promedio', en: 'Average rating', Icon: Star, c: '#E8954A', bg: '#FCE9D6' },
              { v: 'ES / EN', es: 'Todo bilingüe', en: 'Fully bilingual', Icon: Globe, c: '#2A6CB0', bg: '#E4EEFB' },
            ].map((s) => (
              <div key={s.es} className="flex min-w-0 items-center gap-2.5 text-left">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px]" style={{ background: s.bg }}>
                  <s.Icon size={16} stroke={2.2} style={{ color: s.c }} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-extrabold text-ink">{s.v}</span>
                  <span className="block truncate text-[11px] font-semibold text-muted-2">{L(s.es, s.en)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CATEGORÍAS ═══════ */}
      <section id="explorar" className={`${wrap} ${secTop}`}>
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-3 min-[761px]:gap-5">
          <div>
            <h2 className={h2cls}>{L('Explora por categoría', 'Explore by category')}</h2>
            <p className="mt-1.5 text-[14.5px] font-medium text-ink-2">
              {L('Todo lo que necesitas, de gente que habla tu idioma.', 'Everything you need, from people who speak your language.')}
            </p>
          </div>
          <button onClick={() => openSignup('user')}
                  className="tl-focus cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white px-[18px] py-[11px] text-[12.5px] font-extrabold text-primary-dark">
            {L('Crear cuenta gratis', 'Create free account')}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 min-[561px]:grid-cols-3 min-[1041px]:grid-cols-5">
          {CATS.map((c) => (
            <button key={c.es} onClick={() => go(c.path)}
                    className="tl-cat tl-focus relative cursor-pointer overflow-hidden rounded-[19px] border border-hair bg-white p-[19px] text-left"
                    style={{ boxShadow: '0 5px 16px rgba(60,50,110,.05)' }}>
              <span aria-hidden className="absolute rounded-full" style={{ top: -26, right: -26, width: 96, height: 96, background: c.glow }} />
              <span className="relative flex h-[46px] w-[46px] items-center justify-center rounded-tile" style={{ background: c.bg }}>
                <c.Icon size={22} stroke={2} style={{ color: c.color }} aria-hidden />
              </span>
              <span className="relative mt-3.5 block text-[14.5px] font-extrabold tracking-[-.01em] text-ink">{L(c.es, c.en)}</span>
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
      <section id="negocios" className={`${wrap} ${secTop}`}>
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-3 min-[761px]:gap-5">
          <div>
            <span className="flex w-fit items-center gap-1.5 rounded-full bg-green-bg px-[11px] py-[5px]">
              <i className="inline-block h-1.5 w-1.5 rounded-full bg-green" aria-hidden />
              <span className="text-[10px] font-extrabold uppercase tracking-[.09em] text-green-dark">{L('Cerca de ti', 'Near you')}</span>
            </span>
            <h2 className={`${h2cls} mt-2.5`}>{L(`Negocios destacados en ${cityShort}`, `Featured businesses in ${cityShort}`)}</h2>
            <p className="mt-1.5 text-[14.5px] font-medium text-ink-2">
              {L('Verificados, con reseñas reales de la comunidad.', 'Verified, with real reviews from the community.')}
            </p>
          </div>
          <button onClick={() => go('/negocios/')} className="tl-focus cursor-pointer text-[12.5px] font-extrabold text-primary-dark">
            {bizCount != null ? L(`Ver los ${compact(bizCount)} →`, `See all ${compact(bizCount)} →`) : L('Ver negocios →', 'See businesses →')}
          </button>
        </div>

        {live.businesses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 min-[561px]:grid-cols-2 min-[1041px]:grid-cols-4">
            {live.businesses.slice(0, 8).map((b) => (
              <button key={b.slug} onClick={() => go(`/negocios/${b.slug}/`)}
                      className="tl-biz tl-focus cursor-pointer overflow-hidden rounded-card border border-hair bg-white text-left"
                      style={{ boxShadow: '0 6px 18px rgba(60,50,110,.06)' }}>
                <span className="relative block h-[132px]" style={{ background: tile(b.t[0], b.t[1]) }}>
                  {b.open && (
                    <span className="absolute bottom-[11px] left-[11px] flex items-center gap-1.5 rounded-lg px-2.5 py-[5px]" style={{ background: 'rgba(255,255,255,.94)' }}>
                      <i className="inline-block h-1.5 w-1.5 rounded-full bg-green" aria-hidden />
                      <span className="text-[9.5px] font-extrabold text-green-dark">{L('Abierto ahora', 'Open now')}</span>
                    </span>
                  )}
                </span>
                <span className="block px-[15px] pb-[15px] pt-3.5">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[14.5px] font-extrabold tracking-[-.01em] text-ink">{b.name}</span>
                    {b.verified && (
                      <span className="flex h-[15px] w-[15px] flex-none items-center justify-center rounded-full bg-primary" title={L('Verificado', 'Verified')}>
                        <Check size={9} stroke={3.6} className="text-white" />
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] font-semibold text-muted-2">
                    {[lang === 'es' ? b.specEs : b.specEn, b.city].filter(Boolean).join(' · ')}
                  </span>
                  <span className="mt-[11px] flex items-center gap-1.5 border-t border-hair pt-[11px]">
                    <Star size={12} className="fill-amber text-amber" aria-hidden />
                    <span className="text-[12px] font-extrabold text-ink">{b.rating}</span>
                    <span className="text-[11px] font-semibold text-muted-2">({b.reviews})</span>
                    {b.dist && <span className="ml-auto text-[11px] font-bold text-ink-soft">{b.dist}</span>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-hair bg-white p-8 text-center">
            <p className="text-[14px] font-extrabold text-ink">{L('Aún no hay negocios cerca de ti', 'No businesses near you yet')}</p>
            <p className="mt-1 text-[12.5px] font-medium text-muted">{L('Sé el primero en publicar el tuyo — es gratis.', 'Be the first to publish yours — it’s free.')}</p>
            <button onClick={() => openSignup('biz')} className="tl-focus mt-4 cursor-pointer rounded-btn bg-primary px-5 py-3 text-[13px] font-extrabold text-white">
              {L('Publicar mi negocio', 'Publish my business')}
            </button>
          </div>
        )}
      </section>

      {/* ═══════ EVENTOS — tarjeta oscura (reales) ═══════ */}
      <section id="eventos" className={`${wrap} ${secTop}`}>
        <div className="relative overflow-hidden rounded-[26px] p-6 min-[761px]:p-[34px]" style={{ background: 'linear-gradient(150deg, #1E1B2E, #2A2440)' }}>
          <span aria-hidden className="pointer-events-none absolute" style={{ top: -90, right: -60, width: 340, height: 340, background: 'radial-gradient(circle, rgba(214,51,108,.28), transparent 68%)' }} />
          <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="w-fit rounded-full px-[11px] py-[5px] text-[10px] font-extrabold uppercase tracking-[.09em] text-amber" style={{ background: 'rgba(244,183,64,.16)' }}>
                {L('Este fin de semana', 'This weekend')}
              </span>
              <h2 className="mt-2.5 text-[21px] font-extrabold tracking-[-.03em] text-white min-[561px]:text-[24px] min-[761px]:text-[30px]">
                {L('Eventos de tu comunidad', 'Events in your community')}
              </h2>
              <p className="mt-1.5 text-[14px] font-medium" style={{ color: 'rgba(255,255,255,.6)' }}>
                {L('Bailes, ferias y celebraciones — con boletos en la app.', 'Dances, fairs and celebrations — with tickets in the app.')}
              </p>
            </div>
            <button onClick={() => go('/eventos/')} className="tl-focus cursor-pointer rounded-btn border border-white/20 bg-white/10 px-[18px] py-[11px] text-[12.5px] font-extrabold text-white">
              {L('Ver todos los eventos', 'See all events')}
            </button>
          </div>

          {live.events.length > 0 ? (
            <div className="relative grid grid-cols-1 gap-[15px] min-[561px]:grid-cols-2 min-[761px]:grid-cols-3">
              {live.events.slice(0, 6).map((e, i) => (
                <button key={`${e.tEs}-${i}`} onClick={() => go('/eventos/')}
                        className="tl-evt tl-focus cursor-pointer overflow-hidden rounded-[19px] border border-white/10 bg-white/[.06] text-left">
                  <span className="relative block h-[112px]" style={{ background: tile(e.t[0], e.t[1]) }}>
                    <span className="absolute left-[11px] top-[11px] rounded-[9px] bg-white px-[9px] py-[5px] text-center">
                      <span className="block text-[8.5px] font-extrabold uppercase tracking-[.06em] text-rose">{e.dEs}</span>
                      <span className="block text-[15px] font-extrabold leading-none text-ink">{e.day}</span>
                    </span>
                  </span>
                  <span className="block px-3.5 pb-3.5 pt-[13px]">
                    <span className="block text-[14px] font-extrabold leading-[1.25] text-white">{L(e.tEs, e.tEn)}</span>
                    <span className="mt-1 block truncate text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,.6)' }}>
                      {[L(e.lEs, e.lEn), L(e.timeEs, e.timeEn)].filter(Boolean).join(' · ')}
                    </span>
                    <span className="mt-[11px] flex items-center">
                      <span className={`text-[13px] font-extrabold ${e.free ? 'text-mint' : 'text-amber'}`}>
                        {e.free ? L('Gratis', 'Free') : (e.price ?? '')}
                      </span>
                      {e.going != null && (
                        <span className="ml-auto text-[10.5px] font-bold" style={{ color: 'rgba(255,255,255,.6)' }}>
                          {compact(e.going)} {L('van', 'going')}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="relative rounded-card border border-white/10 bg-white/[.06] p-8 text-center">
              <p className="text-[14px] font-extrabold text-white">{L('Todavía no hay eventos cerca', 'No events near you yet')}</p>
              <p className="mt-1 text-[12.5px] font-medium" style={{ color: 'rgba(255,255,255,.6)' }}>
                {L('¿Organizas algo? Publícalo y vende boletos.', 'Organizing something? Publish it and sell tickets.')}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ═══════ MERCADO (reales) ═══════ */}
      <section id="mercado" className={`${wrap} ${secTop}`}>
        <div className="mx-auto mb-[26px] max-w-[600px] text-center">
          <h2 className={h2cls}>{L('Un mercado completo', 'A complete marketplace')}</h2>
          <p className="mt-1.5 text-[14.5px] font-medium text-ink-2">
            {L('Casas, autos y empleos de la comunidad — sin intermediarios que no te entienden.',
               'Homes, autos and jobs from the community — without middlemen who don’t get you.')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[561px]:grid-cols-2 min-[761px]:grid-cols-3">
          {([
            { key: 'homes' as const, Icon: HomeIcon, color: '#2A6CB0', bg: 'rgba(42,108,176,.12)', es: 'Casas y rentas', en: 'Homes & rentals', n: stats?.properties, unit: ['propiedades', 'listings'], cta: ['Ver propiedades', 'Browse homes'], path: '/bienes-raices/', money: true },
            { key: 'autos' as const, Icon: Car, color: '#1F9D57', bg: 'rgba(31,157,87,.12)', es: 'Autos y trocas', en: 'Autos & trucks', n: stats?.vehicles, unit: ['vehículos', 'vehicles'], cta: ['Ver autos', 'Browse autos'], path: '/autos/', money: true },
            { key: 'jobs' as const, Icon: Briefcase, color: '#7B61FF', bg: 'rgba(123,97,255,.13)', es: 'Empleos cerca', en: 'Jobs near you', n: stats?.jobs, unit: ['vacantes', 'openings'], cta: ['Ver empleos', 'Browse jobs'], path: '/trabajos/', money: false },
          ]).map((col) => {
            const rows = market[col.key];
            return (
              <div key={col.key} className="rounded-[22px] border border-hair bg-white p-5" style={{ boxShadow: '0 6px 18px rgba(60,50,110,.05)' }}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn" style={{ background: col.bg }}>
                    <col.Icon size={20} stroke={2} style={{ color: col.color }} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15.5px] font-extrabold tracking-[-.01em] text-ink">{L(col.es, col.en)}</span>
                    {col.n != null && (
                      <span className="block text-[11px] font-semibold text-muted-2">{col.n.toLocaleString('en-US')} {L(col.unit[0], col.unit[1])}</span>
                    )}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {rows.length > 0 ? rows.map((r, i) => (
                    <button key={r.slug ?? r.id ?? i} onClick={() => go(col.path)}
                            className="tl-row tl-focus flex cursor-pointer items-center gap-[11px] rounded-tile border border-hair p-[11px] text-left">
                      <span className="h-[46px] w-[46px] flex-none rounded-[11px]" style={{ background: tile('#EFEBFF', '#E5DEF9') }} aria-hidden />
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
                        className="tl-focus mt-3.5 w-full cursor-pointer rounded-btn border-[1.5px] border-lilac-line py-[11px] text-[12px] font-extrabold text-primary-dark">
                  {L(col.cta[0], col.cta[1])}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════ CÓMO FUNCIONA ═══════ */}
      <section id="como" className={`${wrap} pt-[60px]`}>
        <div className="mx-auto mb-8 max-w-[600px] text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-[.15em] text-primary">{L('Cómo funciona', 'How it works')}</span>
          <h2 className="mt-2.5 text-[22px] font-extrabold tracking-[-.03em] text-ink min-[761px]:text-[32px]">
            {L('Tres pasos y ya', 'Three steps and done')}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[561px]:grid-cols-2 min-[761px]:grid-cols-3">
          {[
            { t: ['Crea tu cuenta gratis', 'Create your free account'], b: ['Con tu correo. No pedimos tarjeta ni papeles.', 'With your email. No card, no paperwork.'] },
            { t: ['Busca en tu idioma', 'Search in your language'], b: ['Filtra por barrio, precio y horario. Todo verificado y con reseñas.', 'Filter by neighborhood, price and hours. All verified and reviewed.'] },
            { t: ['Pide, agenda o aplica', 'Order, book or apply'], b: ['Paga protegido en la app o contacta directo por chat y WhatsApp.', 'Pay protected in the app or contact directly by chat and WhatsApp.'] },
          ].map((s, i) => (
            <div key={i} className="rounded-card border border-hair bg-white p-6 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-tile bg-lilac-2 text-[16px] font-extrabold text-primary-dark">{i + 1}</span>
              <h3 className="mt-3.5 text-[16px] font-extrabold tracking-[-.01em] text-ink">{L(s.t[0], s.t[1])}</h3>
              <p className="mt-2 text-[13px] font-medium leading-[1.6] text-ink-2">{L(s.b[0], s.b[1])}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ PARA NEGOCIOS — tarjeta morada ═══════ */}
      <section id="para-negocios" className={`${wrap} pt-[60px]`}>
        <div className="relative overflow-hidden rounded-[26px] p-6 min-[761px]:p-10" style={{ background: 'linear-gradient(140deg, #6D4DF6, #8B6BFF 55%, #B0357E)' }}>
          <span aria-hidden className="pointer-events-none absolute rounded-full" style={{ bottom: -140, left: -60, width: 400, height: 400, background: 'rgba(255,255,255,.09)' }} />
          <div className="relative grid items-center gap-7 min-[1041px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] min-[1041px]:gap-10">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[.15em]" style={{ color: 'rgba(255,255,255,.78)' }}>
                {L('Para dueños de negocio', 'For business owners')}
              </span>
              <h2 className="mt-2.5 text-[24px] font-extrabold leading-[1.15] tracking-[-.03em] text-white min-[761px]:text-[34px]">
                {L('Tu negocio completo, desde tu celular', 'Your whole business, from your phone')}
              </h2>
              <p className="mt-3 text-[14.5px] font-medium leading-[1.65]" style={{ color: 'rgba(255,255,255,.8)' }}>
                {L('Publica gratis y crece cuando quieras: menú, citas, boletos, rentas, empleados, cobros y clientes — todo en un panel en español.',
                   'List free and grow when you want: menu, bookings, tickets, rentals, staff, payments and customers — all in one Spanish dashboard.')}
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <button onClick={() => openSignup('biz')}
                        className="tl-focus cursor-pointer rounded-[13px] bg-white px-6 py-3.5 text-[13.5px] font-extrabold text-primary-dark"
                        style={{ boxShadow: '0 12px 28px rgba(20,10,50,.24)' }}>
                  {L('Registrar mi negocio', 'Register my business')}
                </button>
                <a href="#como" className="tl-focus cursor-pointer rounded-[13px] border border-white/30 bg-white/10 px-6 py-3.5 text-[13.5px] font-extrabold text-white">
                  {L('Ver cómo funciona', 'See how it works')}
                </a>
              </div>
              <p className="mt-3.5 text-[11.5px] font-bold" style={{ color: 'rgba(255,255,255,.7)' }}>
                {bizCount != null
                  ? L(`Gratis para empezar · sin contratos · ${compact(bizCount)} negocios ya están aquí`, `Free to start · no contracts · ${compact(bizCount)} businesses already here`)
                  : L('Gratis para empezar · sin contratos', 'Free to start · no contracts')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-[11px] min-[561px]:grid-cols-2">
              {[
                { Icon: ShieldCheck, t: ['Perfil verificado', 'Verified profile'], b: ['Insignia morada y prioridad en búsqueda', 'Purple badge and search priority'] },
                { Icon: Utensils, t: ['Menú y pedidos', 'Menu & orders'], b: ['Cobra en línea, entrega o recoge', 'Charge online, deliver or pick up'] },
                { Icon: Calendar, t: ['Citas y agenda', 'Bookings & calendar'], b: ['Recordatorios automáticos', 'Automatic reminders'] },
                { Icon: Package, t: ['Boletos y rentas', 'Tickets & rentals'], b: ['QR, depósitos y devoluciones', 'QR, deposits and returns'] },
                { Icon: CreditCard, t: ['Cobros protegidos', 'Protected payments'], b: ['Tarjeta, efectivo y facturas', 'Card, cash and invoices'] },
                { Icon: BarChart, t: ['Analíticas claras', 'Clear analytics'], b: ['Vistas, clientes y ventas', 'Views, customers and sales'] },
              ].map((p) => (
                <div key={p.t[0]} className="rounded-[15px] border border-white/15 bg-white/[.12] p-3.5">
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-white/20">
                    <p.Icon size={15} className="text-white" aria-hidden />
                  </span>
                  <span className="mt-2.5 block text-[12.5px] font-extrabold text-white">{L(p.t[0], p.t[1])}</span>
                  <span className="block text-[10.5px] font-medium leading-[1.45]" style={{ color: 'rgba(255,255,255,.72)' }}>{L(p.b[0], p.b[1])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIOS — solo si son REALES ═══════ */}
      {testimonials.length > 0 && (
        <section className={`${wrap} pt-[60px]`}>
          <h2 className={`${h2cls} mb-7 text-center`}>{L('Lo que dice la comunidad', 'What the community says')}</h2>
          <div className="grid grid-cols-1 gap-4 min-[561px]:grid-cols-2 min-[761px]:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={t.id} className="rounded-card border border-hair bg-white p-[22px]">
                <span className="block text-[13px] font-extrabold tracking-[.08em] text-amber" aria-hidden>★★★★★</span>
                <span className="sr-only">{L(`${t.rating} de 5 estrellas`, `${t.rating} out of 5 stars`)}</span>
                <p className="mt-3 text-[14px] font-medium leading-[1.65] text-ink-soft">
                  “{(lang === 'es' ? t.body_es : t.body_en) || t.body_es || t.body_en}”
                </p>
                <div className="mt-4 flex items-center gap-2.5 border-t border-hair pt-3.5">
                  <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] text-[12px] font-extrabold text-white"
                        style={{ background: ['#7B61FF', '#D6336C', '#1F9D57'][i % 3] }} aria-hidden>
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

      {/* ═══════ PIE (claro) ═══════ */}
      <footer className="mt-16 border-t border-hair bg-white">
        <div className={`${wrap} flex flex-wrap items-start gap-8 py-10`}>
          <div className="flex-1 basis-[300px]">
            <Brand size={21} />
            <p className="mt-3 max-w-[320px] text-[12.5px] font-medium leading-[1.6] text-muted">
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
            <div key={col.h[0]} className="min-w-[132px] flex-none">
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[.11em] text-muted-2">{L(col.h[0], col.h[1])}</p>
              <div className="flex flex-col gap-2.5">
                {col.items.map(([label, path]) => (
                  <button key={label} onClick={() => go(path)}
                          className="tl-focus cursor-pointer text-left text-[12.5px] font-semibold text-ink-2 transition-colors hover:text-primary-dark">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={`${wrap} flex flex-wrap items-center justify-between gap-2 border-t border-hair py-[18px]`}>
          <span className="text-[11.5px] font-medium text-muted-2">
            © {new Date().getFullYear()} To&rsquo;Latino. {L('Todos los derechos reservados.', 'All rights reserved.')}
          </span>
          <span className="text-[11.5px] font-semibold text-muted-2">{L(`Hecho con orgullo en ${app.city}`, `Made with pride in ${app.city}`)}</span>
        </div>
      </footer>

      {/* ═══════ MENÚ MÓVIL (hueco que el handoff pide cerrar) ═══════ */}
      {menu && (
        <div role="dialog" aria-modal="true" aria-label={L('Menú', 'Menu')}
             className="tl-menu fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-white p-5">
          <div className="flex items-center justify-between">
            <Brand size={21} />
            <button onClick={() => setMenu(false)} aria-label={L('Cerrar menú', 'Close menu')}
                    className="tl-focus flex h-10 w-10 cursor-pointer items-center justify-center rounded-btn bg-app">
              <X size={16} stroke={2.6} className="text-ink" />
            </button>
          </div>
          <nav className="mt-7 flex flex-col">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} onClick={() => setMenu(false)}
                 className="tl-focus border-b border-hair py-3 text-[26px] font-extrabold tracking-[-.035em] text-ink">
                {L(n.es, n.en)}
              </a>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2.5 pt-8">
            <button onClick={() => { setMenu(false); openSignup('user'); }}
                    className="tl-focus w-full cursor-pointer rounded-btn-lg bg-primary py-4 text-[14px] font-extrabold text-white">
              {L('Crear cuenta gratis', 'Create free account')}
            </button>
            <button onClick={() => { setMenu(false); go('/entrar/'); }}
                    className="tl-focus w-full cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-4 text-[14px] font-extrabold text-primary-dark">
              {L('Iniciar sesión', 'Log in')}
            </button>
            <div className="mt-2 flex items-center gap-3 text-[11.5px] font-bold text-muted-2">
              <span>{L('Idioma', 'Language')}</span>
              <LangPill />
              <span className="ml-auto truncate">{app.city}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TOAST ═══════ */}
      {toast && (
        <div role="status" className="tl-pop fixed bottom-[26px] left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-[13px] bg-ink px-[22px] py-[13px] text-[12.5px] font-extrabold text-white"
             style={{ boxShadow: '0 18px 44px rgba(28,24,46,.4)', maxWidth: 'calc(100vw - 32px)' }}>
          <Check size={15} className="text-mint" aria-hidden /> {toast}
        </div>
      )}

      <CityModal />

      <style jsx global>{`
        html { scroll-behavior: smooth; scroll-padding-top: 72px; }
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .tl-focus:focus-visible { outline: 2px solid #7B61FF; outline-offset: 2px; border-radius: 10px; }
        .tl-cat { transition: box-shadow .18s ease, border-color .18s ease; }
        .tl-cat:hover { border-color: rgba(123,97,255,.36); box-shadow: 0 12px 28px rgba(60,50,110,.11); }
        .tl-biz { transition: box-shadow .18s ease; }
        .tl-biz:hover { box-shadow: 0 16px 34px rgba(60,50,110,.13); }
        .tl-evt { transition: border-color .18s ease; }
        .tl-evt:hover { border-color: rgba(244,183,64,.4); }
        .tl-row { transition: border-color .18s ease, background .18s ease; }
        .tl-row:hover { border-color: rgba(123,97,255,.3); background: #FBFAFE; }
        @keyframes tlp { 0%,100% { opacity: 1 } 50% { opacity: .4 } }
        .tl-pulse { animation: tlp 1.8s ease-in-out infinite; }
        @keyframes tlmenu { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: none } }
        .tl-menu { animation: tlmenu .22s ease; }
        @keyframes tlpop { from { opacity: 0; transform: translate(-50%, 10px) } to { opacity: 1; transform: translate(-50%, 0) } }
        .tl-pop { animation: tlpop .22s ease; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .tl-pulse, .tl-menu, .tl-pop { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
