'use client';

// Neighbor recommendations (the 👍 "Recomendar" endorsement, Nextdoor-style).
// A single source of truth for "which businesses has THIS person recommended",
// keyed by the business SLUG, so both the Negocios listing card and the business
// detail page stay in sync (recommend from the card → the profile reflects it,
// and vice-versa).
//
// Unlike saved businesses (♥), an endorsement is a public, one-per-person vouch
// that also publishes a "[vecino] recomienda [negocio]" post in Comunidad — so it
// requires an account. Guests have an empty set; the UI routes them to sign in.
// The server (`toggle_endorsement`) is always authoritative for the count.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toggleEndorsement } from '@/lib/live';

type ToggleResult = { endorsed: boolean; count: number; error?: string };

type Ctx = {
  endorsed: Record<string, boolean>; // keyed by business slug
  isEndorsed: (slug: string) => boolean;
  /** The authoritative endorsement count for a slug once we've seen it (from a
   *  toggle reply or a `seed`), or undefined — so the card can fall back to the
   *  count baked into its list row. Keeps the count in sync across surfaces. */
  countFor: (slug: string) => number | undefined;
  /** Prime mine + count for a slug from an authoritative read (the detail page
   *  fetches the real endorsement on open) so the listing card reflects it too. */
  seed: (slug: string, mine: boolean, count: number) => void;
  /** Recommend / un-recommend. `note` (optional) is saved on a NEW recommendation
   *  and only offered on the detail page — the card toggle passes none. */
  toggle: (slug: string, note?: string) => Promise<ToggleResult>;
  ready: boolean; // true once the signed-in user's set has hydrated (or guest)
};

const C = createContext<Ctx | null>(null);

export function EndorsedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [endorsed, setEndorsed] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  // Hydrate the signed-in user's recommended slugs (one round-trip). Guests get
  // an empty set. Re-runs on sign-in/out so the card state follows the session.
  useEffect(() => {
    const sb = supabase;
    if (!sb || !user) {
      setEndorsed({});
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    (async () => {
      const { data, error } = await sb.rpc('my_endorsements');
      if (cancelled) return;
      if (!error && Array.isArray(data)) {
        setEndorsed(Object.fromEntries((data as { slug: string }[]).map((r) => [r.slug, true])));
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const seed = useCallback((slug: string, mine: boolean, count: number) => {
    if (!slug) return;
    setEndorsed((m) => (m[slug] === mine ? m : { ...m, [slug]: mine }));
    setCounts((m) => (m[slug] === count ? m : { ...m, [slug]: count }));
  }, []);

  const toggle = useCallback(
    async (slug: string, note?: string): Promise<ToggleResult> => {
      if (!slug) return { endorsed: false, count: 0, error: 'no-slug' };
      // Optimistic flip so the button responds instantly; reconcile on the reply.
      const prev = !!endorsed[slug];
      const prevCount = counts[slug];
      setEndorsed((m) => ({ ...m, [slug]: !prev }));
      if (prevCount !== undefined) {
        setCounts((m) => ({ ...m, [slug]: Math.max(0, prevCount + (prev ? -1 : 1)) }));
      }
      const r = await toggleEndorsement(slug, note);
      if (r.error) {
        setEndorsed((m) => ({ ...m, [slug]: prev })); // revert on failure
        if (prevCount !== undefined) setCounts((m) => ({ ...m, [slug]: prevCount }));
        return r;
      }
      setEndorsed((m) => ({ ...m, [slug]: r.endorsed }));
      setCounts((m) => ({ ...m, [slug]: r.count })); // server is authoritative
      return r;
    },
    [endorsed, counts],
  );

  const isEndorsed = useCallback((slug: string) => !!endorsed[slug], [endorsed]);
  const countFor = useCallback((slug: string) => counts[slug], [counts]);

  return <C.Provider value={{ endorsed, isEndorsed, countFor, seed, toggle, ready }}>{children}</C.Provider>;
}

export function useEndorsed(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useEndorsed must be used inside <EndorsedProvider>');
  return ctx;
}
