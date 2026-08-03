'use client';

// Alta y entrada de usuario (`/entrar`).
//
// Handoff: "To'Latino — Onboarding & Auth Flow" (2026-08-02). Ocho pantallas —
// bienvenida · identidad · código · perfil · zona · intereses · listo · entrar —
// dentro de una tarjeta de dos columnas: panel de marca oscuro en escritorio, y
// a pantalla completa por debajo de 1000px, que es la experiencia real (99% del
// tráfico es móvil).
//
// La idea del handoff en una línea: *nadie debería necesitar una contraseña, una
// computadora ni inglés para entrar.*
//
// ── LO QUE SE APARTA DEL PROTOTIPO, Y POR QUÉ ────────────────────────────────
// 1. **Marca.** El prototipo aún usa el rombo ámbar; el propio handoff pide
//    corregirlo al logotipo nuevo. Hecho.
// 2. **Botones de Google / Apple / Facebook: FUERA** (decisión del fundador,
//    2026-08-02). Cada uno exige una app de desarrollador suya y claves en
//    Supabase; sin eso el botón falla al pulsarlo, que es exactamente el estado
//    roto que prohíbe la regla #8. Se añaden el día que existan las cuentas.
// 3. **`Demo: 000000 falla`: fuera.** Era andamio del prototipo.
// 4. **Colonias inventadas: fuera.** El prototipo trae "East End · 8.2k vecinos
//    · 186 negocios". No tenemos datos de colonias, y fabricarlos en la pantalla
//    donde el usuario decide si confía sería lo más dañino posible. En su lugar
//    se elige CIUDAD, que es la unidad real de la app, contra nuestro propio
//    listado (`search_cities`).
// 5. **Las tres cifras de la zona son REALES** (`zone_stats`, migración 0132).
//    La que venga en cero no se pinta: mejor dos cifras ciertas que tres
//    infladas.
// 6. **Contraseña como respaldo** (decisión del fundador). El camino principal
//    es sin contraseña, pero queda una puerta con contraseña para quien ya
//    tiene cuenta: si el correo o el SMS fallan, sin ella NADIE puede entrar.
// 7. **Reenvío a 60s, no a 32.** Supabase rechaza un reenvío antes de 60
//    segundos; con 32 el botón se habilitaría solo para dar un error.
//
// ── ACCESIBILIDAD que el handoff pide cerrar, cerrada ────────────────────────
// Anillos de foco visibles; cada casilla del código con su `aria-label` y
// `autocomplete="one-time-code"` en la primera (para el autorrelleno del SMS);
// el aviso de error como `role="alert"`; la cuenta atrás con `aria-live`; la
// lista de ciudades como `role="radiogroup"` de verdad; y todo lo pulsable es un
// `<button>`, no un `<span>` con onClick.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconAlertCircle as AlertCircle, IconArrowRight as ArrowRight, IconBell as Bell,
  IconBriefcase as Briefcase, IconBuildingStore as Store, IconCalendar as Calendar,
  IconCamera as Camera, IconCar as Car, IconCheck as Check, IconChevronLeft as ChevronLeft,
  IconGlobe as Globe,
  IconHeartbeat as Heartbeat, IconHome as HomeIcon, IconLock as Lock, IconMail as Mail,
  IconMapPin as MapPin, IconMessageCircle as MessageSquare, IconPackage as Package,
  IconPhone as Phone, IconSearch as Search, IconShieldCheck as ShieldCheck,
  IconToolsKitchen2 as Utensils, IconTool as Wrench, IconTruck as Truck, IconUser as UserIcon,
} from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth, authErrorText } from '@/lib/auth';
import { Avatar, LogoMark } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAvatarUpload } from '@/lib/avatarUpload';
import {
  POPULAR_CITIES, getBrowserLocation, isCoordLabel, nearestCity, searchCities, type Place,
} from '@/lib/geo';

type Step = 'welcome' | 'method' | 'otp' | 'profile' | 'location' | 'interests' | 'done' | 'login';
type Geo = 'ask' | 'detecting' | 'found' | 'manual' | 'denied';
type Channel = 'sms' | 'email';

const SIGNUP_STEPS: Step[] = ['method', 'otp', 'profile', 'location', 'interests'];
const BACK: Partial<Record<Step, Step>> = {
  method: 'welcome', otp: 'method', profile: 'otp', location: 'profile', interests: 'location', login: 'welcome',
};
/** Supabase rechaza un reenvío antes de 60s: la cuenta atrás lo respeta. */
const RESEND_S = 60;

/** Las 10 del handoff. La CLAVE es lo que se guarda; la etiqueta solo se pinta. */
const INTERESTS: { k: string; es: string; en: string; c: string; bg: string; Icon: typeof Search }[] = [
  { k: 'food', es: 'Comida y pedidos', en: 'Food & orders', c: '#D6336C', bg: '#FDE7EF', Icon: Utensils },
  { k: 'serv', es: 'Servicios y citas', en: 'Services & booking', c: '#0E9488', bg: '#DCF3F0', Icon: Wrench },
  { k: 'evt', es: 'Eventos y boletos', en: 'Events & tickets', c: '#9A6A12', bg: '#FCEFD6', Icon: Calendar },
  { k: 'rent', es: 'Renta de artículos', en: 'Rentals', c: '#E8954A', bg: '#FCE9D6', Icon: Package },
  { k: 're', es: 'Bienes raíces', en: 'Real estate', c: '#2A6CB0', bg: '#E4EEFB', Icon: HomeIcon },
  { k: 'auto', es: 'Autos y dealers', en: 'Autos & dealers', c: '#1F9D57', bg: '#E3F5EA', Icon: Car },
  { k: 'job', es: 'Empleos', en: 'Jobs', c: '#6D4DF6', bg: '#EFEBFF', Icon: Briefcase },
  { k: 'trans', es: 'Transporte', en: 'Transportation', c: '#B0357E', bg: '#F7E6F1', Icon: Truck },
  { k: 'health', es: 'Salud y bienestar', en: 'Health & wellness', c: '#0E9488', bg: '#DCF3F0', Icon: Heartbeat },
  { k: 'com', es: 'Comunidad', en: 'Community', c: '#7B61FF', bg: '#EFEBFF', Icon: MessageSquare },
];

type Stats = { businesses: number; events: number; neighbors: number };

/** 7135550142 → "(713) 555-0142". Se formatea mientras se escribe. */
function formatUsPhone(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function OnboardingScreen() {
  const { L, lang, setLang } = useLang();
  const app = useApp();
  const auth = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('welcome');
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // identidad
  const [channel, setChannel] = useState<Channel>('sms');
  const [phone, setPhone] = useState('');   // solo dígitos
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [resendIn, setResendIn] = useState(RESEND_S);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  // perfil
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const photo = useAvatarUpload();

  // zona
  const [geo, setGeo] = useState<Geo>('ask');
  const [place, setPlace] = useState<Place | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const [cityHits, setCityHits] = useState<Place[]>([]);

  // intereses
  const [picked, setPicked] = useState<Record<string, true>>({});

  // respaldo con contraseña
  const [pwOpen, setPwOpen] = useState(false);
  const [pwEmail, setPwEmail] = useState('');
  const [pw, setPw] = useState('');

  const target = channel === 'sms' ? `+1${phone}` : email.trim().toLowerCase();
  const targetLabel = channel === 'sms' ? `+1 ${formatUsPhone(phone)}` : email.trim().toLowerCase();

  // ── Ya hay sesión ─────────────────────────────────────────────────────────
  // Solo se mira desde las pantallas de ENTRADA. A media alta el usuario ya
  // tiene sesión (el código la abre) y sacarlo de aquí lo dejaría sin nombre,
  // sin zona y sin intereses.
  //
  // Y hay una segunda forma de llegar aquí CON sesión y sin alta hecha: un
  // enlace de acceso del correo. Supabase abre la sesión al aterrizar, pero el
  // alta no ha pasado. Antes se le mandaba a /comunidad y se quedaba para
  // siempre como "Vecino", sin ciudad y sin intereses — la cuenta existía pero
  // el alta nunca ocurría. Ahora se le deja EXACTAMENTE donde estaría si
  // hubiera escrito el código: en el paso del nombre.
  useEffect(() => {
    if (auth.loading || !auth.user) return;
    if (step !== 'welcome' && step !== 'login') return;
    if (!auth.profile) return; // aún cargando el perfil: no se decide todavía
    const n = (auth.profile.display_name ?? '').trim();
    if (!n || n === 'Vecino') { setMode('signup'); setStep('profile'); return; }
    router.replace('/comunidad/');
  }, [auth.loading, auth.user, auth.profile, step, router]);

  // El botón que se pulsó MANDA. Si dice "Regístrate" se abre el alta; si dice
  // "Entrar" se abre la entrada. Antes ambos caían en la bienvenida, que es una
  // pantalla de alta ("Crea tu cuenta en menos de un minuto"), así que quien ya
  // tenía cuenta y pulsaba Entrar acababa leyendo cómo registrarse. Cambiar de
  // uno a otro se puede, pero ya dentro y a propósito, con el enlace del pie.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('crear') === '1') { setMode('signup'); setStep('method'); }
    else if (q.get('entrar') === '1') { setMode('login'); setStep('login'); }
  }, []);

  // Cuenta atrás del reenvío: solo corre en la pantalla del código.
  useEffect(() => {
    if (step !== 'otp' || resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, resendIn]);

  // Buscador de ciudades (modo manual), con freno para no consultar en cada tecla.
  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 2) { setCityHits([]); return; }
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      searchCities(q, ctrl.signal).then(setCityHits).catch(() => setCityHits([]));
    }, 220);
    return () => { window.clearTimeout(t); ctrl.abort(); };
  }, [cityQuery]);

  const loadStats = useCallback(async (p: Place) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.rpc('zone_stats', { user_lat: p.lat, user_lng: p.lng });
      if (!error && data) setStats(data as unknown as Stats);
    } catch { /* sin red: la pantalla simplemente no pinta cifras */ }
  }, []);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const sendCode = async () => {
    setErr(null);
    if (channel === 'sms' && phone.length !== 10) return setErr('bad_phone');
    if (channel === 'email' && !email.includes('@')) return setErr('bad_email');
    setBusy(true);
    const { error } = await auth.sendCode(target, channel);
    setBusy(false);
    if (error) return setErr(error);
    setCode(['', '', '', '', '', '']);
    setResendIn(RESEND_S);
    setStep('otp');
  };

  const resend = async () => {
    if (resendIn > 0 || busy) return;
    setErr(null);
    setBusy(true);
    const { error } = await auth.sendCode(target, channel);
    setBusy(false);
    if (error) return setErr(error);
    setCode(['', '', '', '', '', '']);
    setResendIn(RESEND_S);
  };

  const verify = async () => {
    const c = code.join('');
    if (c.length !== 6 || busy) return;
    setErr(null);
    setBusy(true);
    const { error } = await auth.verifyCode(target, channel, c);
    if (error) { setBusy(false); setCode(['', '', '', '', '', '']); boxes.current[0]?.focus(); return setErr(error); }

    // ¿Es alguien que vuelve o alguien nuevo? No se decide por el botón que
    // pulsó, sino por si su perfil ya tiene nombre: quien pulsa "Inicia sesión"
    // sin tener cuenta acaba de crearla y TIENE que completar el alta.
    let vuelve = false;
    try {
      const { data: u } = await supabase!.auth.getUser();
      if (u?.user) {
        const { data: p } = await supabase!.from('profiles').select('display_name, interests, city_label').eq('id', u.user.id).maybeSingle();
        const n = (p?.display_name ?? '').trim();
        vuelve = !!n && n !== 'Vecino';
        if (vuelve) {
          const parts = n.split(' ');
          setFirst(parts[0] ?? '');
          setLast(parts.slice(1).join(' '));
        }
      }
    } catch { /* si falla la consulta se sigue por el camino de alta */ }
    setBusy(false);
    setStep(vuelve ? 'done' : 'profile');
    setMode(vuelve ? 'login' : 'signup');
  };

  /** Guarda en el perfil. Reintenta una vez: justo tras validar el código la
   *  sesión puede tardar un instante en llegar al contexto de auth. */
  const savePatch = async (patch: Record<string, unknown>) => {
    const r = await auth.updateProfile(patch);
    if (r.error !== 'no-user') return r;
    await new Promise((res) => setTimeout(res, 600));
    return auth.updateProfile(patch);
  };

  const saveName = async () => {
    if (!first.trim() || busy) return;
    setBusy(true);
    await savePatch({ display_name: `${first.trim()} ${last.trim()}`.trim() });
    setBusy(false);
    setStep('location');
  };

  // La foto de perfil se sube en cuanto se elige, no al pulsar "Continuar": si
  // el usuario cierra la pestaña a media alta, la foto ya quedó guardada. Toda
  // la mecánica (comprimir, subir, guardar, borrar la anterior, revertir si
  // falla) vive en `useAvatarUpload`, compartida con Mi cuenta.

  const useMyLocation = async () => {
    setErr(null);
    setGeo('detecting');
    try {
      const { lat, lng } = await getBrowserLocation();
      const p = await nearestCity(lat, lng);
      if (!p?.label || isCoordLabel(p.label)) { setGeo('manual'); return; }
      setPlace(p);
      setGeo('found');
      loadStats(p);
    } catch {
      setGeo('denied');
    }
  };

  const confirmPlace = async (p: Place) => {
    setBusy(true);
    app.setCityWithCoords(p.label, { lat: p.lat, lng: p.lng });
    await auth.saveLocation({ label: p.label, lat: p.lat, lng: p.lng });
    setBusy(false);
    setStep('interests');
  };

  const finish = async (keys: string[]) => {
    setBusy(true);
    if (keys.length) await savePatch({ interests: keys });
    setBusy(false);
    setStep('done');
  };

  const enterApp = () => router.push('/comunidad/');

  const signInPassword = async () => {
    setErr(null);
    if (!pwEmail.includes('@') || !pw) return setErr('invalid_login');
    setBusy(true);
    const { error } = await auth.signIn(pwEmail, pw);
    setBusy(false);
    if (error) return setErr(error);
    router.push('/comunidad/');
  };

  // ── Piezas visuales ───────────────────────────────────────────────────────
  const si = SIGNUP_STEPS.indexOf(step);
  const pct = si >= 0 ? Math.round(((si + 1) / SIGNUP_STEPS.length) * 100) : 0;
  const initials = ((first.trim()[0] ?? '') + (last.trim()[0] ?? '')).toUpperCase() || L('TÚ', 'YOU');
  const pickedKeys = Object.keys(picked);

  const Cta = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={on && !busy ? onClick : undefined} disabled={!on || busy} aria-disabled={!on || busy}
            className={`tl-focus mt-[22px] flex w-full items-center justify-center gap-2 rounded-btn-lg px-4 py-[15px] text-[14.5px] font-extrabold text-white ${on && !busy ? 'cursor-pointer bg-primary' : 'cursor-default bg-auth-off'}`}
            style={on && !busy ? { boxShadow: '0 14px 30px rgba(123,97,255,.34)' } : undefined}>
      {children}
    </button>
  );

  const Err = () => (err ? (
    <div role="alert" className="mt-[13px] flex items-center gap-2 rounded-[12px] bg-pink-bg px-[13px] py-[11px]">
      <AlertCircle size={15} stroke={2.2} className="flex-none text-rose" aria-hidden />
      <span className="text-[11.5px] font-bold text-rose-ink">{authErrorText(err, L)}</span>
    </div>
  ) : null);

  const H1 = ({ children }: { children: React.ReactNode }) => (
    <h1 className="tl-h1 font-extrabold leading-[1.2] tracking-[-.03em] text-ink" style={{ fontSize: 26 }}>{children}</h1>
  );
  const Sub = ({ children }: { children: React.ReactNode }) => (
    <p className="mt-[9px] text-[13.5px] font-medium leading-[1.6] text-home-mute">{children}</p>
  );
  const Label = ({ children }: { children: React.ReactNode }) => (
    <span className="mb-[7px] block text-[11px] font-extrabold text-home-ink">{children}</span>
  );
  const field = 'w-full rounded-[13px] border-[1.5px] border-auth-line bg-white px-[15px] py-[13px] text-[14px] font-semibold text-ink outline-none focus:border-primary';

  return (
    <div className="tl-shell flex min-h-[100svh] items-center justify-center bg-app px-5 py-[34px]">
      <div className="tl-cardwrap flex w-full max-w-[1060px] overflow-hidden rounded-[28px]" style={{ boxShadow: '0 30px 80px rgba(60,50,110,.2)' }}>

        {/* ══════ PANEL DE MARCA (solo escritorio) ══════ */}
        <aside className="tl-brandpanel relative hidden min-w-0 flex-col overflow-hidden p-[38px_38px] min-[1001px]:flex"
               style={{ flex: '1 1 44%', background: 'linear-gradient(155deg,#2A2440,#171426 60%,#1E1B2E)' }}>
          <span aria-hidden className="pointer-events-none absolute" style={{ top: -120, right: -90, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(123,97,255,.34), transparent 68%)' }} />
          <span aria-hidden className="pointer-events-none absolute" style={{ bottom: -140, left: -70, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(214,51,108,.22), transparent 70%)' }} />
          <div className="relative flex items-baseline">
            <span className="text-[24px] font-extrabold tracking-[-.03em] text-white">To&rsquo;</span>
            <span className="text-[24px] font-extrabold tracking-[-.03em] text-auth-soft">Latino</span>
            <LogoMark size={21} color="#8B6BFF" className="ml-1.5 self-center" />
          </div>
          <div className="relative mt-auto">
            <p className="text-[30px] font-extrabold leading-[1.2] tracking-[-.03em] text-white" style={{ textWrap: 'balance' }}>
              {L('Tu comunidad latina, verificada y en tu idioma.', 'Your Latino community, verified and in your language.')}
            </p>
            <p className="mt-3 text-[14px] font-medium leading-[1.6]" style={{ color: 'rgba(255,255,255,.6)' }}>
              {L('Crea tu cuenta una vez y entra a comida, servicios, eventos, renta, casas, autos y empleos cerca de ti.',
                 'Create your account once and get into food, services, events, rentals, homes, autos and jobs near you.')}
            </p>
            <ul className="mt-6 flex flex-col gap-[11px]">
              {[
                { Icon: ShieldCheck, es: 'Verificamos cada negocio', en: 'We verify every business' },
                { Icon: Globe, es: 'Todo en español o inglés', en: 'Everything in Spanish or English' },
                { Icon: MapPin, es: 'Solo lo que hay cerca de ti', en: 'Only what is near you' },
                { Icon: Bell, es: 'Sin spam, tú eliges qué recibes', en: 'No spam, you choose what you get' },
              ].map((p) => (
                <li key={p.es} className="flex items-center gap-[11px]">
                  <span aria-hidden className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px]" style={{ background: 'rgba(255,255,255,.09)' }}>
                    <p.Icon size={15} stroke={2.2} className="text-auth-pale" />
                  </span>
                  <span className="text-[12.5px] font-semibold" style={{ color: 'rgba(255,255,255,.78)' }}>{L(p.es, p.en)}</span>
                </li>
              ))}
            </ul>
            {/* El handoff pone aquí "48,204 vecinos y 1,284 negocios" con cuatro
                caras inventadas. Eso es prueba social falsa en el momento en que
                el usuario decide si confía. Se pinta SOLO si las cifras reales
                de su zona existen; hoy, recién lanzados, no aparece nada. */}
            {stats && (stats.neighbors > 0 || stats.businesses > 0) && (
              <p className="mt-7 border-t pt-[22px] text-[11.5px] font-semibold leading-[1.45]"
                 style={{ borderColor: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.55)' }}>
                {[
                  stats.neighbors > 0 ? `${stats.neighbors.toLocaleString('en-US')} ${L('vecinos', 'neighbors')}` : null,
                  stats.businesses > 0 ? `${stats.businesses.toLocaleString('en-US')} ${L('negocios', 'businesses')}` : null,
                ].filter(Boolean).join(L(' y ', ' and '))} {L('en', 'in')} {place?.label ?? app.cityShort}
              </p>
            )}
          </div>
        </aside>

        {/* ══════ TARJETA ══════ */}
        <main className="tl-authcard flex min-w-0 flex-col bg-white" style={{ flex: '1 1 56%', maxWidth: 520 }}>
          {/* cabecera */}
          <div className="tl-pad flex flex-none items-center gap-[11px] px-[34px] pt-5">
            {BACK[step] ? (
              <button onClick={() => { setErr(null); setStep(BACK[step]!); }} aria-label={L('Volver', 'Back')}
                      className="tl-focus flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-[11px] bg-app">
                <ChevronLeft size={17} stroke={2.4} className="text-ink" aria-hidden />
              </button>
            ) : (
              <span className="flex flex-none items-baseline">
                <span className="text-[20px] font-extrabold tracking-[-.03em] text-ink">To&rsquo;</span>
                <span className="text-[20px] font-extrabold tracking-[-.03em] text-primary">Latino</span>
                <LogoMark size={17} className="ml-1 self-center" />
              </span>
            )}
            <span className="flex-1" />
            <div role="group" aria-label={L('Idioma', 'Language')} className="flex flex-none rounded-full bg-lilac-2 p-[3px]">
              {(['es', 'en'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                        className={`tl-focus cursor-pointer rounded-full px-[11px] py-[5px] text-[11px] font-extrabold uppercase ${lang === l ? 'bg-primary text-white' : 'text-muted'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* progreso */}
          {si >= 0 && (
            <div className="tl-pad flex-none px-[34px] pt-4">
              <div className="mb-[7px] flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-[.08em] text-muted-2">
                  {L('Paso ', 'Step ')}{si + 1}{L(' de ', ' of ')}{SIGNUP_STEPS.length}
                </span>
                <span className="text-[10px] font-extrabold text-primary-dark">{pct}%</span>
              </div>
              <div className="h-[5px] overflow-hidden rounded-full bg-auth-track">
                <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#7B61FF,#B0357E)' }} />
              </div>
            </div>
          )}

          {/* cuerpo */}
          <div className="no-scrollbar flex-1 overflow-y-auto">
            <div className="tl-pad px-[34px] pb-[30px] pt-[26px]">

              {/* ─────────── BIENVENIDA ─────────── */}
              {step === 'welcome' && (
                <div className="tl-pop">
                  <span className="inline-flex items-center gap-[7px] rounded-full bg-lilac-2 px-3 py-[6px]" style={{ border: '1px solid rgba(123,97,255,.18)' }}>
                    <i aria-hidden className="tl-pulse h-[6px] w-[6px] rounded-full bg-green" />
                    <span className="text-[11px] font-bold text-home-badge">{L('Gratis para siempre para usuarios', 'Free forever for users')}</span>
                  </span>
                  <div className="mt-4"><H1>{L('Bienvenido a To’Latino', 'Welcome to To’Latino')}</H1></div>
                  <Sub>{L('Crea tu cuenta en menos de un minuto. Solo necesitas tu teléfono.', 'Create your account in under a minute. All you need is your phone.')}</Sub>
                  <Cta on onClick={() => { setMode('signup'); setChannel('sms'); setStep('method'); }}>
                    <Phone size={17} stroke={2.2} aria-hidden /> {L('Continuar con mi teléfono', 'Continue with my phone')}
                  </Cta>
                  <p className="mt-[18px] text-center text-[13px] font-semibold text-home-mute">
                    {L('¿Ya tienes cuenta?', 'Already have an account?')}{' '}
                    <button onClick={() => { setMode('login'); setStep('login'); }} className="tl-focus cursor-pointer font-extrabold text-primary-dark">
                      {L('Inicia sesión', 'Log in')}
                    </button>
                  </p>
                  <p className="mt-5 text-center text-[11px] font-medium leading-[1.5] text-muted-2">
                    {L('Al continuar aceptas nuestros ', 'By continuing you accept our ')}
                    <a href="/terminos/" className="font-bold text-primary-dark">{L('Términos', 'Terms')}</a>
                    {L(' y el ', ' and the ')}
                    <a href="/privacidad/" className="font-bold text-primary-dark">{L('Aviso de privacidad', 'Privacy Notice')}</a>.
                  </p>
                </div>
              )}

              {/* ─────────── IDENTIDAD ─────────── */}
              {step === 'method' && (
                <div className="tl-pop">
                  <H1>{channel === 'sms' ? L('¿Cuál es tu número?', 'What is your number?') : L('¿Cuál es tu correo?', 'What is your email?')}</H1>
                  <Sub>{L('Te enviamos un código de 6 dígitos para confirmar que eres tú. Sin contraseñas que olvidar.',
                          'We send you a 6-digit code to confirm it is you. No passwords to forget.')}</Sub>

                  <div role="tablist" aria-label={L('Cómo recibir el código', 'How to get the code')} className="mt-[22px] flex gap-1 rounded-[13px] bg-app p-1">
                    {([['sms', 'Teléfono', 'Phone', Phone], ['email', 'Correo', 'Email', Mail]] as const).map(([k, e, en, Icon]) => {
                      const on = channel === k;
                      return (
                        <button key={k} role="tab" aria-selected={on} onClick={() => { setChannel(k); setErr(null); }}
                                className={`tl-focus flex flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-[10px] px-2 py-[11px] text-[12.5px] font-extrabold ${on ? 'bg-white text-ink' : 'text-muted'}`}
                                style={on ? { boxShadow: '0 2px 8px rgba(60,50,110,.12)' } : undefined}>
                          <Icon size={15} stroke={2.2} className={on ? 'text-primary-dark' : 'text-muted-2'} aria-hidden />
                          {L(e, en)}
                        </button>
                      );
                    })}
                  </div>

                  {channel === 'sms' ? (
                    <div className="mt-[18px]">
                      <Label>{L('Número de teléfono', 'Phone number')}</Label>
                      <div className="flex gap-[9px]">
                        {/* Prefijo fijo, no un botón: hoy solo se manda a EE. UU.
                            Un selector de país que no selecciona sería un botón
                            roto. Anotado en LAUNCH-CHECKLIST. */}
                        <span className="flex flex-none items-center gap-[7px] rounded-[13px] border-[1.5px] border-auth-line px-[13px] text-[13.5px] font-extrabold text-ink">
                          <span aria-hidden>🇺🇸</span> +1
                        </span>
                        <input value={formatUsPhone(phone)} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                               onKeyDown={(e) => { if (e.key === 'Enter') sendCode(); }}
                               inputMode="tel" autoComplete="tel-national" placeholder="(713) 555-0142"
                               aria-label={L('Número de teléfono', 'Phone number')}
                               className={`${field} flex-1 !text-[15px] !font-bold`} />
                      </div>
                      <p className="mt-3 flex items-start gap-2 rounded-[12px] bg-green-bg2 px-[13px] py-[11px] text-[11px] font-semibold leading-[1.45] text-green-ink">
                        <ShieldCheck size={15} stroke={2.2} className="mt-[1px] flex-none text-green" aria-hidden />
                        {L('Te llega un SMS. Nunca compartimos tu número con los negocios sin tu permiso.',
                           'You get an SMS. We never share your number with businesses without your permission.')}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-[18px]">
                      <Label>{L('Correo electrónico', 'Email address')}</Label>
                      <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendCode(); }}
                             type="email" inputMode="email" autoComplete="email" placeholder="tu@correo.com"
                             aria-label={L('Correo electrónico', 'Email address')} className={field} />
                      <p className="mt-3 flex items-start gap-2 rounded-[12px] bg-lilac-2 px-[13px] py-[11px] text-[11px] font-semibold leading-[1.45] text-home-badge">
                        <Mail size={15} stroke={2.2} className="mt-[1px] flex-none text-primary-dark" aria-hidden />
                        {L('Te enviamos el código de 6 dígitos a tu correo.', 'We send the 6-digit code to your email.')}
                      </p>
                    </div>
                  )}

                  <Err />
                  <Cta on={channel === 'sms' ? phone.length === 10 : email.includes('@')} onClick={sendCode}>
                    {busy ? L('Enviando…', 'Sending…') : L('Enviarme el código', 'Send me the code')}
                  </Cta>

                  {/* La salida hacia el otro camino. Existe la inversa en la
                      pantalla de entrada ("¿No tienes cuenta? Créala ahora"):
                      desde cualquiera de las dos se puede cruzar, pero eligiendo. */}
                  <p className="mt-5 text-center text-[13px] font-semibold text-home-mute">
                    {L('¿Ya tienes cuenta?', 'Already have an account?')}{' '}
                    <button onClick={() => { setMode('login'); setErr(null); setStep('login'); }} className="tl-focus cursor-pointer font-extrabold text-primary-dark">
                      {L('Entrar', 'Log in')}
                    </button>
                  </p>
                </div>
              )}

              {/* ─────────── CÓDIGO ─────────── */}
              {step === 'otp' && (
                <div className="tl-pop">
                  <span aria-hidden className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-lilac-2">
                    <MessageSquare size={25} stroke={2} className="text-primary-dark" />
                  </span>
                  <div className="mt-4"><H1>{L('Escribe tu código', 'Enter your code')}</H1></div>
                  <p className="mt-[9px] text-[13.5px] font-medium leading-[1.6] text-home-mute">
                    {L('Enviamos un código de 6 dígitos a', 'We sent a 6-digit code to')}{' '}
                    <span className="font-extrabold text-ink">{targetLabel}</span>{' '}
                    <button onClick={() => setStep('method')} className="tl-focus cursor-pointer whitespace-nowrap font-extrabold text-primary-dark">
                      {L('Cambiar', 'Change')}
                    </button>
                  </p>

                  <div className="mt-[22px] flex justify-between gap-2">
                    {code.map((v, i) => (
                      <input key={i} ref={(el) => { boxes.current[i] = el; }} value={v}
                             aria-label={L(`Dígito ${i + 1} de 6`, `Digit ${i + 1} of 6`)}
                             autoComplete={i === 0 ? 'one-time-code' : 'off'}
                             inputMode="numeric" maxLength={1}
                             onChange={(e) => {
                               const d = e.target.value.replace(/\D/g, '').slice(-1);
                               const next = code.slice(); next[i] = d; setCode(next); setErr(null);
                               if (d && i < 5) boxes.current[i + 1]?.focus();
                             }}
                             onKeyDown={(e) => { if (e.key === 'Backspace' && !code[i] && i > 0) boxes.current[i - 1]?.focus(); }}
                             onPaste={(e) => {
                               // Pegar el código completo debe llenar las seis casillas,
                               // no solo la primera: es lo que hace todo el mundo.
                               const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                               if (t.length > 1) { e.preventDefault(); const n = ['', '', '', '', '', '']; t.split('').forEach((d, j) => { n[j] = d; }); setCode(n); boxes.current[Math.min(t.length, 5)]?.focus(); }
                             }}
                             className={`tl-otp tl-focus h-[58px] w-[48px] rounded-btn-lg border-[1.8px] text-center text-[23px] font-extrabold text-ink outline-none ${err ? 'border-rose' : v ? 'border-primary bg-home-tint' : 'border-auth-line bg-white'}`} />
                    ))}
                  </div>

                  <Err />

                  <div className="mt-4 flex items-center gap-2">
                    {resendIn > 0 ? (
                      <span aria-live="polite" className="text-[12.5px] font-semibold text-muted-2">
                        {L('Reenviar en ', 'Resend in ')}{resendIn}s
                      </span>
                    ) : (
                      <button onClick={resend} className="tl-focus cursor-pointer text-[12.5px] font-extrabold text-primary-dark">
                        {L('Reenviar código', 'Resend code')}
                      </button>
                    )}
                  </div>

                  <Cta on={code.join('').length === 6} onClick={verify}>
                    {busy ? L('Verificando…', 'Verifying…') : L('Verificar y continuar', 'Verify and continue')}
                  </Cta>
                </div>
              )}

              {/* ─────────── PERFIL ─────────── */}
              {step === 'profile' && (
                <div className="tl-pop">
                  <H1>{L('¿Cómo te llamamos?', 'What should we call you?')}</H1>
                  <Sub>{L('Así te ven los negocios cuando pides, reservas o preguntas.', 'This is how businesses see you when you order, book or ask.')}</Sub>
                  <div className="mt-[22px] flex items-center gap-[14px]">
                    <span aria-hidden className="relative flex-none">
                      <Avatar initials={initials} color="linear-gradient(140deg,#7B61FF,#B0357E)" src={photo.shown} size={64} radius={20} />
                      {photo.busy && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-[20px]" style={{ background: 'rgba(30,27,46,.5)' }}>
                          <span className="tl-spin block h-[18px] w-[18px] rounded-full border-2 border-white" style={{ borderTopColor: 'transparent' }} />
                        </span>
                      )}
                    </span>
                    <input ref={photo.inputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1}
                           onChange={(e) => photo.pick(e.target.files?.[0])} />
                    <div className="min-w-0">
                      <button type="button" onClick={photo.open} disabled={photo.busy}
                              className="tl-focus flex cursor-pointer items-center gap-2 rounded-[13px] border-[1.5px] border-dashed border-auth-line2 bg-page px-4 py-3 text-[12px] font-extrabold text-primary-dark disabled:cursor-default disabled:opacity-60">
                        <Camera size={15} stroke={2} aria-hidden />
                        {photo.busy
                          ? L('Subiendo…', 'Uploading…')
                          : photo.url ? L('Cambiar foto', 'Change photo') : L('Agregar foto', 'Add photo')}
                      </button>
                      {photo.url && !photo.busy ? (
                        <button type="button" onClick={photo.remove} className="tl-focus mt-[7px] cursor-pointer text-[11.5px] font-bold text-home-mute underline">
                          {L('Quitar foto', 'Remove photo')}
                        </button>
                      ) : (
                        !photo.url && (
                          <p className="mt-[7px] text-[11.5px] font-semibold leading-[1.45] text-home-mute">
                            {L('Opcional — también puedes ponerla después.', 'Optional — you can also add it later.')}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                  {photo.error && (
                    <div role="alert" className="mt-[11px] flex items-center gap-2 rounded-[12px] bg-pink-bg px-[13px] py-[10px]">
                      <AlertCircle size={15} stroke={2.2} className="flex-none text-rose" aria-hidden />
                      <span className="text-[11.5px] font-bold text-rose-ink">{photo.error}</span>
                    </div>
                  )}
                  <div className="tl-two mt-[18px] grid gap-3">
                    <div>
                      <Label>{L('Nombre', 'First name')} *</Label>
                      <input value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" placeholder="María"
                             aria-label={L('Nombre', 'First name')} className={field} />
                    </div>
                    <div>
                      <Label>{L('Apellido', 'Last name')}</Label>
                      <input value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" placeholder="Cruz"
                             aria-label={L('Apellido', 'Last name')} className={field} />
                    </div>
                  </div>
                  <div className="mt-[18px]">
                    <Label>{L('Idioma preferido', 'Preferred language')}</Label>
                    <div className="flex gap-[9px]">
                      {([['es', '🇲🇽 Español'], ['en', '🇺🇸 English']] as const).map(([k, lab]) => {
                        const on = lang === k;
                        return (
                          <button key={k} onClick={() => setLang(k)} aria-pressed={on}
                                  className={`tl-focus flex-1 cursor-pointer whitespace-nowrap rounded-[11px] border-[1.5px] px-[15px] py-[10px] text-[12px] font-extrabold ${on ? 'border-primary bg-home-tint text-primary-dark' : 'border-auth-line bg-white text-ink-soft'}`}>
                            {lab}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Cta on={!!first.trim()} onClick={saveName}>{L('Continuar', 'Continue')}</Cta>
                </div>
              )}

              {/* ─────────── ZONA ─────────── */}
              {step === 'location' && (
                <div className="tl-pop">
                  {geo === 'ask' && (
                    <>
                      <span aria-hidden className="relative flex h-[62px] w-[62px] items-center justify-center rounded-full bg-lilac-2">
                        <span className="tl-ring absolute inset-0 rounded-full" style={{ background: 'rgba(123,97,255,.28)' }} />
                        <MapPin size={27} stroke={2} className="relative text-primary-dark" />
                      </span>
                      <div className="mt-4"><H1>{L('¿Dónde estás?', 'Where are you?')}</H1></div>
                      <Sub>{L('Necesitamos tu zona para mostrarte solo negocios, eventos y empleos que están cerca — y para darte acceso a tu comunidad.',
                              'We need your area to show you only businesses, events and jobs nearby — and to give you access to your community.')}</Sub>
                      <ul className="mt-[22px] flex flex-col gap-[10px]">
                        {[
                          { Icon: MessageSquare, bg: '#EFEBFF', c: '#6D4DF6', t: ['Tu comunidad local', 'Your local community'], d: ['El feed y el chat de tu colonia', 'Your neighborhood feed and chat'] },
                          { Icon: MapPin, bg: '#E3F5EA', c: '#1F9D57', t: ['Solo lo que está cerca', 'Only what is nearby'], d: ['Negocios y empleos a minutos de ti', 'Businesses and jobs minutes away'] },
                          { Icon: Wrench, bg: '#E4EEFB', c: '#2A6CB0', t: ['Entregas y citas reales', 'Real delivery and booking'], d: ['Sabemos si te pueden entregar', 'We know if they can deliver to you'] },
                        ].map((r) => (
                          <li key={r.t[0]} className="flex items-center gap-[11px] rounded-btn-lg border border-auth-line p-[12px]">
                            <span aria-hidden className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[11px]" style={{ background: r.bg }}>
                              <r.Icon size={17} stroke={2.1} style={{ color: r.c }} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[12.5px] font-extrabold text-ink">{L(r.t[0], r.t[1])}</span>
                              <span className="block text-[11.5px] font-medium text-home-mute">{L(r.d[0], r.d[1])}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Cta on onClick={useMyLocation}>{L('Usar mi ubicación', 'Use my location')}</Cta>
                      <button onClick={() => setGeo('manual')} className="tl-focus mt-3 w-full cursor-pointer rounded-btn-lg border-[1.5px] border-auth-line bg-white py-[13px] text-[13px] font-extrabold text-ink-soft">
                        {L('Prefiero elegir mi zona', 'I would rather pick my area')}
                      </button>
                      <p className="mt-4 text-center text-[11px] font-medium leading-[1.5] text-muted-2">
                        {L('Solo usamos tu ubicación para acercarte lo local. Puedes cambiarla o apagarla cuando quieras.',
                           'We only use your location to bring you what is local. You can change or turn it off any time.')}
                      </p>
                    </>
                  )}

                  {geo === 'detecting' && (
                    <div className="flex flex-col items-center py-10 text-center">
                      <span aria-hidden className="tl-spin h-10 w-10 rounded-full border-[3px] border-lilac" style={{ borderTopColor: '#7B61FF' }} />
                      <p className="mt-5 text-[16px] font-extrabold text-ink">{L('Buscando tu zona…', 'Finding your area…')}</p>
                      <p className="mt-1 text-[12.5px] font-medium text-home-mute">{L('Esto toma un segundo', 'This takes a second')}</p>
                    </div>
                  )}

                  {geo === 'found' && place && (
                    <>
                      <H1>{L('¡Te encontramos!', 'Found you!')}</H1>
                      <Sub>{L('Confirma tu zona para entrar a tu comunidad. Puedes cambiarla después.', 'Confirm your area to enter your community. You can change it later.')}</Sub>
                      <div className="mt-[18px] flex items-center gap-[11px] rounded-[17px] border border-auth-line bg-app p-[14px]">
                        <span aria-hidden className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[12px] bg-primary">
                          <MapPin size={19} stroke={2.2} className="text-white" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-extrabold text-ink">{place.label}</span>
                          <span className="block text-[11.5px] font-semibold text-home-mute">{L('Tu zona en To’Latino', 'Your To’Latino area')}</span>
                        </span>
                      </div>
                      {/* Cifras REALES. La que venga en cero no se pinta. */}
                      {stats && (stats.businesses > 0 || stats.events > 0 || stats.neighbors > 0) && (
                        <div className="mt-3 grid grid-cols-3 divide-x divide-hair rounded-[17px] border border-auth-line py-3 text-center">
                          {[
                            { n: stats.neighbors, es: 'Vecinos', en: 'Neighbors' },
                            { n: stats.businesses, es: 'Negocios', en: 'Businesses' },
                            { n: stats.events, es: 'Eventos', en: 'Events' },
                          ].map((s) => (
                            <div key={s.es}>
                              <div className="text-[17px] font-extrabold text-ink">{s.n > 0 ? s.n.toLocaleString('en-US') : '—'}</div>
                              <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-muted-2">{L(s.es, s.en)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Cta on onClick={() => confirmPlace(place)}>{L('Entrar a mi comunidad', 'Enter my community')}</Cta>
                      <button onClick={() => { setGeo('manual'); setCityQuery(''); }} className="tl-focus mt-3 w-full cursor-pointer py-2 text-[12.5px] font-extrabold text-primary-dark">
                        {L('Cambiar mi zona', 'Change my area')}
                      </button>
                    </>
                  )}

                  {(geo === 'manual' || geo === 'denied') && (
                    <>
                      {geo === 'denied' && (
                        <p role="alert" className="mb-4 flex items-start gap-2 rounded-[12px] bg-amber-bg px-[13px] py-[11px] text-[11.5px] font-bold leading-[1.45] text-amber-ink">
                          <AlertCircle size={15} stroke={2.2} className="mt-[1px] flex-none" aria-hidden />
                          {L('No pudimos leer tu ubicación. No hay problema: elige tu zona a mano.', 'We could not read your location. No problem: pick your area manually.')}
                        </p>
                      )}
                      <H1>{L('Elige tu zona', 'Pick your area')}</H1>
                      <Sub>{L('Escoge la ciudad donde pasas más tiempo. Puedes cambiarla cuando quieras.', 'Choose the city where you spend most time. You can change it any time.')}</Sub>
                      <div className="relative mt-[18px]">
                        <Search size={17} stroke={2.2} className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-muted-2" aria-hidden />
                        <input value={cityQuery} onChange={(e) => setCityQuery(e.target.value)}
                               placeholder={L('Busca tu ciudad…', 'Search your city…')} aria-label={L('Busca tu ciudad', 'Search your city')}
                               className={`${field} !pl-[42px]`} />
                      </div>
                      <div role="radiogroup" aria-label={L('Ciudad', 'City')} className="mt-3 flex flex-col gap-2">
                        {(cityHits.length ? cityHits : POPULAR_CITIES).slice(0, 8).map((c) => {
                          const on = place?.label === c.label;
                          return (
                            <button key={c.label} role="radio" aria-checked={on}
                                    onClick={() => { setPlace(c); setStats(null); loadStats(c); }}
                                    className={`tl-focus flex cursor-pointer items-center gap-[11px] rounded-btn-lg border-[1.5px] p-[12px] text-left ${on ? 'border-primary bg-home-tint' : 'border-auth-line bg-white'}`}>
                              <span aria-hidden className={`h-[18px] w-[18px] flex-none rounded-full border-[2px] ${on ? 'border-primary bg-primary' : 'border-auth-line3 bg-white'}`}
                                    style={on ? { boxShadow: 'inset 0 0 0 3px #fff' } : undefined} />
                              <span className="min-w-0 flex-1 text-[13.5px] font-extrabold text-ink">{c.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <Cta on={!!place} onClick={() => place && confirmPlace(place)}>{L('Confirmar mi zona', 'Confirm my area')}</Cta>
                    </>
                  )}
                </div>
              )}

              {/* ─────────── INTERESES ─────────── */}
              {step === 'interests' && (
                <div className="tl-pop">
                  <H1>{L('¿Qué te interesa?', 'What are you into?')}</H1>
                  <Sub>{L('Elige al menos 3. Con eso ordenamos lo que ves primero, y lo puedes cambiar cuando quieras.',
                          'Pick at least 3. We use them to order what you see first, and you can change it any time.')}</Sub>
                  <div className="tl-two mt-[18px] grid gap-2">
                    {INTERESTS.map((it) => {
                      const on = !!picked[it.k];
                      return (
                        <button key={it.k} aria-pressed={on}
                                onClick={() => setPicked((m) => { const n = { ...m }; if (n[it.k]) delete n[it.k]; else n[it.k] = true; return n; })}
                                className={`tl-focus flex cursor-pointer items-center gap-[10px] rounded-btn-lg border-[1.5px] p-3 text-left ${on ? 'border-primary bg-home-tint' : 'border-auth-line bg-white'}`}>
                          <span aria-hidden className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[10px]" style={{ background: it.bg }}>
                            <it.Icon size={16} stroke={2.1} style={{ color: it.c }} />
                          </span>
                          <span className="min-w-0 flex-1 text-[12.5px] font-extrabold text-ink">{L(it.es, it.en)}</span>
                          {on && <Check size={15} stroke={3} className="flex-none text-primary" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`text-[12px] font-extrabold ${pickedKeys.length >= 3 ? 'text-green-dark' : 'text-amber-ink'}`}>
                      {pickedKeys.length}{L(' de 3 mínimo', ' of 3 minimum')}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-2">{L('Mientras más elijas, mejor tu inicio', 'The more you pick, the better your feed')}</span>
                  </div>
                  <Cta on={pickedKeys.length >= 3} onClick={() => finish(pickedKeys)}>{L('Terminar y entrar', 'Finish and enter')}</Cta>
                  <button onClick={() => finish([])} className="tl-focus mt-3 w-full cursor-pointer py-2 text-[12.5px] font-extrabold text-home-mute">
                    {L('Saltar por ahora', 'Skip for now')}
                  </button>
                </div>
              )}

              {/* ─────────── LISTO ─────────── */}
              {step === 'done' && (
                <div className="tl-pop text-center">
                  <span aria-hidden className="mx-auto flex h-[86px] w-[86px] items-center justify-center rounded-full bg-green"
                        style={{ boxShadow: '0 18px 40px rgba(31,157,87,.36)' }}>
                    <Check size={40} stroke={3} className="text-white" />
                  </span>
                  <div className="mt-5"><H1>{mode === 'login' ? L('¡Bienvenido de vuelta!', 'Welcome back!') : L('¡Ya eres parte!', 'You are in!')}</H1></div>
                  <Sub>{mode === 'login'
                    ? L('Tu comunidad te estaba esperando.', 'Your community was waiting for you.')
                    : L('Tu cuenta está lista y tu comunidad ya está activa en tu zona.', 'Your account is ready and your community is already active in your area.')}</Sub>
                  <div className="mt-[22px] flex flex-col gap-2 text-left">
                    {[
                      { Icon: UserIcon, bg: '#EFEBFF', c: '#6D4DF6', k: ['Tu cuenta', 'Your account'], v: `${`${first} ${last}`.trim() || auth.profile?.display_name || '—'} · ${targetLabel}` },
                      { Icon: MapPin, bg: '#E3F5EA', c: '#1F9D57', k: ['Tu comunidad', 'Your community'], v: place?.label ?? app.city },
                      { Icon: MessageSquare, bg: '#FCEFD6', c: '#9A6A12', k: ['Tu inicio', 'Your feed'], v: `${pickedKeys.length} ${L('intereses', 'interests')}${stats && stats.businesses > 0 ? ` · ${stats.businesses} ${L('negocios cerca', 'businesses nearby')}` : ''}` },
                    ].map((r) => (
                      <div key={r.k[0]} className="flex items-center gap-[11px] rounded-[17px] border border-auth-line p-[13px]">
                        <span aria-hidden className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[11px]" style={{ background: r.bg }}>
                          <r.Icon size={17} stroke={2.1} style={{ color: r.c }} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[10.5px] font-extrabold uppercase tracking-[.06em] text-muted-2">{L(r.k[0], r.k[1])}</span>
                          <span className="block truncate text-[13px] font-bold text-ink">{r.v}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <Cta on onClick={enterApp}>{L('Entrar a To’Latino', 'Enter To’Latino')} <ArrowRight size={17} stroke={2.4} aria-hidden /></Cta>
                </div>
              )}

              {/* ─────────── ENTRAR ─────────── */}
              {step === 'login' && (
                <div className="tl-pop">
                  <H1>{L('Bienvenido de vuelta', 'Welcome back')}</H1>
                  <Sub>{L('Entra con tu teléfono o correo. Te mandamos un código, sin contraseñas.', 'Log in with your phone or email. We send you a code, no passwords.')}</Sub>

                  <div role="tablist" aria-label={L('Cómo recibir el código', 'How to get the code')} className="mt-[22px] flex gap-1 rounded-[13px] bg-app p-1">
                    {([['sms', 'Teléfono', 'Phone', Phone], ['email', 'Correo', 'Email', Mail]] as const).map(([k, e, en, Icon]) => {
                      const on = channel === k;
                      return (
                        <button key={k} role="tab" aria-selected={on} onClick={() => { setChannel(k); setErr(null); }}
                                className={`tl-focus flex flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-[10px] px-2 py-[11px] text-[12.5px] font-extrabold ${on ? 'bg-white text-ink' : 'text-muted'}`}
                                style={on ? { boxShadow: '0 2px 8px rgba(60,50,110,.12)' } : undefined}>
                          <Icon size={15} stroke={2.2} className={on ? 'text-primary-dark' : 'text-muted-2'} aria-hidden />
                          {L(e, en)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-[18px]">
                    <Label>{channel === 'sms' ? L('Número de teléfono', 'Phone number') : L('Correo electrónico', 'Email address')}</Label>
                    {channel === 'sms' ? (
                      <div className="flex gap-[9px]">
                        <span className="flex flex-none items-center gap-[7px] rounded-[13px] border-[1.5px] border-auth-line px-[13px] text-[13.5px] font-extrabold text-ink"><span aria-hidden>🇺🇸</span> +1</span>
                        <input value={formatUsPhone(phone)} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                               onKeyDown={(e) => { if (e.key === 'Enter') sendCode(); }} inputMode="tel" autoComplete="tel-national"
                               placeholder="(713) 555-0142" aria-label={L('Número de teléfono', 'Phone number')} className={`${field} flex-1 !text-[15px] !font-bold`} />
                      </div>
                    ) : (
                      <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendCode(); }}
                             type="email" inputMode="email" autoComplete="email" placeholder="tu@correo.com"
                             aria-label={L('Correo electrónico', 'Email address')} className={field} />
                    )}
                  </div>

                  <Err />
                  <Cta on={channel === 'sms' ? phone.length === 10 : email.includes('@')} onClick={sendCode}>
                    {busy ? L('Enviando…', 'Sending…') : L('Enviarme el código', 'Send me the code')}
                  </Cta>

                  {/* Respaldo con contraseña (decisión del fundador). El camino
                      principal es el código; esto es la puerta de servicio para
                      quien ya tiene cuenta el día que el envío falle. */}
                  <div className="mt-6 border-t border-hair pt-4">
                    {!pwOpen ? (
                      <button onClick={() => { setPwOpen(true); setErr(null); }} className="tl-focus flex w-full cursor-pointer items-center justify-center gap-2 py-2 text-[12px] font-extrabold text-home-mute">
                        <Lock size={14} stroke={2.2} aria-hidden /> {L('¿No te llega el código? Entrar con contraseña', 'Code not arriving? Sign in with a password')}
                      </button>
                    ) : (
                      <div>
                        <Label>{L('Correo y contraseña', 'Email and password')}</Label>
                        <input value={pwEmail} onChange={(e) => setPwEmail(e.target.value)} type="email" autoComplete="email"
                               placeholder="tu@correo.com" aria-label={L('Correo', 'Email')} className={field} />
                        <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" autoComplete="current-password"
                               onKeyDown={(e) => { if (e.key === 'Enter') signInPassword(); }}
                               placeholder="••••••••" aria-label={L('Contraseña', 'Password')} className={`${field} mt-2`} />
                        <Cta on={pwEmail.includes('@') && pw.length > 0} onClick={signInPassword}>{L('Entrar', 'Log in')}</Cta>
                      </div>
                    )}
                  </div>

                  <p className="mt-5 text-center text-[13px] font-semibold text-home-mute">
                    {L('¿No tienes cuenta?', "Don't have an account?")}{' '}
                    <button onClick={() => { setMode('signup'); setStep('method'); }} className="tl-focus cursor-pointer font-extrabold text-primary-dark">
                      {L('Créala ahora', 'Create it now')}
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .tl-focus:focus-visible { outline: 2px solid #7B61FF; outline-offset: 2px; border-radius: 10px; }
        @keyframes tlpop { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        @keyframes tlp { 0%,100% { opacity: 1 } 50% { opacity: .4 } }
        @keyframes tlring { 0% { transform: scale(.9); opacity: .55 } 70%,100% { transform: scale(1.5); opacity: 0 } }
        @keyframes tlspin { to { transform: rotate(360deg) } }
        .tl-pop { animation: tlpop .28s ease }
        .tl-pulse { animation: tlp 1.8s ease-in-out infinite }
        .tl-ring { animation: tlring 2.2s ease-out infinite }
        .tl-spin { animation: tlspin .9s linear infinite }
        .tl-two { grid-template-columns: repeat(2, minmax(0, 1fr)) }

        /* ≤1000px: se va el panel de marca y la tarjeta ocupa la pantalla. Es la
           experiencia REAL — 99% del tráfico es móvil, no el escritorio bonito. */
        @media (max-width: 1000px) {
          .tl-shell { padding: 0 !important; align-items: stretch }
          .tl-cardwrap { border-radius: 0 !important; box-shadow: none !important; max-width: none !important; min-height: 100svh }
          .tl-authcard { max-width: none !important; flex: 1 1 auto !important }
        }
        @media (max-width: 420px) {
          .tl-pad { padding-left: 18px !important; padding-right: 18px !important }
          .tl-h1 { font-size: 23px !important }
          .tl-otp { width: 44px !important; height: 54px !important; font-size: 21px !important }
          .tl-two { grid-template-columns: minmax(0, 1fr) }
        }
        @media (prefers-reduced-motion: reduce) {
          .tl-pop, .tl-pulse, .tl-ring, .tl-spin { animation: none !important }
        }
      `}</style>
    </div>
  );
}
