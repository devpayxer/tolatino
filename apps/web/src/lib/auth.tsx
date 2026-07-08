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
  city_label: string | null;
  lat: number | null;
  lng: number | null;
  bio?: string | null;
  settings?: Record<string, unknown> | null;
};

type AuthCtx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  signUp: (name: string, email: string, password: string, loc?: { label: string; lat: number; lng: number }) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
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
export type AuthErrCode = 'email_taken' | 'invalid_login' | 'weak_password' | 'bad_email' | 'not_configured' | 'generic';
function friendly(msg: string | undefined): AuthErrCode {
  const m = (msg || '').toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) return 'email_taken';
  if (m.includes('invalid login')) return 'invalid_login';
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
    default: return L('Algo salió mal. Intenta de nuevo.', 'Something went wrong. Try again.');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile((data as Profile) ?? null);
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
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: friendly(error.message) };
    const u = data.user;
    if (u) {
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
    return { error: null };
  };

  const signIn: AuthCtx['signIn'] = async (email, password) => {
    if (!supabase) return { error: 'not_configured' };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
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
    <Ctx.Provider value={{ user, profile, loading, configured: !!supabase, signUp, signIn, signOut, saveLocation, updateProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
