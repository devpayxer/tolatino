'use client';

// Auth (Supabase) — email + password. Session persists automatically in
// localStorage (supabase-js). A `profiles` row holds the display name,
// avatar and the user's location (drives the 30-mile community feed).

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  display_name: string;
  initials: string;
  avatar_color: string;
  /** Foto de perfil (bucket `post-photos`), o null = iniciales sobre color. */
  avatar_url?: string | null;
  city_label: string | null;
  lat: number | null;
  lng: number | null;
  bio?: string | null;
  settings?: Record<string, unknown> | null;
  interests?: string[] | null;
};

type AuthCtx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  /** `needsConfirmation` = Supabase NO devolvió sesión → el correo debe
   *  confirmarse antes de poder entrar. La UI tiene que decirlo; si se ignora,
   *  el usuario cree que ya entró y navega como invitado. */
  signUp: (name: string, email: string, password: string, loc?: { label: string; lat: number; lng: number }) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Alta/entrada SIN contraseña: manda un código de 6 dígitos por correo o SMS.
   *  `channel` decide el canal; el destino ya viene normalizado (E.164 para SMS). */
  sendCode: (target: string, channel: 'email' | 'sms') => Promise<{ error: string | null }>;
  /** Comprueba el código. Si es correcto deja la sesión abierta. */
  verifyCode: (target: string, channel: 'email' | 'sms', code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  saveLocation: (loc: { label: string; lat: number; lng: number }) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: string | null }>;
};

const Ctx = createContext<AuthCtx | null>(null);

const AVATAR_COLORS = ['#7B61FF', '#1F9D57', '#E8954A', '#E0568F', '#2F6FED', '#0E9384'];

function initialsOf(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'TÚ';
}
function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// Auth failures return a STABLE code (never a localized sentence) so the UI can
// render it in the active language via authErrorText() — Spanish-first, EN secondary.
export type AuthErrCode =
  | 'email_taken' | 'invalid_login' | 'weak_password' | 'bad_email' | 'not_configured' | 'generic'
  // Sin contraseña
  | 'bad_code' | 'expired_code' | 'too_many' | 'bad_phone' | 'sms_not_configured' | 'email_not_configured';
function friendly(msg: string | undefined): AuthErrCode {
  const m = (msg || '').toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) return 'email_taken';
  if (m.includes('invalid login')) return 'invalid_login';
  // El orden importa: Supabase dice "Token has expired or is invalid" para un
  // código malo, y ese texto contiene "email" en algunas variantes.
  if (m.includes('expired')) return 'expired_code';
  if (m.includes('token') || m.includes('otp') || m.includes('code')) return 'bad_code';
  // Límite de envíos: es el fallo MÁS probable hoy (el proyecto manda 2 correos
  // por hora hasta que haya SMTP propio). Merece su propio mensaje, porque
  // "algo salió mal" haría que el usuario reintente y empeore el bloqueo.
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'too_many';
  if (m.includes('phone') && (m.includes('provider') || m.includes('disabled') || m.includes('not enabled'))) return 'sms_not_configured';
  if (m.includes('phone')) return 'bad_phone';
  if (m.includes('signups not allowed') || m.includes('email provider') || m.includes('email logins are disabled')) return 'email_not_configured';
  if (m.includes('password')) return 'weak_password';
  if (m.includes('email')) return 'bad_email';
  return 'generic';
}
/** Localize an auth error code. Pass the app's L('es','en'). */
export function authErrorText(code: string | null | undefined, L: (a: string, b: string) => string): string {
  switch (code) {
    case 'email_taken': return L('Ese correo ya tiene una cuenta. Inicia sesión.', 'That email already has an account. Sign in.');
    case 'invalid_login': return L('Correo o contraseña incorrectos.', 'Incorrect email or password.');
    case 'weak_password': return L('La contraseña debe tener al menos 6 caracteres.', 'Password must be at least 6 characters.');
    case 'bad_email': return L('Revisa el correo que escribiste.', 'Check the email you entered.');
    case 'not_configured': return L('El inicio de sesión no está configurado.', 'Sign-in is not configured.');
    case 'bad_code': return L('Código incorrecto. Revísalo e intenta otra vez.', 'Wrong code. Check it and try again.');
    case 'expired_code': return L('Ese código ya venció. Pide uno nuevo.', 'That code expired. Ask for a new one.');
    case 'too_many': return L('Demasiados intentos. Espera un minuto y vuelve a pedirlo.', 'Too many attempts. Wait a minute and try again.');
    case 'bad_phone': return L('Revisa el número que escribiste.', 'Check the number you entered.');
    case 'sms_not_configured': return L('El envío por SMS todavía no está activo. Usa tu correo.', 'SMS delivery is not active yet. Use your email.');
    case 'email_not_configured': return L('El envío por correo todavía no está activo. Usa tu teléfono.', 'Email delivery is not active yet. Use your phone.');
    default: return L('Algo salió mal. Intenta de nuevo.', 'Something went wrong. Try again.');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Carga el perfil y, si NO existe, lo crea desde user_metadata. Ese hueco era
  // real: al registrarse con confirmación de correo activa no hay sesión, el
  // insert lo bloquea RLS y nada lo reintentaba → usuario sin nombre ni ciudad.
  // Ahora el primer login autenticado siempre deja el perfil listo.
  const loadProfile = useCallback(async (uid: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (data) { setProfile(data as Profile); return; }
    const { data: ures } = await supabase.auth.getUser();
    const meta = (ures?.user?.user_metadata ?? {}) as Record<string, unknown>;
    const name = typeof meta.display_name === 'string' && meta.display_name.trim() ? meta.display_name.trim() : 'Vecino';
    const row = {
      id: uid,
      display_name: name,
      initials: initialsOf(name),
      avatar_color: colorFor(uid),
      city_label: typeof meta.city_label === 'string' ? meta.city_label : null,
      lat: typeof meta.lat === 'number' ? meta.lat : null,
      lng: typeof meta.lng === 'number' ? meta.lng : null,
    };
    const { error } = await supabase.from('profiles').upsert(row);
    setProfile(error ? null : row);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signUp: AuthCtx['signUp'] = async (name, email, password, loc) => {
    if (!supabase) return { error: 'not_configured' };
    // El nombre/ciudad van a user_metadata: si la cuenta requiere confirmar el
    // correo NO hay sesión, y el insert en `profiles` lo bloquea RLS
    // (auth.uid() = id). Guardándolos en el propio usuario, ensureProfile() crea
    // el perfil en el PRIMER login autenticado, desde cualquier dispositivo.
    // (Antes se perdían: el upsert fallaba en silencio y el dueño entraba sin
    // nombre ni ciudad — verificado en prod 2026-07-29: 1 usuario, 0 perfiles.)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim(), city_label: loc?.label ?? null, lat: loc?.lat ?? null, lng: loc?.lng ?? null } },
    });
    if (error) return { error: friendly(error.message) };
    const u = data.user;
    // Con sesión (confirmación desactivada) creamos el perfil ya.
    if (u && data.session) {
      const row = {
        id: u.id,
        display_name: name.trim(),
        initials: initialsOf(name),
        avatar_color: colorFor(u.id),
        city_label: loc?.label ?? null,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
      };
      await supabase.from('profiles').upsert(row);
      setProfile(row);
    }
    return { error: null, needsConfirmation: !data.session };
  };

  const signIn: AuthCtx['signIn'] = async (email, password) => {
    if (!supabase) return { error: 'not_configured' };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error ? friendly(error.message) : null };
  };

  // ── Sin contraseña ────────────────────────────────────────────────────────
  // `signInWithOtp` sirve para ENTRAR y para REGISTRARSE: si el destino no tiene
  // cuenta, la crea. Por eso el flujo no necesita distinguir antes de mandar el
  // código — el usuario solo escribe su teléfono o su correo.
  const sendCode: AuthCtx['sendCode'] = async (target, channel) => {
    if (!supabase) return { error: 'not_configured' };
    // `emailRedirectTo` sale del origen REAL desde el que se pidió el código, no
    // de una constante: así una vista previa manda a la vista previa y
    // producción a producción. Y apunta a `/entrar/`, no a la portada, porque
    // mientras el correo de Supabase siga llevando un ENLACE en vez del código
    // (hace falta SMTP propio para cambiar la plantilla — ver LAUNCH-CHECKLIST),
    // ese enlace es el único camino del usuario: tiene que caer donde el alta
    // puede continuar, no en una página que no sabe que acaba de entrar.
    const redirect = typeof window !== 'undefined' ? `${window.location.origin}/entrar/` : undefined;
    const { error } = channel === 'sms'
      ? await supabase.auth.signInWithOtp({ phone: target })
      : await supabase.auth.signInWithOtp({ email: target.trim().toLowerCase(), options: { emailRedirectTo: redirect } });
    return { error: error ? friendly(error.message) : null };
  };

  const verifyCode: AuthCtx['verifyCode'] = async (target, channel, code) => {
    if (!supabase) return { error: 'not_configured' };
    const { error } = channel === 'sms'
      ? await supabase.auth.verifyOtp({ phone: target, token: code, type: 'sms' })
      : await supabase.auth.verifyOtp({ email: target.trim().toLowerCase(), token: code, type: 'email' });
    // Con código correcto ya hay sesión: `onAuthStateChange` carga (o crea) el
    // perfil, así que aquí no hace falta tocar nada más.
    return { error: error ? friendly(error.message) : null };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const saveLocation: AuthCtx['saveLocation'] = async (loc) => {
    if (!supabase || !user) return;
    const patch = { city_label: loc.label, lat: loc.lat, lng: loc.lng };
    await supabase.from('profiles').update(patch).eq('id', user.id);
    setProfile((p) => (p ? { ...p, ...patch } : p));
  };

  // Edit the user's own profile (name / bio / settings). Recomputes initials
  // from the name so the avatar stays in sync. Optimistic local update.
  const updateProfile: AuthCtx['updateProfile'] = async (patch) => {
    if (!user) return { error: 'no-user' };
    const next: Partial<Profile> = { ...patch };
    if (typeof patch.display_name === 'string') next.initials = initialsOf(patch.display_name);
    setProfile((p) => (p ? { ...p, ...next } : p));
    if (!supabase) return { error: null };
    const { error } = await supabase.from('profiles').update(next).eq('id', user.id);
    return { error: error ? error.message : null };
  };

  return (
    <Ctx.Provider value={{ user, profile, loading, configured: !!supabase, signUp, signIn, sendCode, verifyCode, signOut, saveLocation, updateProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
