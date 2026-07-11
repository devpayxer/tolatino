'use client';

// Bienvenida (`/`) — public landing (Handoff v2): sticky nav, gradient hero
// with floating collage, categories, how-it-works + trust, business band,
// footer. Converts to explore or register.

import { useRouter } from 'next/navigation';
import { IconCalendar as Calendar, IconGlobe as Globe, IconMapPin as MapPin, IconSearch as Search, IconShield as Shield, IconBuildingStore as Store, IconUsers as Users } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { Avatar, SoonTag, Stars, Wordmark } from '@/components/ui';
import { LangToggle } from '@/components/AppHeader';
import { CityModal } from '@/components/CityModal';
import { VIEW_PATH } from '@/data/fixtures';
import { AVATAR_PALETTE, tile } from '@/lib/tiles';

export function LandingScreen() {
  const { L } = useLang();
  const app = useApp();
  const router = useRouter();

  const go = (path: string) => router.push(path);

  const cats = [
    { Icon: Users, color: '#6D4DF6', bg: '#EFEBFF', title: L('Comunidad', 'Community'), desc: L('Pregunta, recomienda y conecta con vecinos de tu ciudad.', 'Ask, recommend and connect with neighbors in your city.'), kind: L('Estilo Nextdoor', 'Nextdoor-style'), path: VIEW_PATH.comunidad },
    { Icon: Store, color: '#1F9D57', bg: '#E3F5EA', title: L('Negocios', 'Business'), desc: L('Encuentra el taquero, mecánico o salón latino cerca de ti.', 'Find the Latino taquero, mechanic or salon near you.'), kind: L('Estilo Yelp', 'Yelp-style'), path: VIEW_PATH.negocios },
    { Icon: Calendar, color: '#E0568F', bg: '#FBE9F0', title: L('Eventos', 'Events'), desc: L('Descubre y compra boletos para eventos de tu comunidad.', 'Discover and buy tickets for community events.'), kind: L('Boletos', 'Ticketing'), path: VIEW_PATH.eventos },
  ];

  const steps = [
    { n: '1', t: L('Elige tu ciudad', 'Pick your city'), d: L('To’Latino te muestra lo que está cerca de ti.', 'To’Latino shows you what’s near you.') },
    { n: '2', t: L('Busca y conecta', 'Search & connect'), d: L('Negocios, eventos y vecinos, en tu idioma.', 'Businesses, events and neighbors, in your language.') },
    { n: '3', t: L('Sé parte', 'Join in'), d: L('Publica, recomienda y haz crecer tu comunidad.', 'Post, recommend and grow your community.') },
  ];

  const trust = [
    { Icon: Globe, color: '#6D4DF6', bg: '#EFEBFF', t: L('Bilingüe', 'Bilingual'), d: L('Español e inglés', 'Spanish & English') },
    { Icon: MapPin, color: '#1F9D57', bg: '#E3F5EA', t: L('Por ciudad', 'By city'), d: L('Geolocalizado cerca de ti', 'Geo-based near you') },
    { Icon: Shield, color: '#E0568F', bg: '#FBE9F0', t: L('De confianza', 'Trusted'), d: L('Recomendado por vecinos', 'Neighbor-recommended') },
  ];

  const stats = [
    { v: '+9k', l: L('vecinos', 'neighbors') },
    { v: '1,200', l: L('negocios', 'businesses') },
    { v: '340', l: L('eventos', 'events') },
  ];

  return (
    <div className="bg-white text-ink">
      {/* nav */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-hair bg-[rgba(255,255,255,.92)] px-4 py-3 backdrop-blur-[8px] backdrop-saturate-[1.4] md:px-[22px] md:py-3.5 lg:px-[34px] lg:py-4">
        <Wordmark size="lg" />
        <button
          onClick={() => app.setCityOpen(true)}
          className="hidden cursor-pointer items-center gap-1.5 rounded-full bg-lilac-2 px-3 py-2 text-[12px] font-extrabold text-ink md:flex"
        >
          <MapPin size={13} className="text-primary" stroke={2.4} />
          {app.city}
        </button>
        <div className="ml-auto flex items-center gap-2.5">
          <LangToggle />
          <button onClick={() => go("/entrar")} className="hidden cursor-pointer text-[13px] font-extrabold text-ink-soft md:block">
            {L('Iniciar sesión', 'Log in')}
          </button>
          <button onClick={() => go("/entrar")} className="cursor-pointer rounded-btn bg-ink px-4 py-2.5 text-[13px] font-extrabold text-white">
            {L('Comenzar gratis', 'Get started')}
          </button>
        </div>
      </div>

      {/* hero */}
      <div className="relative overflow-hidden px-4 pb-8 pt-6 md:px-6 md:pb-10 md:pt-8 lg:px-10 lg:pb-[58px] lg:pt-[52px]" style={{ background: 'linear-gradient(160deg,#F1ECFC 0%,#ECE7FB 46%,#F6EEF6 100%)' }}>
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[rgba(123,97,255,.1)]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[rgba(244,183,64,.12)]" />
        <div className="relative mx-auto flex max-w-[1180px] flex-col items-center gap-7 md:flex-row md:gap-6 lg:gap-[46px]">
          <div className="flex w-full min-w-0 flex-col items-center text-center md:flex-1 md:items-start md:text-left">
            <span className="rounded-full bg-white px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[.05em] text-primary-dark shadow-card">
              {L('De latinos para latinos', 'By Latinos, for Latinos')}
            </span>
            <h1 className="mt-3.5 text-[30px] font-extrabold leading-[1.1] tracking-[-.03em] text-balance md:text-[38px] lg:text-[52px]">
              {L('Tu gente, tu barrio,', 'Your people, your block,')}
              <br />
              <span className="text-primary">{L('tu idioma.', 'your language.')}</span>
            </h1>
            <p className="mt-3 max-w-[460px] text-[14.5px] font-medium leading-[1.55] text-ink-3 text-pretty md:text-[16px]">
              {L(
                `Descubre negocios, eventos y vecinos de confianza cerca de ti — todo en español, en ${app.cityShort}.`,
                `Discover trusted businesses, events and neighbors near you — all in Spanish, in ${app.cityShort}.`,
              )}
            </p>

            {/* hero search — hidden on mobile per handoff */}
            <div className="mt-[22px] hidden w-full max-w-[440px] items-center gap-2.5 rounded-btn-lg border border-hair bg-white py-[7px] pl-[15px] pr-[7px] shadow-[0_12px_30px_rgba(60,50,110,.1)] md:flex">
              <Search size={16} className="flex-none text-primary" stroke={2.2} />
              <input
                value={app.query}
                onChange={(e) => app.setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && app.query.trim()) {
                    app.setSearch(app.query.trim());
                    app.setQuery('');
                    go(VIEW_PATH.negocios);
                  }
                }}
                placeholder={L('Busca tacos, mecánico, salón…', 'Search tacos, mechanic, salon…')}
                className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] font-medium outline-none placeholder:text-muted"
              />
              <button
                onClick={() => {
                  if (app.query.trim()) {
                    app.setSearch(app.query.trim());
                    app.setQuery('');
                  }
                  go(VIEW_PATH.negocios);
                }}
                className="flex-none cursor-pointer rounded-field bg-primary px-4 py-2.5 text-[12.5px] font-extrabold text-white"
              >
                {L('Entrar', 'Enter')}
              </button>
            </div>

            <div className="mt-5 flex w-full flex-col gap-[11px] md:w-auto md:flex-row">
              <button onClick={() => go("/entrar")} className="w-full cursor-pointer rounded-btn-lg bg-primary px-[22px] py-[15px] text-[15px] font-extrabold text-white shadow-cta md:w-auto md:px-[26px]">
                {L('Comenzar gratis', 'Get started — free')}
              </button>
              <button onClick={() => go("/entrar")} className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-[#D8D2EC] bg-white px-[22px] py-[15px] text-[15px] font-extrabold text-ink-soft md:w-auto">
                {L('Ya tengo cuenta', 'I have an account')}
              </button>
            </div>

            <div className="mt-[22px] flex items-center justify-center gap-[11px] md:justify-start">
              <span className="flex">
                {['CR', 'MG', 'DL', 'JP'].map((ini, i) => (
                  <Avatar key={ini} initials={ini} color={AVATAR_PALETTE[i]} size={30} className={`border-2 border-white text-[10px] ${i > 0 ? '-ml-2.5' : ''}`} />
                ))}
              </span>
              <span className="text-[12px] font-bold text-ink-3">
                {L('+9,000 vecinos ya están dentro en', '+9,000 neighbors already inside in')} <span className="font-extrabold text-ink">{app.cityShort}</span>
              </span>
            </div>

            <div className="mt-[22px] flex justify-center gap-[22px] md:justify-start lg:gap-[34px]">
              {stats.map((s) => (
                <span key={s.l}>
                  <span className="block text-[20px] font-extrabold tracking-[-.02em] text-ink">{s.v}</span>
                  <span className="block text-[11.5px] font-bold text-muted">{s.l}</span>
                </span>
              ))}
            </div>
          </div>

          {/* floating collage */}
          <div className="w-[300px] max-w-full flex-none lg:w-[404px]">
            <div className="relative h-[360px] lg:h-[420px]">
              <div className="absolute left-0 top-2 w-[78%] -rotate-[4deg] rounded-card-sm border border-hair bg-white p-3.5 shadow-card-lg">
                <div className="flex items-center gap-2">
                  <Avatar initials="MG" color="#7B61FF" size={30} />
                  <div>
                    <div className="text-[12px] font-extrabold">María G.</div>
                    <div className="text-[10px] font-semibold text-muted-2">Spring Branch</div>
                  </div>
                  <span className="ml-auto rounded-md bg-lilac px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase text-primary-dark">
                    {L('Pregunta', 'Asking')}
                  </span>
                </div>
                <div className="mt-2 text-[12px] font-medium leading-snug text-ink-body">
                  {L('¿Un buen mecánico por Spring Branch? 🙏', 'A good mechanic near Spring Branch? 🙏')}
                </div>
                <div className="mt-2 text-[10.5px] font-extrabold text-pink">♥ {L('12 recomiendan', '12 recommend')}</div>
              </div>
              <div className="absolute right-0 top-[130px] w-[72%] rotate-[3deg] rounded-card-sm border border-hair bg-white p-3.5 shadow-card-lg lg:top-[150px]">
                <span className="block h-[60px] rounded-[10px]" style={{ background: tile('#ECE3F8', '#E3D7F4') }} />
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[12.5px] font-extrabold">Taquería La Esperanza</span>
                </div>
                <div className="text-[10.5px] font-bold text-muted">{L('Comida Mexicana', 'Mexican Food')}</div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-extrabold">
                  <Stars className="text-[9px]" /> 4.9
                </div>
              </div>
              <div className="absolute bottom-0 left-3 w-[68%] -rotate-[2deg] rounded-card-sm border border-hair bg-white p-3.5 shadow-card-lg">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 flex-none flex-col items-center justify-center rounded-[10px] bg-lilac">
                    <span className="text-[8px] font-extrabold uppercase text-primary-dark">{L('SÁB', 'SAT')}</span>
                    <span className="text-[14px] font-extrabold leading-none">21</span>
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-extrabold">{L('Pulga del Parque 59', 'Park 59 Flea Market')}</div>
                    <div className="text-[10.5px] font-bold text-green-dark">{L('240 asisten', '240 going')} · {L('Gratis', 'Free')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* categories */}
      <div className="mx-auto max-w-[1180px] px-4 py-8 md:px-6 md:py-10 lg:px-10 lg:py-[54px]">
        <h2 className="text-center text-[23px] font-extrabold tracking-[-.02em] text-balance md:text-[28px] lg:text-[34px]">
          {L('Todo lo que tu comunidad necesita', 'Everything your community needs')}
        </h2>
        <p className="mx-auto mt-2 max-w-[520px] text-center text-[13.5px] font-medium text-muted text-pretty md:text-[15px]">
          {L('Tres formas de vivir tu comunidad latina — y más en camino.', 'Three ways to live your Latino community — with more on the way.')}
        </p>
        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <button
              key={c.title}
              onClick={() => go(c.path)}
              className="cursor-pointer rounded-card border border-hair bg-white p-5 text-left shadow-card transition-shadow hover:shadow-card-lg"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-btn-lg" style={{ background: c.bg }}>
                  <c.Icon size={22} strokeWidth={2.2} style={{ color: c.color }} />
                </span>
                <span className="rounded-full bg-lilac-2 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.04em] text-muted">{c.kind}</span>
              </div>
              <div className="mt-3.5 text-[17px] font-extrabold">{c.title}</div>
              <div className="mt-1 text-[13px] font-medium leading-[1.5] text-ink-3">{c.desc}</div>
              <div className="mt-3 text-[13px] font-extrabold text-primary-dark">{L('Entrar', 'Enter')} →</div>
            </button>
          ))}
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {[
            L('Transporte', 'Transport'),
            L('Bienes Raíces', 'Real Estate'),
            L('Autos', 'Cars'),
            L('Trabajos', 'Jobs'),
          ].map((label) => (
            <span key={label} className="flex items-center justify-center gap-2 rounded-btn-lg border border-dashed border-[#D8D2EC] bg-white px-3 py-3 text-[12.5px] font-extrabold text-muted-faint2">
              {label}
              <SoonTag label={L('Pronto', 'Soon')} />
            </span>
          ))}
        </div>
      </div>

      {/* how it works */}
      <div className="bg-[#F7F5FC] px-4 py-8 md:px-6 md:py-10 lg:px-10 lg:py-[54px]">
        <h2 className="text-center text-[23px] font-extrabold tracking-[-.02em] md:text-[28px] lg:text-[34px]">{L('Así funciona', 'How it works')}</h2>
        <div className="mx-auto mt-7 grid max-w-[1000px] gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-card border border-hair bg-white p-5 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[15px] font-extrabold text-white">{s.n}</span>
              <div className="mt-3 text-[15px] font-extrabold">{s.t}</div>
              <div className="mt-1 text-[13px] font-medium leading-[1.5] text-ink-3">{s.d}</div>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-6 grid max-w-[1000px] gap-3.5 md:grid-cols-3">
          {trust.map((t) => (
            <div key={t.t} className="flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3.5">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn" style={{ background: t.bg }}>
                <t.Icon size={18} strokeWidth={2.2} style={{ color: t.color }} />
              </span>
              <span>
                <span className="block text-[13.5px] font-extrabold">{t.t}</span>
                <span className="block text-[11.5px] font-semibold text-muted">{t.d}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* business band */}
      <div className="mx-auto max-w-[1180px] px-4 py-8 md:px-6 lg:px-10 lg:py-[54px]">
        <div
          className="relative flex flex-col items-start gap-[18px] overflow-hidden rounded-[22px] p-[26px] shadow-band md:flex-row md:items-center md:gap-[26px] md:rounded-[26px] md:p-10"
          style={{ background: 'linear-gradient(150deg,#6743E2,#8268FF)' }}
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-[24px] font-extrabold tracking-[-.02em] text-white md:text-[30px]">{L('¿Tienes un negocio?', 'Own a business?')}</h2>
            <p className="mt-1.5 max-w-[480px] text-[14px] font-medium leading-[1.5] text-[rgba(255,255,255,.85)]">
              {L('Publica gratis y llega a miles de clientes latinos en tu ciudad.', 'List free and reach thousands of Latino customers in your city.')}
            </p>
          </div>
          <button onClick={() => go('/negocio/publicar')} className="flex-none cursor-pointer rounded-btn-lg bg-white px-6 py-3.5 text-[14px] font-extrabold text-primary-press">
            {L('Publicar mi negocio', 'List my business')}
          </button>
        </div>
      </div>

      {/* footer */}
      <div className="mx-auto flex max-w-[1180px] flex-col items-start gap-4 border-t border-hair px-4 py-7 md:flex-row md:items-center md:px-10 md:py-9">
        <Wordmark />
        <span className="text-[12.5px] font-semibold text-muted">{L('De latinos para latinos.', 'By Latinos, for Latinos.')}</span>
        <span className="text-[12px] font-semibold text-muted-2 md:ml-auto">{L('Disponible en español e inglés', 'Available in Spanish & English')}</span>
      </div>

      <CityModal />
    </div>
  );
}
