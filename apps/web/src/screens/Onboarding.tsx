'use client';

// User onboarding: welcome → register/login (email + password) → pick location
// → enter. The chosen location is saved to the profile and drives the 30-mile
// community feed. Full-screen flow at /entrar.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck as Check, IconChevronLeft as ChevronLeft, IconCurrentLocation as LocateFixed, IconLock as Lock, IconMail as Mail, IconMapPin as MapPin, IconSearch as Search, IconUser as UserIcon } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth, authErrorText } from '@/lib/auth';
import { PrimaryBtn, Wordmark } from '@/components/ui';
import { LangToggle } from '@/components/AppHeader';
import { POPULAR_CITIES, getBrowserLocation, nearestCity, searchCities, type Place } from '@/lib/geo';

type Step = 'welcome' | 'register' | 'login' | 'location' | 'done' | 'confirm';

export function OnboardingScreen() {
  const { L } = useLang();
  const app = useApp();
  const auth = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('welcome');
  // La portada distingue "Entrar" de "Regístrate"; con `?crear=1` se abre
  // directamente el formulario de alta en vez de la bienvenida. Se lee en el
  // cliente (la exportación es estática, no hay `searchParams` del servidor).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('crear') === '1') setStep('register');
  }, []);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const inputCls =
    'w-full rounded-field border-[1.5px] border-[#ECE9F6] bg-app px-3.5 py-3 text-[13.5px] font-medium text-ink outline-none placeholder:text-muted focus:border-primary';

  const doRegister = async () => {
    setErr(null);
    if (name.trim().length < 2) return setErr(L('Escribe tu nombre.', 'Enter your name.'));
    if (!email.includes('@')) return setErr(L('Escribe un correo válido.', 'Enter a valid email.'));
    if (password.length < 6) return setErr(L('La contraseña debe tener al menos 6 caracteres.', 'Password must be at least 6 characters.'));
    setBusy(true);
    const { error, needsConfirmation } = await auth.signUp(name, email, password, { label: app.city, lat: app.coords.lat, lng: app.coords.lng });
    setBusy(false);
    if (error) return setErr(authErrorText(error, L));
    // Sin sesión = falta confirmar el correo. Antes se caía a 'location' y el
    // usuario creía haber entrado, pero navegaba como INVITADO (así fue como el
    // fundador acabó viendo el panel de negocio en modo demo). Ahora se le dice.
    if (needsConfirmation) return setStep('confirm');
    setStep('location');
  };

  const doLogin = async () => {
    setErr(null);
    // Login only needs a valid email + a non-empty password — the min-length rule
    // belongs to sign-up (doRegister), not here. Enforcing it on login wrongly
    // blocks accounts whose password is shorter than the current policy.
    if (!email.includes('@') || !password) return setErr(L('Correo o contraseña incorrectos.', 'Wrong email or password.'));
    setBusy(true);
    const { error } = await auth.signIn(email, password);
    setBusy(false);
    if (error) return setErr(authErrorText(error, L));
    router.push('/comunidad');
  };

  const pickLocation = async (p: Place) => {
    app.setCityWithCoords(p.label, { lat: p.lat, lng: p.lng });
    await auth.saveLocation(p);
    setStep('done');
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'linear-gradient(160deg,#F1ECFC 0%,#ECE7FB 46%,#F6EEF6 100%)' }}>
      <div className="flex items-center gap-3 px-5 py-4">
        {step !== 'welcome' && step !== 'done' && (
          <button
            onClick={() => { setErr(null); setStep(step === 'location' ? 'welcome' : 'welcome'); }}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white shadow-card"
            aria-label={L('Volver', 'Back')}
          >
            <ChevronLeft size={17} stroke={2.4} className="text-ink" />
          </button>
        )}
        <Wordmark size="md" />
        <div className="ml-auto">
          <LangToggle />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        <div className="w-full max-w-[420px] rounded-card border border-hair bg-white p-6 shadow-card-lg md:p-7">
          {/* WELCOME */}
          {step === 'welcome' && (
            <div className="text-center">
              <h1 className="text-[24px] font-extrabold tracking-[-.02em] text-ink text-balance">
                {L('Únete a tu comunidad', 'Join your community')}
              </h1>
              <p className="mx-auto mt-2 max-w-[320px] text-[13.5px] font-medium leading-[1.55] text-ink-3">
                {L('Crea tu cuenta para publicar, guardar negocios y ver lo que pasa a 30 millas a la redonda.', 'Create your account to post, save businesses and see what’s happening within 30 miles.')}
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <PrimaryBtn onClick={() => { setErr(null); setStep('register'); }}>{L('Crear cuenta gratis', 'Create free account')}</PrimaryBtn>
                <button
                  onClick={() => { setErr(null); setStep('login'); }}
                  className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-[#D8D2EC] bg-white p-[13px] text-[14px] font-extrabold text-ink-soft"
                >
                  {L('Ya tengo cuenta', 'I already have an account')}
                </button>
                <button
                  onClick={() => router.push('/comunidad')}
                  className="mt-1 cursor-pointer text-[12.5px] font-bold text-muted"
                >
                  {L('Explorar sin cuenta →', 'Explore without an account →')}
                </button>
              </div>
            </div>
          )}

          {/* REGISTER */}
          {step === 'register' && (
            <div>
              <h1 className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{L('Crea tu cuenta', 'Create your account')}</h1>
              <p className="mt-1 text-[13px] font-medium text-muted">{L('Es gratis y toma un minuto.', 'It’s free and takes a minute.')}</p>
              <div className="mt-5 flex flex-col gap-3">
                <label className="relative block">
                  <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" stroke={2.2} />
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('Tu nombre', 'Your name')} className={`${inputCls} pl-10`} />
                </label>
                <label className="relative block">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" stroke={2.2} />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder={L('Correo electrónico', 'Email')} className={`${inputCls} pl-10`} />
                </label>
                <label className="relative block">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" stroke={2.2} />
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" placeholder={L('Contraseña (mín. 6)', 'Password (min. 6)')} className={`${inputCls} pl-10`} />
                </label>
              </div>
              {err && <div className="mt-3 rounded-btn bg-pink-bg px-3 py-2 text-[12px] font-semibold text-pink-dark">{err}</div>}
              <PrimaryBtn className="mt-4" disabled={busy} onClick={doRegister}>
                {busy ? L('Creando…', 'Creating…') : L('Continuar', 'Continue')}
              </PrimaryBtn>
              <button onClick={() => { setErr(null); setStep('login'); }} className="mt-3 block w-full cursor-pointer text-center text-[12.5px] font-semibold text-muted">
                {L('¿Ya tienes cuenta? ', 'Already have an account? ')}<span className="font-extrabold text-primary-dark">{L('Inicia sesión', 'Sign in')}</span>
              </button>
            </div>
          )}

          {/* LOGIN */}
          {step === 'login' && (
            <div>
              <h1 className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{L('Inicia sesión', 'Sign in')}</h1>
              <p className="mt-1 text-[13px] font-medium text-muted">{L('Bienvenido de vuelta.', 'Welcome back.')}</p>
              <div className="mt-5 flex flex-col gap-3">
                <label className="relative block">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" stroke={2.2} />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder={L('Correo electrónico', 'Email')} className={`${inputCls} pl-10`} />
                </label>
                <label className="relative block">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" stroke={2.2} />
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder={L('Contraseña', 'Password')} className={`${inputCls} pl-10`} onKeyDown={(e) => e.key === 'Enter' && doLogin()} />
                </label>
              </div>
              {err && <div className="mt-3 rounded-btn bg-pink-bg px-3 py-2 text-[12px] font-semibold text-pink-dark">{err}</div>}
              <PrimaryBtn className="mt-4" disabled={busy} onClick={doLogin}>
                {busy ? L('Entrando…', 'Signing in…') : L('Entrar', 'Sign in')}
              </PrimaryBtn>
              <button onClick={() => { setErr(null); setStep('register'); }} className="mt-3 block w-full cursor-pointer text-center text-[12.5px] font-semibold text-muted">
                {L('¿Nuevo aquí? ', 'New here? ')}<span className="font-extrabold text-primary-dark">{L('Crea tu cuenta', 'Create an account')}</span>
              </button>
            </div>
          )}

          {/* LOCATION */}
          {step === 'location' && <LocationStep onPick={pickLocation} />}

          {/* CONFIRMA TU CORREO — sin sesión todavía */}
          {step === 'confirm' && (
            <div className="flex flex-col items-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-lilac">
                <Mail size={28} className="text-primary" />
              </span>
              <h1 className="mt-4 text-[22px] font-extrabold tracking-[-.02em] text-ink">
                {L('Confirma tu correo', 'Confirm your email')}
              </h1>
              <p className="mt-1.5 max-w-[320px] text-[13px] font-medium text-muted">
                {L(`Te enviamos un enlace a ${email.trim()}. Ábrelo para activar tu cuenta y poder entrar.`,
                   `We sent a link to ${email.trim()}. Open it to activate your account and sign in.`)}
              </p>
              <p className="mt-3 max-w-[320px] text-[12px] font-semibold text-muted-2">
                {L('¿No lo ves? Revisa la carpeta de spam o correo no deseado.',
                   "Don't see it? Check your spam or junk folder.")}
              </p>
              <PrimaryBtn className="mt-5" onClick={() => { setErr(null); setStep('login'); }}>
                {L('Ya lo confirmé — iniciar sesión', 'I confirmed it — sign in')}
              </PrimaryBtn>
            </div>
          )}

          {/* DONE */}
          {step === 'done' && (
            <div className="flex flex-col items-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-bg">
                <Check size={28} stroke={3} className="text-green" />
              </span>
              <h1 className="mt-4 text-[22px] font-extrabold tracking-[-.02em] text-ink">{L('¡Listo!', 'All set!')}</h1>
              <p className="mt-1.5 max-w-[300px] text-[13px] font-medium text-muted">
                {L(`Ya eres parte de la comunidad en ${app.cityShort}. Verás lo que pasa a 30 millas a la redonda.`, `You're now part of the community in ${app.cityShort}. You'll see what's happening within 30 miles.`)}
              </p>
              <PrimaryBtn className="mt-5" onClick={() => router.push('/comunidad')}>
                {L('Entrar a la comunidad', 'Enter the community')}
              </PrimaryBtn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- location step: reuse the OSM city gazetteer (search + use my location) ----
function LocationStep({ onPick }: { onPick: (p: Place) => void }) {
  const { L } = useLang();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<Place | null>(null); // needs confirmation
  const [detected, setDetected] = useState(false); // pending came from GPS
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        setResults(await searchCities(query, ctrl.signal));
      } catch {
        if (!ctrl.signal.aborted) setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const detect = async () => {
    setErr(null);
    setLocating(true);
    try {
      const { lat, lng } = await getBrowserLocation();
      const place = await nearestCity(lat, lng);
      setDetected(true);
      setPending(place); // require confirmation before advancing
    } catch (e: unknown) {
      const code = (e as GeolocationPositionError)?.code;
      setErr(code === 1 ? L('Permiso denegado. Elige tu ciudad abajo.', 'Permission denied. Pick your city below.') : L('No pudimos detectar tu ubicación.', "Couldn't detect your location."));
    } finally {
      setLocating(false);
    }
  };

  const choose = (p: Place, fromGps = false) => {
    setDetected(fromGps);
    setPending(p);
  };

  const list = q.trim().length < 2 ? POPULAR_CITIES : results;

  // ── Confirmation gate: no advancing without confirming the city ──
  if (pending) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
          <MapPin size={24} className="text-primary" stroke={2.2} />
        </span>
        <h1 className="mt-4 text-[20px] font-extrabold tracking-[-.02em] text-ink">
          {detected ? L('¿Es esta tu ciudad?', 'Is this your city?') : L('Confirma tu ciudad', 'Confirm your city')}
        </h1>
        <p className="mt-1 text-[12.5px] font-medium text-muted">
          {detected
            ? L('Te ubicamos aquí. Confírmalo para continuar.', 'We located you here. Confirm to continue.')
            : L('Revisa que sea correcta antes de continuar.', 'Make sure it’s right before continuing.')}
        </p>
        <div className="mx-auto mt-4 flex items-center justify-center gap-2.5 rounded-tile bg-app px-4 py-3.5">
          <MapPin size={18} className="text-primary" stroke={2.4} />
          <span className="text-[16px] font-extrabold text-ink">{pending.label}</span>
        </div>
        <PrimaryBtn className="mt-5" onClick={() => onPick(pending)}>
          {L('Sí, esta es mi ciudad', 'Yes, this is my city')}
        </PrimaryBtn>
        <button
          onClick={() => { setPending(null); setDetected(false); }}
          className="mt-3 w-full cursor-pointer text-center text-[13px] font-extrabold text-primary-dark"
        >
          {L('No, elegir otra', 'No, pick another')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{L('¿Dónde estás?', 'Where are you?')}</h1>
      <p className="mt-1 text-[13px] font-medium text-muted">{L('Verás negocios, eventos y vecinos a 30 millas a la redonda.', 'You’ll see businesses, events and neighbors within 30 miles.')}</p>

      <button onClick={detect} disabled={locating} className="mt-4 flex w-full cursor-pointer items-center gap-3 rounded-tile bg-lilac-3 p-3 text-left disabled:cursor-wait">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary">
          {locating ? <span className="h-4 w-4 animate-[spin_.8s_linear_infinite] rounded-full border-2 border-white border-t-transparent" /> : <LocateFixed size={17} className="text-white" stroke={2.2} />}
        </span>
        <span className="text-[13.5px] font-extrabold text-ink">{locating ? L('Detectando…', 'Detecting…') : L('Usar mi ubicación actual', 'Use my current location')}</span>
      </button>
      {err && <div className="mt-2 rounded-btn bg-pink-bg px-3 py-2 text-[11.5px] font-semibold text-pink-dark">{err}</div>}

      <div className="mt-3 flex items-center gap-2 rounded-btn border-[1.5px] border-[#ECE9F6] bg-app px-3 py-[10px]">
        <Search size={15} className="flex-none text-primary" stroke={2.2} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('Escribe tu ciudad…', 'Type your city…')} className="min-w-0 flex-1 bg-transparent text-[13.5px] font-medium text-ink outline-none placeholder:text-muted" />
        {searching && <span className="h-3.5 w-3.5 flex-none animate-[spin_.8s_linear_infinite] rounded-full border-2 border-primary border-t-transparent" />}
      </div>

      <div className="mt-2 flex max-h-[240px] flex-col gap-0.5 overflow-y-auto">
        {list.map((p) => (
          <button key={`${p.label}-${p.lat}`} onClick={() => choose(p)} className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2 py-2.5 text-left text-[13.5px] font-bold text-ink-soft hover:bg-app">
            <MapPin size={14} className="text-primary" stroke={2.4} />
            {p.label}
          </button>
        ))}
        {q.trim().length >= 2 && !searching && results.length === 0 && (
          <div className="px-2 py-6 text-center text-[12.5px] font-semibold text-muted">{L('Sin ciudades para tu búsqueda', 'No cities match your search')}</div>
        )}
      </div>
    </div>
  );
}
