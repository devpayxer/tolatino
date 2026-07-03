'use client';

// Saved businesses (the ♥ on a business card / detail). Persisted so the user
// can find them again in their "Guardados" list:
//   • guests → localStorage (survives refresh on this device)
//   • signed-in → Supabase `saved_businesses` (RLS: own rows) for cross-device,
//     with localStorage kept as an offline cache.
// Keyed by the business SLUG (stable), not the array-index `id` (which the geo
// query reassigns per page). On sign-in, any businesses saved as a guest are
// merged up to the account so nothing is lost.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const LS_KEY = 'tl.savedBiz';

type Ctx = {
  saved: Record<string, boolean>; // keyed by business slug
  isSaved: (slug: string) => boolean;
  toggle: (slug: string) => void;
  count: number;
};

const C = createContext<Ctx | null>(null);

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* storage blocked / malformed — treat as empty */
  }
  return [];
}

function writeLocal(slugs: string[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(slugs));
  } catch {
    /* storage blocked (private mode) — keep working in-memory */
  }
}

const activeSlugs = (m: Record<string, boolean>) => Object.keys(m).filter((k) => m[k]);

export function SavedBizProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  // Hydrate from localStorage once (client-only; guests + signed-in offline).
  useEffect(() => {
    const slugs = readLocal();
    if (slugs.length) setSaved(Object.fromEntries(slugs.map((s) => [s, true])));
  }, []);

  // Signed-in: server is authoritative. Merge any guest-saved slugs up to the
  // account (insert the ones the server doesn't have yet), then cache locally.
  useEffect(() => {
    const sb = supabase;
    if (!sb || !user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await sb.from('saved_businesses').select('business_slug').eq('user_id', user.id);
      if (cancelled || error || !data) return;
      const serverSlugs = (data as { business_slug: string }[]).map((r) => r.business_slug);
      const serverSet = new Set(serverSlugs);
      const localOnly = readLocal().filter((s) => !serverSet.has(s));
      if (localOnly.length) {
        sb.from('saved_businesses')
          .insert(localOnly.map((slug) => ({ user_id: user.id, business_slug: slug })))
          .then(() => {});
      }
      const union = [...new Set([...serverSlugs, ...localOnly])];
      if (cancelled) return;
      setSaved(Object.fromEntries(union.map((s) => [s, true])));
      writeLocal(union);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggle = useCallback(
    (slug: string) => {
      if (!slug) return;
      setSaved((m) => {
        const next = !m[slug];
        const nm = { ...m, [slug]: next };
        writeLocal(activeSlugs(nm));
        const sb = supabase;
        if (sb && user) {
          if (next) sb.from('saved_businesses').insert({ user_id: user.id, business_slug: slug }).then(() => {});
          else sb.from('saved_businesses').delete().eq('user_id', user.id).eq('business_slug', slug).then(() => {});
        }
        return nm;
      });
    },
    [user],
  );

  const isSaved = useCallback((slug: string) => !!saved[slug], [saved]);
  const count = activeSlugs(saved).length;

  return <C.Provider value={{ saved, isSaved, toggle, count }}>{children}</C.Provider>;
}

export function useSavedBiz(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useSavedBiz must be used inside <SavedBizProvider>');
  return ctx;
}
