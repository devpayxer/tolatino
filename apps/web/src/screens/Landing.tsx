'use client';

// Bienvenida (`/`) — portada pública.
//
// Handoff: "To'Latino — Official Home Page" (2026-08-02), que en su primera línea
// dice: «Replaces any previous To'Latino home-page handoff». Es la portada de la
// fase PRE-LANZAMIENTO: la plataforma es nueva y todavía no tiene negocios
// activos, así que la página NO presume conteos ni prueba social — vende la
// visión, deja probar una búsqueda por vertical y convierte hacia dos públicos:
// vecinos (Entrar / Regístrate) y dueños de negocio (Registrar mi negocio).
//
// Dos reglas gobiernan el archivo:
//
// 1. El handoff manda en lo VISUAL (regla #2): color, tipografía, ritmo vertical,
//    tiempos de animación y copia son finales. El ritmo del móvil se afinó en un
//    teléfono real, petición por petición, así que las medidas de ≤599px se
//    respetan al pie de la letra.
// 2. Los DATOS son reales (regla #8):
//    · Conteos: el handoff los PROHÍBE («No platform statistics appear anywhere;
//      do not add counts — deliberate pre-launch honesty»). No hay ni uno.
//    · Feed: EXCEPCIÓN consciente. Las 19 publicaciones de la tarjeta son las
//      de MUESTRA del handoff, por decisión del fundador (2026-08-02). Se llegó
//      a conectar al feed real (`posts_near`) — que es lo que pide el propio
//      handoff — pero hoy no hay publicaciones cerca y la tarjeta quedaba
//      vacía. Está anotado en LAUNCH-CHECKLIST como pendiente obligatorio
//      antes de abrir el registro al público. Ver `lib/landing.ts`.
//    · Ciudad, búsqueda, sesión y alta de negocio van a los flujos REALES de la
//      app (el handoff los marca como "not in this design").
//
// HUECOS QUE EL PROPIO HANDOFF PIDE CERRAR (§Accessibility) y aquí quedan
// cerrados: pastilla ES/EN con `role="group"` + `aria-pressed`, anillos de foco
// visibles, feed con `aria-live` que se pausa al pasar el ratón o al enfocar,
// selector de ciudad como `<button>` con nombre accesible, marquesina y capas
// decorativas con `aria-hidden`, blancos de toque de 44px, y el texto más tenue
// subido de #9A93B3 a #7E7798 como recomienda el propio documento.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArrowDown as ArrowDown, IconBriefcase as Briefcase, IconBuildingStore as Store,
  IconCalendar as Calendar, IconCar as Car, IconChartBar as BarChart,
  IconChevronDown as ChevronDown, IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight, IconCreditCard as CreditCard, IconGlobe as Globe,
  IconHome as HomeIcon, IconMapPin as MapPin, IconMessageCircle as MessageSquare,
  IconPackage as Package, IconSearch as Search, IconShieldCheck as ShieldCheck,
  IconToolsKitchen2 as Utensils, IconTool as Wrench,
} from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { FEED_SAMPLE, FEED_KIND } from '@/lib/landing';
import { CityModal } from '@/components/CityModal';
import { LogoMark } from '@/components/ui';

type Vertical = 'all' | 'food' | 'serv' | 'evt' | 'rent' | 're' | 'auto' | 'job';

// Espejo de los tokens `home`/`clay`/`ocean`/`jade` de tailwind.config.ts, para
// las filas cuyo color cambia por elemento (Tailwind no admite clases dinámicas).
const A = {
  rose: '#E11D48', roseBg: '#FFECF2',
  purple: '#C4144C', purpleBg: '#FFECF2',
  jade: '#008489', jadeBg: 'rgba(14,148,136,.1)',
  clay: '#FF7A1A', clayBg: '#FFF1E5',
  green: '#00A878', greenBg: '#E6FAF3',
  ocean: '#007FA2', oceanBg: '#DAF6FD',
} as const;

const FEED_MS = 4200; // el handoff fija 4.2 s por publicación

export function LandingScreen() {
  const { L, lang, setLang } = useLang();
  const es = lang === 'es';
  const app = useApp();
  const { user, profile } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Vertical>('all');
  const [query, setQuery] = useState('');
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const cityShort = app.cityShort || app.city;

  // ── Feed rotatorio ────────────────────────────────────────────────────────
  // Se pausa al pasar el ratón o al enfocar (§Accessibility). `idx` crece sin
  // límite y se lee con módulo: esa paridad alterna las dos animaciones gemelas
  // del handoff, su truco para repetir la entrada sin remontar la tarjeta.
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setIdx((i) => i + 1), FEED_MS);
    return () => window.clearInterval(t);
  }, [paused]);

  const post = FEED_SAMPLE[idx % FEED_SAMPLE.length];
  const kind = FEED_KIND[post.kind];

  // ── Riel de chips ─────────────────────────────────────────────────────────
  // Los 8 verticales no caben en los 760px del bloque, ni siquiera en
  // escritorio. En el teléfono se arrastran con el dedo, pero con ratón no hay
  // gesto equivalente: los tres últimos quedaban invisibles y nadie sabía que
  // estaban ahí. Se añaden dos flechas, que aparecen SOLO cuando hay algo hacia
  // ese lado y solo en escritorio (en móvil estorbarían y taparían chips).
  const railRef = useRef<HTMLDivElement>(null);
  const [rail, setRail] = useState({ izq: false, der: false });

  const syncRail = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 4px de tolerancia: el desplazamiento subpíxel nunca llega al extremo exacto.
    setRail({ izq: el.scrollLeft > 4, der: el.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    syncRail();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener('scroll', syncRail, { passive: true });
    window.addEventListener('resize', syncRail);
    return () => { el.removeEventListener('scroll', syncRail); window.removeEventListener('resize', syncRail); };
  }, [syncRail, lang]); // `lang` porque las etiquetas cambian de ancho al traducir

  const moverRiel = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.7), behavior: suave ? 'smooth' : 'auto' });
  };

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  // Reutiliza la búsqueda GLOBAL que ya funciona (`app.setSearch` + la ruta del
  // vertical): cada pantalla filtra por `app.search`. No se inventa una ruta
  // /buscar inexistente. El handoff pide además que buscar NO exija cuenta.
  const VERT_PATH: Record<Vertical, string> = {
    all: '/negocios/', food: '/negocios/', serv: '/negocios/', evt: '/eventos/',
    rent: '/negocios/', re: '/bienes-raices/', auto: '/autos/', job: '/trabajos/',
  };
  const submitSearch = () => {
    app.setSearch(query.trim());
    router.push(VERT_PATH[tab]);
  };
  const go = (path: string) => router.push(path);

  const VERTICALS: { k: Vertical; es: string; en: string; Icon: typeof Search }[] = [
    { k: 'all', es: 'Todo', en: 'Everything', Icon: Store },
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

  const POINTS = [
    { es: 'Negocios verificados', en: 'Verified businesses', c: A.green, Icon: ShieldCheck },
    { es: 'Español e inglés', en: 'Spanish & English', c: A.ocean, Icon: Globe },
    { es: 'Pagos protegidos', en: 'Protected payments', c: A.clay, Icon: CreditCard },
  ];

  const ROWS = [
    { n: '01', es: 'Pide desde casa', en: 'Order from home', c: A.rose, bg: A.roseBg, Icon: Utensils,
      dEs: 'Tus antojos y el mandado de negocios de tu gente — a domicilio o para recoger.',
      dEn: "Your cravings and groceries from your people's businesses — delivered or for pickup." },
    { n: '02', es: 'Agenda sin llamar', en: 'Book without calling', c: A.purple, bg: A.purpleBg, Icon: Calendar,
      dEs: 'Barbería, uñas, mecánico o doctor: tu cita en dos toques, con recordatorio.',
      dEn: 'Barber, nails, mechanic or doctor: your appointment in two taps, with a reminder.' },
    { n: '03', es: 'Comunidad de verdad', en: 'A real community', c: A.jade, bg: A.jadeBg, Icon: MessageSquare,
      dEs: 'Pregunta, recomienda y entérate de lo que pasa en tu zona, entre paisanos.',
      dEn: 'Ask, recommend and hear what is happening in your area, among your own.' },
    { n: '04', es: 'Vive tus eventos', en: 'Live your events', c: A.clay, bg: A.clayBg, Icon: Calendar,
      dEs: 'Boletos con QR para bailes, ferias, kermeses y lucha libre — sin filas.',
      dEn: 'QR tickets for dances, fairs, kermeses and lucha libre — no lines.' },
    { n: '05', es: 'Con confianza', en: 'With confidence', c: A.green, bg: A.greenBg, Icon: ShieldCheck,
      dEs: 'Negocios verificados uno por uno, reseñas reales y pagos protegidos.',
      dEn: 'Businesses verified one by one, real reviews and protected payments.' },
    { n: '06', es: 'En tu idioma', en: 'In your language', c: A.ocean, bg: A.oceanBg, Icon: Globe,
      dEs: 'Español primero, inglés cuando lo necesites. Aquí nadie se pierde.',
      dEn: 'Spanish first, English when you need it. Nobody gets lost here.' },
  ];

  const PERKS = [
    { es: 'Perfil verificado', en: 'Verified profile', dEs: 'Insignia y prioridad en búsqueda', dEn: 'Badge and search priority', Icon: ShieldCheck },
    { es: 'Pedidos y citas', en: 'Orders & bookings', dEs: 'Cobra en línea o en persona', dEn: 'Charge online or in person', Icon: Calendar },
    { es: 'Clientes directos', en: 'Direct customers', dEs: 'Chat y WhatsApp sin intermediarios', dEn: 'Chat and WhatsApp, no middlemen', Icon: MessageSquare },
    { es: 'Analíticas claras', en: 'Clear analytics', dEs: 'Vistas, clientes y ventas', dEn: 'Views, customers and sales', Icon: BarChart },
  ];

  // La marquesina repite la lista dos veces: el desplazamiento del 50% la
  // convierte en un bucle continuo, sin salto visible.
  const MARQUEE = useMemo(() => {
    const m = [
      L('Restaurantes', 'Restaurants'), L('Barberías', 'Barber shops'), L('Eventos', 'Events'),
      L('Renta de fiestas', 'Party rentals'), L('Bienes raíces', 'Real estate'), L('Autos', 'Autos'),
      L('Empleos', 'Jobs'), L('Belleza', 'Beauty'), L('Transporte', 'Transport'), L('Comunidad', 'Community'),
    ];
    return m.concat(m);
  }, [L]);

  const firstName = (profile?.display_name ?? '').trim().split(' ')[0];

  // Marca: palabra + logotipo. El trazo vive en `components/ui` (LogoMark), que
  // es la MISMA pieza que usan la cabecera de la app, el panel de negocio, el
  // panel de administración y los iconos generados. Aquí el tamaño viaja como
  // variable CSS (`--bs`) para que una media query pueda encogerlo en teléfonos
  // estrechos, donde la marca + el idioma + el botón de negocio no caben.
  const Brand = ({ size }: { size: number }) => (
    <span className="tl-brand flex flex-none items-baseline"
          style={{ letterSpacing: '-.03em', ['--bs' as string]: `${size}px` }}>
      <span className="font-extrabold text-ink" style={{ fontSize: 'var(--bs)' }}>To&rsquo;</span>
      <span className="font-extrabold text-primary" style={{ fontSize: 'var(--bs)' }}>Latino</span>
      <span className="tl-logo self-center" style={{ marginLeft: 'calc(var(--bs) * .25)' }}>
        <LogoMark size={Math.round(size * 0.88)} />
      </span>
    </span>
  );

  const gutter = 'px-[clamp(18px,5vw,56px)]';

  return (
    <div className="bg-page">
      {/* ═════════════ HERO — una pantalla completa (min-height:100svh) ═════════════ */}
      <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-page">
        {/* Resplandores decorativos */}
        <span aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2"
              style={{ top: '-32%', width: 'min(1500px,160vw)', height: 'min(950px,115vh)', background: 'radial-gradient(ellipse at center, rgba(123,97,255,.14), transparent 62%)' }} />
        <span aria-hidden className="pointer-events-none absolute"
              style={{ bottom: '-22%', right: '-16%', width: 'min(720px,90vw)', height: 'min(720px,70vh)', background: 'radial-gradient(circle, rgba(214,51,108,.09), transparent 66%)' }} />
        <span aria-hidden className="pointer-events-none absolute"
              style={{ bottom: '-14%', left: '-20%', width: 'min(600px,80vw)', height: 'min(600px,60vh)', background: 'radial-gradient(circle, rgba(244,183,64,.1), transparent 66%)' }} />

        {/* ── Barra superior ── */}
        <div className={`tl-bar relative flex items-center gap-[clamp(10px,2vw,16px)] py-[clamp(14px,3vw,24px)] ${gutter}`}>
          <a href="/" aria-label="To'Latino" className="tl-focus flex-none">
            <Brand size={22} />
          </a>

          <div role="group" aria-label={L('Idioma', 'Language')}
               className="tl-langpill ml-auto flex flex-none rounded-full border border-home-line2 bg-lilac-2 p-[3px]">
            {(['es', 'en'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                      className={`tl-focus cursor-pointer rounded-full px-[13px] py-[6px] text-[11.5px] font-extrabold uppercase ${lang === l ? 'bg-primary text-white' : 'text-muted'}`}>
                {l}
              </button>
            ))}
          </div>

          <button onClick={() => go(user ? '/negocio/' : '/negocio/publicar/')}
                  className="tl-btn-biz tl-focus flex flex-none cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-btn border-[1.5px] border-home-line bg-white px-[clamp(12px,2vw,18px)] py-[10px] text-[12.5px] font-extrabold text-primary-dark"
                  style={{ boxShadow: '0 4px 12px rgba(60,50,110,.06)' }}>
            <Store size={14} stroke={2.2} className="flex-none text-amber" aria-hidden />
            <span className="tl-lgi">{user ? L('Mi negocio', 'My business') : L('Registrar mi negocio', 'List my business')}</span>
            <span className="tl-smi">{L('Mi negocio', 'My business')}</span>
          </button>
        </div>

        {/* ── Centro ── */}
        <div className="relative mx-auto flex w-full max-w-[940px] flex-1 flex-col items-center justify-center px-[clamp(18px,5vw,40px)] text-center">
          <div className="tl-hero-inner">
            <span className="tl-up1 tl-kick inline-flex items-center gap-[9px] rounded-full bg-lilac-2 px-[15px] py-[7px]"
                  style={{ border: '1px solid rgba(123,97,255,.22)' }}>
              <i aria-hidden className="tl-pulse h-[7px] w-[7px] flex-none rounded-full bg-green" />
              <span className="font-bold text-home-badge" style={{ fontSize: 'clamp(10.5px,1.5vw,12px)', letterSpacing: '.01em' }}>
                {L(`Nuevo · Llegando a ${cityShort}`, `New · Coming to ${cityShort}`)}
              </span>
            </span>

            <h1 className="tl-up2 tl-h1 font-extrabold text-ink"
                style={{ fontSize: 'clamp(26px, min(6.4vw,8vh), 62px)', letterSpacing: '-.04em', lineHeight: 1.06, margin: 'clamp(16px,2.6vw,26px) 0 0', textWrap: 'balance' }}>
              {L('To’lo Latino de', 'Everything Latino in')}{' '}
              <button onClick={() => app.setCityOpen(true)} aria-label={L('Cambiar ciudad', 'Change city')}
                      className="tl-focus inline-flex cursor-pointer items-center gap-[.13em]">
                <span style={{ background: 'linear-gradient(96deg,#FF2D6F,#E11D48 55%,#FFB020)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                  {cityShort}
                </span>
                <ChevronDown stroke={2.8} className="flex-none text-primary-dark" style={{ width: '.4em', height: '.4em', marginTop: '.14em' }} aria-hidden />
              </button>
            </h1>

            <p className="tl-up3 tl-sub font-medium text-home-ink"
               style={{ fontSize: 'clamp(13.5px,1.7vw,17.5px)', lineHeight: 1.55, marginTop: 'clamp(8px,1.1vw,13px)' }}>
              {L('Encuentra to’los negocios, productos y servicios latinos', 'Find every Latino business, product and service')}{' '}
              <span className="font-bold text-ink">{L('en tu zona.', 'in your area.')}</span>
            </p>

            <div className="tl-up4 tl-searchwrap">
              {/* Chips de vertical: cambian el marcador del buscador y la ruta.
                  El envoltorio es `relative` para colgar de él las flechas SIN
                  ocupar alto: el ritmo vertical del hero está medido al píxel y
                  una fila más lo rompería. */}
              <div className="tl-chipswrap relative">
                <div ref={railRef} data-fade={`${rail.izq ? 'l' : ''}${rail.der ? 'r' : ''}`}
                     className="no-scrollbar tl-chips flex gap-[7px] overflow-x-auto pb-[11px]" style={{ justifyContent: 'safe center' }}>
                  {VERTICALS.map(({ k, es: e, en, Icon }) => {
                    const on = tab === k;
                    return (
                      <button key={k} onClick={() => setTab(k)} aria-pressed={on}
                              className={`tl-focus flex flex-none cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full border px-[15px] py-[9px] text-[12.5px] font-extrabold ${on ? 'border-primary bg-primary text-white' : 'border-line bg-white text-ink-soft'}`}>
                        <Icon size={14} stroke={2.2} className={`flex-none ${on ? 'text-white' : 'text-muted'}`} aria-hidden />
                        {L(e, en)}
                      </button>
                    );
                  })}
                </div>

                {/* Flechas: solo escritorio, solo si hay algo hacia ese lado.
                    `pointer-events-none` en el carril para no robar el clic a
                    los chips que quedan debajo; los botones lo reactivan. */}
                <div aria-hidden={!rail.izq && !rail.der}
                     className="pointer-events-none absolute inset-x-0 top-0 bottom-[11px] hidden items-center justify-between min-[600px]:flex">
                  {([-1, 1] as const).map((dir) => {
                    const visible = dir === -1 ? rail.izq : rail.der;
                    const Icon = dir === -1 ? ChevronLeft : ChevronRight;
                    return (
                      <button key={dir} onClick={() => moverRiel(dir)} tabIndex={visible ? 0 : -1}
                              aria-label={dir === -1 ? L('Ver categorías anteriores', 'See previous categories') : L('Ver más categorías', 'See more categories')}
                              className={`tl-railbtn tl-focus pointer-events-auto flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full border border-line bg-white ${visible ? '' : 'tl-railoff'} ${dir === -1 ? 'ml-[-6px]' : 'mr-[-6px] ml-auto'}`}>
                        <Icon size={16} stroke={2.4} className="text-ink-soft" aria-hidden />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="tl-search rounded-[clamp(16px,2vw,19px)] border-[1.5px] bg-white p-[8px]"
                   style={{ borderColor: 'rgba(30,27,46,.1)', boxShadow: '0 20px 48px rgba(60,50,110,.13)' }}>
                <div className="flex min-w-0 items-center gap-[10px] pl-[13px] pr-[4px]">
                  <Search size={19} stroke={2.2} className="flex-none text-muted-2" aria-hidden />
                  <input value={query} onChange={(e) => setQuery(e.target.value)}
                         onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                         placeholder={L(PLACEHOLDER[tab][0], PLACEHOLDER[tab][1])}
                         aria-label={L('Buscar', 'Search')}
                         className="tl-input tl-focus min-w-0 flex-1 border-none bg-transparent py-[13px] font-semibold text-ink outline-none placeholder:text-home-ph" />
                  <span aria-hidden className="tl-lg h-6 w-px flex-none" style={{ background: 'rgba(30,27,46,.1)' }} />
                  <button onClick={() => app.setCityOpen(true)} aria-label={L('Cambiar ciudad', 'Change city')}
                          className="tl-lg tl-focus flex-none cursor-pointer items-center gap-[6px] px-2">
                    <MapPin size={15} stroke={2.4} className="flex-none text-primary" aria-hidden />
                    <span className="whitespace-nowrap text-[13px] font-bold text-ink-soft">{app.city}</span>
                  </button>
                </div>
                <div className="flex min-w-0 items-stretch gap-[8px]">
                  <button onClick={() => app.setCityOpen(true)} aria-label={L('Cambiar ciudad', 'Change city')}
                          className="tl-sm tl-focus max-w-[46%] flex-none cursor-pointer items-center gap-[6px] rounded-field border bg-page px-[13px]"
                          style={{ borderColor: 'rgba(30,27,46,.1)' }}>
                    <MapPin size={14} stroke={2.4} className="flex-none text-primary" aria-hidden />
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-bold text-ink-soft">{app.city}</span>
                  </button>
                  <button onClick={submitSearch}
                          className="tl-sbtn tl-focus flex-1 cursor-pointer rounded-btn bg-primary px-[clamp(22px,3vw,30px)] py-[14px] text-[14px] font-extrabold text-white"
                          style={{ boxShadow: '0 10px 22px rgba(123,97,255,.34)' }}>
                    {L('Buscar', 'Search')}
                  </button>
                </div>
              </div>

              <div className="tl-points flex flex-wrap items-center justify-center gap-[clamp(14px,2.6vw,26px)]"
                   style={{ marginTop: 'clamp(14px,2.2vw,20px)' }}>
                {POINTS.map((p) => (
                  <div key={p.es} className="flex items-center gap-[7px]">
                    <p.Icon size={14} stroke={2.3} className="flex-none" style={{ color: p.c }} aria-hidden />
                    <span className="whitespace-nowrap font-bold text-muted" style={{ fontSize: 'clamp(10.5px,1.3vw,12px)' }}>{L(p.es, p.en)}</span>
                  </div>
                ))}
              </div>

              {/* Fila de cuenta — real: con sesión abierta lleva a la app */}
              <div className="tl-authrow flex flex-wrap items-center justify-center gap-[2px]">
                {user ? (
                  <>
                    <span className="tl-jointitle text-[13px] font-semibold text-home-mute">
                      {firstName ? L(`Hola, ${firstName}.`, `Hi, ${firstName}.`) : L('Ya tienes tu sesión abierta.', 'You are already signed in.')}
                    </span>
                    <button onClick={() => go('/comunidad/')}
                            className="tl-join tl-focus inline-flex min-h-[44px] cursor-pointer items-center rounded-field px-3 py-3 text-[13px] font-extrabold text-primary-dark">
                      {L('Entrar a la app', 'Open the app')}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="tl-jointitle text-[13px] font-semibold text-home-mute">
                      <span className="tl-lgi">{L('¿Ya eres parte de tu comunidad?', 'Already part of your community?')}</span>
                      <span className="tl-smi">{L('¿Ya tienes cuenta?', 'Already have an account?')}</span>
                    </span>
                    <button onClick={() => go('/entrar/?entrar=1')}
                            className="tl-join tl-focus inline-flex min-h-[44px] cursor-pointer items-center rounded-field px-3 py-3 text-[13px] font-extrabold text-primary-dark">
                      {L('Entrar', 'Log in')}
                    </button>
                    <span aria-hidden className="h-[14px] w-px flex-none" style={{ background: 'rgba(30,27,46,.14)' }} />
                    <button onClick={() => go('/entrar/?crear=1')}
                            className="tl-join tl-focus inline-flex min-h-[44px] cursor-pointer items-center rounded-field px-3 py-3 text-[13px] font-extrabold text-primary-dark">
                      {L('Regístrate', 'Sign up')}
                    </button>
                  </>
                )}
              </div>

              {/* Tarjeta del feed. ⚠️ Contenido de MUESTRA del handoff (ver
                  `lib/landing.ts`): personas y negocios que no existen. Decisión
                  del fundador; hay que sustituirlo por el feed real antes de
                  abrir el registro al público. */}
              <button onClick={() => setIdx((i) => i + 1)}
                      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
                      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
                      aria-label={L('Ver la siguiente publicación de la comunidad', 'See the next community post')}
                      className="tl-feed tl-focus mx-auto flex w-full max-w-[460px] cursor-pointer items-center rounded-[16px] border border-line bg-white px-[14px] py-[13px]"
                      style={{ marginTop: 'clamp(8px,1.4vw,14px)', minHeight: 92, boxShadow: '0 8px 24px rgba(60,50,110,.07)' }}>
                <div aria-live="polite" key={idx % FEED_SAMPLE.length}
                     className={`flex w-full items-start gap-[11px] text-left ${idx % 2 === 0 ? 'tl-pa' : 'tl-pb'}`}>
                  <span aria-hidden className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-[11.5px] font-extrabold text-white"
                          style={{ background: post.color }}>
                      {post.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-[7px]">
                        <span className="tl-pname overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-extrabold text-ink">{post.who}</span>
                        <span className="flex-none rounded-[7px] px-2 py-[3px] text-[9px] font-extrabold uppercase"
                              style={{ background: kind.bg, color: kind.color, letterSpacing: '.07em' }}>
                          {L(kind.es, kind.en)}
                        </span>
                      </div>
                      <p className="tl-ptext tl-clamp text-[13px] font-medium text-ink-soft" style={{ lineHeight: 1.45, marginTop: 5, textWrap: 'pretty' }}>
                        {es ? post.es : post.en}
                      </p>
                      <p className="tl-pmeta text-[10.5px] font-semibold text-muted" style={{ marginTop: 6 }}>
                        {post.hood} · {L(post.agoEs, post.agoEn)}
                      </p>
                    </div>
                  </div>
              </button>
            </div>
          </div>
        </div>

        {/* ── Marquesina + señal de desplazamiento ── */}
        <div className="relative">
          <div aria-hidden className="tl-marqband overflow-hidden py-[clamp(11px,1.6vw,15px)]"
               style={{ borderTop: '1px solid rgba(30,27,46,.07)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)' }}>
            <div className="tl-marq flex w-max gap-[clamp(26px,4vw,44px)]">
              {MARQUEE.map((m, i) => (
                <span key={`${m}-${i}`} className="inline-flex items-center gap-[clamp(26px,4vw,44px)] whitespace-nowrap font-extrabold uppercase text-home-idx"
                      style={{ fontSize: 'clamp(11px,1.3vw,12.5px)', letterSpacing: '.14em' }}>
                  {m}
                  <span className="h-[5px] w-[5px] rotate-45 bg-amber opacity-70" />
                </span>
              ))}
            </div>
          </div>
          <div className={`flex items-center justify-center py-[clamp(9px,1.4vw,13px)] ${gutter}`}
               style={{ borderTop: '1px solid rgba(30,27,46,.06)', paddingBottom: 'calc(clamp(11px,1.6vw,15px) + env(safe-area-inset-bottom))' }}>
            <a href="#conoce" className="tl-focus flex items-center gap-[7px] text-[10.5px] font-extrabold uppercase text-muted" style={{ letterSpacing: '.13em' }}>
              {L('Conoce más', 'Learn more')}
              <ArrowDown size={13} stroke={2.4} className="flex-none" aria-hidden />
            </a>
          </div>
        </div>
      </div>

      {/* ═════════════ ¿POR QUÉ TO'LATINO? ═════════════ */}
      <section id="conoce" className={`relative bg-page pt-[clamp(56px,9vw,110px)] ${gutter}`}>
        <div className="mx-auto max-w-[1000px]">
          <div className="mx-auto max-w-[560px] text-center">
            <p className="text-[10px] font-extrabold uppercase text-primary" style={{ letterSpacing: '.16em' }}>
              {L('¿Por qué To’Latino?', 'Why To’Latino?')}
            </p>
            <h2 className="font-extrabold text-ink"
                style={{ fontSize: 'clamp(23px,4.2vw,38px)', letterSpacing: '-.035em', lineHeight: 1.14, marginTop: 12, textWrap: 'balance' }}>
              {L('Hecho por latinos, para latinos', 'Made by Latinos, for Latinos')}
            </h2>
            <p className="mx-auto max-w-[44ch] font-medium text-home-mute"
               style={{ fontSize: 'clamp(13px,1.5vw,15.5px)', lineHeight: 1.6, marginTop: 11, textWrap: 'pretty' }}>
              {L(`Una sola app para resolver el día a día en ${cityShort}.`, `One app to handle everyday life in ${cityShort}.`)}
            </p>
          </div>

          <div className="tl-rows" style={{ marginTop: 'clamp(26px,4vw,44px)', borderTop: '1px solid rgba(30,27,46,.08)' }}>
            {ROWS.map((r) => (
              <div key={r.n} className="flex items-start gap-[14px] px-[2px] py-[clamp(17px,2.2vw,22px)]"
                   style={{ borderBottom: '1px solid rgba(30,27,46,.08)' }}>
                <span aria-hidden className="flex h-10 w-10 flex-none items-center justify-center rounded-[13px]" style={{ background: r.bg }}>
                  <r.Icon size={19} stroke={2} style={{ color: r.c }} />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-extrabold text-ink" style={{ fontSize: 'clamp(14px,1.6vw,15.5px)', letterSpacing: '-.015em' }}>{L(r.es, r.en)}</h3>
                    <span aria-hidden className="ml-auto flex-none text-[10px] font-extrabold text-home-idx" style={{ letterSpacing: '.06em' }}>{r.n}</span>
                  </div>
                  <p className="font-medium text-muted" style={{ fontSize: 'clamp(12px,1.4vw,13px)', lineHeight: 1.55, marginTop: 4, textWrap: 'pretty' }}>
                    {L(r.dEs, r.dEn)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-[10px]" style={{ marginTop: 'clamp(24px,3.4vw,36px)' }}>
            <button onClick={() => go(user ? '/comunidad/' : '/entrar/?crear=1')}
                    className="tl-focus cursor-pointer rounded-[13px] bg-primary px-[30px] py-[15px] text-[13.5px] font-extrabold text-white"
                    style={{ boxShadow: '0 12px 26px rgba(123,97,255,.32)' }}>
              {user ? L('Entrar a la app', 'Open the app') : L('Crear mi cuenta', 'Create my account')}
            </button>
            {!user && <span className="text-[11px] font-semibold text-muted">{L('En menos de un minuto', 'In less than a minute')}</span>}
          </div>
        </div>
      </section>

      {/* ═════════════ PARA NEGOCIOS ═════════════ */}
      <section id="negocios" className={`relative bg-page pt-[clamp(116px,17vw,216px)] ${gutter}`}>
        <div className="relative mx-auto max-w-[1080px] overflow-hidden p-[clamp(26px,4.4vw,52px)]"
             style={{ background: 'linear-gradient(150deg,#4F46E5,#FF2D6F 46%,#AE54A5)', borderRadius: 'clamp(22px,3vw,30px)' }}>
          <span aria-hidden className="pointer-events-none absolute rounded-full"
                style={{ top: '-30%', right: '-14%', width: 'min(460px,70%)', height: 'min(460px,120%)', background: 'rgba(255,255,255,.1)' }} />
          <span aria-hidden className="pointer-events-none absolute rounded-full"
                style={{ bottom: '-42%', left: '-16%', width: 'min(420px,65%)', height: 'min(420px,110%)', background: 'rgba(244,183,64,.13)' }} />

          <div className="tl-bizgrid relative">
            <div>
              <span className="inline-flex items-center gap-[7px] rounded-full px-3 py-[6px]"
                    style={{ background: 'rgba(244,183,64,.2)', border: '1px solid rgba(244,183,64,.34)' }}>
                <span className="text-[9.5px] font-extrabold uppercase" style={{ color: '#FFB020', letterSpacing: '.13em' }}>
                  {L('Para negocios', 'For business')}
                </span>
              </span>
              <h2 className="font-extrabold text-white"
                  style={{ fontSize: 'clamp(21px,3.4vw,34px)', letterSpacing: '-.03em', lineHeight: 1.2, marginTop: 14, textWrap: 'balance' }}>
                {L('¿Eres latino y quieres emprender o ya tienes un negocio establecido?', 'Are you Latino and want to start out — or already run a business?')}
              </h2>
              <p className="max-w-[46ch] font-medium"
                 style={{ fontSize: 'clamp(13.5px,1.5vw,15.5px)', color: 'rgba(255,255,255,.84)', lineHeight: 1.65, marginTop: 12, textWrap: 'pretty' }}>
                {L(`Publica tu negocio y llega a la gente de ${cityShort} que te está buscando — todo en español.`,
                   `List your business and reach the people in ${cityShort} who are looking for you — all in Spanish.`)}
              </p>
              <button onClick={() => go(user ? '/negocio/' : '/negocio/publicar/')}
                      className="tl-focus flex w-full max-w-[340px] cursor-pointer items-center justify-center gap-[9px] rounded-btn-lg bg-white px-[26px] py-[16px] text-[14.5px] font-extrabold text-primary-dark"
                      style={{ marginTop: 'clamp(20px,2.6vw,26px)', boxShadow: '0 14px 32px rgba(20,10,50,.28)' }}>
                <Store size={17} stroke={2.4} className="flex-none" aria-hidden />
                {user ? L('Ir a mi negocio', 'Go to my business') : L('Registrar mi negocio', 'List my business')}
              </button>
              <p className="text-[11.5px] font-bold" style={{ color: 'rgba(255,255,255,.74)', marginTop: 13 }}>
                {L('Listo en 5 minutos · sin contratos', 'Ready in 5 minutes · no contracts')}
              </p>
            </div>

            <div className="tl-perks">
              {PERKS.map((p) => (
                <div key={p.es} className="rounded-[15px] p-[14px]"
                     style={{ background: 'rgba(255,255,255,.13)', border: '1px solid rgba(255,255,255,.18)' }}>
                  <span aria-hidden className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px]" style={{ background: 'rgba(255,255,255,.2)' }}>
                    <p.Icon size={15} stroke={2.2} className="text-white" />
                  </span>
                  <h3 className="text-[12.5px] font-extrabold text-white" style={{ marginTop: 10 }}>{L(p.es, p.en)}</h3>
                  <p className="text-[10.5px] font-medium" style={{ color: 'rgba(255,255,255,.74)', marginTop: 3, lineHeight: 1.45 }}>{L(p.dEs, p.dEn)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ PIE ═════════════ */}
      <footer className={`bg-page pt-[clamp(40px,6vw,72px)] ${gutter}`}>
        {/* En el teléfono solo BAJA el copyright: la marca y los enlaces legales
            se quedan en la misma línea, uno a cada extremo. En una sola fila con
            los tres, los enlaces caían a un segundo renglón pegados al borde
            derecho y parecía un error. Se resuelve con `order` + `w-full` sobre
            el copyright, no partiendo el pie en dos bloques. A partir de 600px
            vuelve a la fila única del handoff (marca · copyright … enlaces). */}
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-x-[14px] gap-y-2 pt-5"
             style={{ borderTop: '1px solid rgba(30,27,46,.07)', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          <Brand size={18} />
          <span className="order-3 w-full text-[11.5px] font-semibold text-muted min-[600px]:order-2 min-[600px]:w-auto">
            © {new Date().getFullYear()} To&rsquo;Latino
          </span>
          {/* Los enlaces legales no están en el handoff, pero la ley sí los pide
              y las dos páginas ya existen: se añaden sin tocar su composición. */}
          <nav aria-label={L('Legal', 'Legal')} className="order-2 ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 min-[600px]:order-3">
            <a href="/terminos/" className="tl-focus text-[11.5px] font-semibold text-muted hover:text-primary-dark">{L('Términos', 'Terms')}</a>
            <a href="/privacidad/" className="tl-focus text-[11.5px] font-semibold text-muted hover:text-primary-dark">{L('Privacidad', 'Privacy')}</a>
          </nav>
        </div>
      </footer>

      <CityModal />

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        body { background: #F6F4FF; } /* el rebote del scroll no debe enseñar el gris de la app */

        .tl-focus:focus-visible { outline: 2px solid #FF2D6F; outline-offset: 2px; border-radius: 10px; }

        /* Bloque central del hero */
        .tl-hero-inner { display: flex; flex-direction: column; align-items: center; width: 100%; padding: clamp(14px,3vw,28px) 0; }
        .tl-searchwrap { width: 100%; max-width: 760px; margin-top: clamp(68px,7vw,86px); }
        .tl-authrow { margin-top: clamp(26px,6vw,76px); }
        .tl-search { display: grid; grid-template-columns: minmax(0,1fr); gap: 8px; }
        .tl-clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        /* Buscador: el MARCADOR va pequeño y en cursiva; lo que el usuario
           ESCRIBE, normal y más grande. La seudoclase :placeholder-shown es
           exactamente eso — se cumple mientras el campo está vacío, sin
           JavaScript. El !important es necesario para ganarle a la regla global
           que sube todos los campos a 16px en móvil (la que evita el zoom de
           iOS), y el line-height fijo impide que la tarjeta dé un salto al
           cambiar el tamaño de la letra al empezar a escribir. */
        /* ESCRITORIO: 14px en los dos estados — el marcador solo se distingue por
           la cursiva, así que el campo no cambia de tamaño al escribir. */
        .tl-input { font-size: 14px !important; font-style: normal; line-height: 20px; text-overflow: ellipsis; }
        .tl-input:placeholder-shown { font-size: 14px !important; font-style: italic; }
        /* TELÉFONO: marcador 12px, texto escrito 16px. Los 16 no son capricho:
           Safari de iOS acerca la pantalla sola en cuanto enfocas un campo con
           letra menor de 16px, y ese zoom no se deshace al salir del campo — el
           usuario se queda con la portada acercada. Por eso toda la app usa 16px
           en móvil. Y como el marcador de 12px también lo dispararía (está
           visible justo cuando enfocas), al enfocar sube a 16 y se desvanece:
           como deja de verse, el cambio de tamaño no se nota. */
        @media (max-width: 767px) {
          .tl-input { font-size: 16px !important; }
          .tl-input:placeholder-shown { font-size: 12px !important; }
          .tl-input:placeholder-shown:focus { font-size: 16px !important; font-style: normal; }
          .tl-input:focus::placeholder { color: transparent; }
        }
        /* El foco del campo se marca iluminando la TARJETA entera, no dibujando
           un recuadro alrededor del campo: dentro de la tarjeta blanca ese
           recuadro parecía un segundo campo metido dentro del primero. El aviso
           de foco sigue siendo visible, que es lo que pide el handoff. */
        .tl-input:focus-visible { outline: none; }
        .tl-search:focus-within { border-color: rgba(123,97,255,.5) !important; box-shadow: 0 20px 48px rgba(60,50,110,.13), 0 0 0 3px rgba(123,97,255,.15) !important; }
        /* Flechas del riel de chips: se desvanecen en vez de desaparecer, para
           que la fila no dé un salto al llegar a un extremo. */
        .tl-railbtn { transition: opacity .18s ease, border-color .18s ease, box-shadow .18s ease;
                      box-shadow: 0 4px 12px rgba(60,50,110,.1); }
        .tl-railbtn:hover { border-color: rgba(123,97,255,.4); box-shadow: 0 6px 16px rgba(60,50,110,.14); }
        .tl-railoff { opacity: 0 !important; pointer-events: none !important; }
        /* Las flechas solo asoman al acercar el ratón al riel — o al llegar con
           el tabulador, para que quien no use ratón también las encuentre. Se
           condiciona a que el puntero sea de verdad un ratón: en una tableta de
           600px o más no hay "hover", así que allí se quedan siempre visibles en
           vez de volverse inalcanzables. */
        @media (hover: hover) and (pointer: fine) and (min-width: 600px) {
          .tl-railbtn { opacity: 0; }
          .tl-chipswrap:hover .tl-railbtn,
          .tl-railbtn:focus-visible { opacity: 1; }
        }
        /* Los chips se DESVANECEN por el lado que tiene flecha, para que se vea
           que la fila continúa y no parezca que la flecha los tapa. Se hace con
           máscara y no con un degradado encima porque el fondo del hero no es
           un color plano —lleva tres resplandores— y cualquier degradado sólido
           se notaría como una banda. La máscara funciona sobre cualquier fondo. */
        @media (min-width: 600px) {
          .tl-chips[data-fade="r"] { -webkit-mask-image: linear-gradient(90deg,#000 0,#000 calc(100% - 46px),transparent 100%); mask-image: linear-gradient(90deg,#000 0,#000 calc(100% - 46px),transparent 100%); }
          .tl-chips[data-fade="l"] { -webkit-mask-image: linear-gradient(90deg,transparent 0,#000 46px,#000 100%); mask-image: linear-gradient(90deg,transparent 0,#000 46px,#000 100%); }
          .tl-chips[data-fade="lr"] { -webkit-mask-image: linear-gradient(90deg,transparent 0,#000 46px,#000 calc(100% - 46px),transparent 100%); mask-image: linear-gradient(90deg,transparent 0,#000 46px,#000 calc(100% - 46px),transparent 100%); }
        }
        .tl-join:hover { background: #FCFBFF; }
        .tl-btn-biz { transition: border-color .18s ease; }
        .tl-btn-biz:hover { border-color: rgba(123,97,255,.4); }
        .tl-feed { transition: border-color .18s ease; }
        .tl-feed:hover { border-color: rgba(123,97,255,.28); }

        /* Variantes larga (≥600px) / corta (≤599px) de las etiquetas y de los
           dos selectores de ciudad del buscador. */
        .tl-sm { display: flex; }
        .tl-lg { display: none; }
        .tl-lgi { display: inline; }
        .tl-smi { display: none; }
        @media (min-width: 600px) {
          .tl-sm { display: none !important; }
          .tl-lg { display: flex; }
          .tl-search { grid-template-columns: minmax(0,1fr) auto; }
          .tl-sub { white-space: nowrap; }
        }
        @media (max-width: 599px) {
          .tl-lgi { display: none; }
          .tl-smi { display: inline; }
          /* Ritmo del móvil, medido por el handoff en un teléfono real:
             insignia 72 · insignia→H1 18 · subtítulo→buscador 64 · la fila de
             cuenta y el feed anclados abajo. */
          /* El bloque central OCUPA todo el alto libre (flex:1) en vez de
             reservarlo con un min-height calculado. Así el reparto es siempre el
             mismo, mida lo que mida la pantalla: titular arriba, buscador en el
             centro, "¿Ya tienes cuenta?" + tarjeta abajo. Con min-height, en
             cuanto el teléfono era bajo el bloque se quedaba corto y el padre lo
             centraba: todo junto arriba y un hueco muerto abajo. */
          .tl-hero-inner { padding-top: 16px; justify-content: flex-start; flex: 1; align-self: stretch; }
          /* El buscador queda CENTRADO entre el bloque de arriba (titular) y el
             de abajo (cuenta + tarjeta): dos márgenes automáticos —uno encima de
             los chips y otro encima de la fila de cuenta— se reparten el hueco
             sobrante a partes iguales. El margen fijo de 64px del handoff se
             queda solo como suelo mínimo, para que los chips nunca se peguen al
             subtítulo cuando no sobra nada. Ese suelo (20px) está igualado con lo
             que aporta el bloque de abajo —8px de relleno más los ~13px que deja
             el texto centrado dentro de unos enlaces de 44px— para que los dos
             huecos midan lo mismo. Medido: 1px de diferencia en seis pantallas. */
          .tl-searchwrap { margin-top: 20px; display: flex; flex-direction: column; flex: 1; }
          .tl-chipswrap { margin-top: auto; }
          /* Las tres garantías (verificados · idiomas · pagos) NO se muestran en
             el teléfono, por petición del fundador: apretaban el bloque central
             y su sitio natural es el escritorio, donde sobra ancho. El aire que
             liberan, más los 18px que sube el titular, van al hueco elástico de
             encima de la fila de cuenta — que es lo que hace que la pantalla
             respire. En ≥600px siguen igual que en el handoff. */
          .tl-points { display: none !important; }
          /* 8px, no 20: los enlaces Entrar/Regístrate miden 44px de alto por
             accesibilidad y su texto queda centrado dentro, así que ya aportan
             ~13px de aire por arriba. Con 20 el hueco de abajo salía 13px mayor
             que el de arriba y el buscador no quedaba centrado. */
          .tl-authrow { margin-top: auto !important; padding-top: 8px; gap: 0; }
          .tl-kick { padding: 5px 11px; }
          .tl-kick span { font-size: 10px; }
          .tl-h1 { font-size: clamp(26px,8vw,31px) !important; line-height: 1.14 !important; letter-spacing: -.03em !important; margin-top: 18px !important; }
          .tl-sub { font-size: 12.5px !important; max-width: 34ch; margin: 8px auto 0 !important; text-wrap: balance; }
          .tl-chips { gap: 6px; padding-bottom: 9px; }
          .tl-chips > button { padding: 8px 12px; font-size: 11.5px; gap: 6px; }
          .tl-search { border-radius: 15px !important; padding: 6px !important; }
          .tl-sbtn { padding: 11px 14px !important; font-size: 13px !important; border-radius: 10px !important; }
          .tl-jointitle, .tl-join { font-size: 12px !important; }
          .tl-join { padding: 12px 8px !important; }
          .tl-feed { padding: 11px 12px !important; min-height: 80px !important; margin-top: 4px !important; border-radius: 14px !important; }
          .tl-pname, .tl-ptext { font-size: 12px !important; }
          .tl-ptext { margin-top: 4px !important; }
          .tl-pmeta { font-size: 10px !important; margin-top: 4px !important; }
          .tl-btn-biz { padding: 9px 12px !important; font-size: 12px !important; border-radius: 11px !important; }
          .tl-marqband span { font-size: 10px !important; }
        }
        /* ── Teléfonos ESTRECHOS ────────────────────────────────────────────
           A 375px la barra superior no daba de sí y "Mi negocio" se salía por
           el borde. Se encoge la marca y se aprietan los huecos; nada se oculta,
           porque el botón de negocio es una de las dos conversiones de la página. */
        @media (max-width: 400px) {
          .tl-brand { --bs: 19px !important; }
          .tl-logo svg { width: 17px !important; height: 17px !important; }
          .tl-bar { gap: 8px !important; padding-left: 14px !important; padding-right: 14px !important; }
          .tl-langpill button { padding-left: 10px !important; padding-right: 10px !important; }
          .tl-btn-biz { padding: 9px 10px !important; gap: 5px !important; }
        }

        /* ── Teléfonos CORTOS ───────────────────────────────────────────────
           El ritmo del handoff está medido en un teléfono de 402×806. En uno
           de 375×667 (iPhone SE, Androids viejos) esos mismos huecos fijos
           sacaban la portada 122px fuera de pantalla y obligaban a rodar para
           ver el buscador. El fundador pidió que se vea COMPLETA de entrada, así
           que aquí se comprime: mismos elementos, mismo orden, nada se quita —
           solo se aprietan los huecos y las tipografías más grandes. */
        @media (max-width: 599px) and (max-height: 740px) {
          .tl-hero-inner { padding-top: 10px !important; }
          .tl-kick { padding: 4px 10px !important; }
          .tl-kick span { font-size: 9.5px !important; }
          .tl-h1 { font-size: clamp(22px,6.6vw,26px) !important; margin-top: 12px !important; }
          .tl-sub { font-size: 11.5px !important; margin-top: 6px !important; }
          .tl-chips { padding-bottom: 7px !important; }
          .tl-chips > button { padding: 7px 11px !important; font-size: 11px !important; }
          .tl-search { padding: 5px !important; }
          .tl-input { padding-top: 10px !important; padding-bottom: 10px !important; }
          .tl-sbtn { padding: 10px 14px !important; }
          .tl-authrow { padding-top: 10px !important; }
          .tl-join { padding: 10px 8px !important; min-height: 40px !important; }
          .tl-feed { min-height: 68px !important; padding: 9px 11px !important; margin-top: 8px !important; }
        }
        /* Aún más cortos (360×640): además se retira la marquesina, que es
           decorativa, antes que dejar el buscador fuera de pantalla. */
        @media (max-width: 599px) and (max-height: 680px) {
          .tl-marqband { display: none !important; }
          .tl-hero-inner { padding-top: 6px !important; }
          .tl-h1 { font-size: clamp(21px,6.2vw,24px) !important; margin-top: 10px !important; }
          .tl-ptext { -webkit-line-clamp: 2; }
        }

        /* Ventanas bajas de ESCRITORIO: la marquesina estorba y el titular se achica */
        @media (max-height: 700px) and (min-width: 600px) {
          .tl-marqband { display: none !important; }
          .tl-h1 { font-size: clamp(25px, min(5.4vw,5vh), 44px) !important; }
          .tl-sub { font-size: 13.5px !important; margin-top: 6px !important; }
          .tl-kick { padding: 5px 12px; }
          .tl-searchwrap { margin-top: 52px; }
          .tl-points { margin-top: 12px !important; }
          .tl-authrow { margin-top: 24px; }
        }
        @media (max-height: 440px) and (orientation: landscape) {
          .tl-marqband { display: none !important; }
          .tl-h1 { font-size: clamp(22px, min(5vw,5.4vh), 34px) !important; margin-top: 10px !important; }
        }

        /* Rejillas de las dos secciones inferiores */
        .tl-rows { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%,300px), 1fr)); column-gap: clamp(28px,4vw,56px); }
        .tl-bizgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%,320px), 1fr)); gap: clamp(24px,3.4vw,44px); align-items: center; }
        .tl-perks { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%,150px), 1fr)); gap: 10px; }

        /* Animaciones del handoff */
        @keyframes tlp { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
        @keyframes tlup { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        @keyframes tlmarq { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes tlpa { from { opacity: 0; transform: translateY(9px) } to { opacity: 1; transform: none } }
        @keyframes tlpb { from { opacity: 0; transform: translateY(9px) } to { opacity: 1; transform: none } }
        .tl-pulse { animation: tlp 1.8s ease-in-out infinite; }
        .tl-up1 { animation: tlup .6s cubic-bezier(.22,.7,.25,1) both; }
        .tl-up2 { animation: tlup .6s .08s cubic-bezier(.22,.7,.25,1) both; }
        .tl-up3 { animation: tlup .6s .16s cubic-bezier(.22,.7,.25,1) both; }
        .tl-up4 { animation: tlup .6s .24s cubic-bezier(.22,.7,.25,1) both; }
        .tl-marq { animation: tlmarq 36s linear infinite; }
        .tl-pa { animation: tlpa .42s cubic-bezier(.22,.7,.25,1) both; }
        .tl-pb { animation: tlpb .42s cubic-bezier(.22,.7,.25,1) both; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .tl-pulse, .tl-up1, .tl-up2, .tl-up3, .tl-up4, .tl-marq, .tl-pa, .tl-pb { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
