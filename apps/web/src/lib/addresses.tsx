'use client';

// Saved addresses for the signed-in user (Phase 2). Loads the user's list, and
// on first load applies their default as the geo origin (if none is active yet)
// so distances are precise across devices. Add / delete / rename / set-default
// all persist to `user_addresses` (RLS: own only).

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { nearestCity } from '@/lib/geo';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/state';

export type SavedAddress = { id: string; label: string | null; formatted: string; lat: number; lng: number; is_default: boolean };

type Ctx = {
  addresses: SavedAddress[];
  configured: boolean;
  reload: () => void;
  add: (label: string | null, formatted: string, lat: number, lng: number) => Promise<SavedAddress | null>;
  remove: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
  setLabel: (id: string, label: string | null) => Promise<void>;
};

const C = createContext<Ctx | null>(null);

export function AddressesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const app = useApp();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [version, setVersion] = useState(0);
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!supabase || !user) {
      setAddresses([]);
      appliedRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (cancelled || error || !data) return;
      const list = data as SavedAddress[];
      setAddresses(list);
      // Once per session, if the origin isn't already a precise address, adopt
      // the default so cross-device distances are correct.
      if (!appliedRef.current && !app.address && list.length) {
        const def = list.find((a) => a.is_default) ?? list[0];
        const coords = { lat: def.lat, lng: def.lng };
        app.setUserAddress(def.formatted, coords, def.id);
        // adopt the default address's city too
        nearestCity(def.lat, def.lng)
          .then((c) => app.setUserAddress(def.formatted, coords, def.id, { label: c.label, lat: c.lat, lng: c.lng }))
          .catch(() => {});
      }
      appliedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const add = useCallback<Ctx['add']>(
    async (label, formatted, lat, lng) => {
      if (!supabase || !user) return null;
      const isFirst = addresses.length === 0;
      const { data, error } = await supabase
        .from('user_addresses')
        .insert({ user_id: user.id, label, formatted, lat, lng, is_default: isFirst })
        .select()
        .single();
      if (error || !data) return null;
      setVersion((v) => v + 1);
      return data as SavedAddress;
    },
    [user, addresses.length],
  );

  const remove = useCallback<Ctx['remove']>(
    async (id) => {
      if (!supabase || !user) return;
      await supabase.from('user_addresses').delete().eq('id', id);
      setVersion((v) => v + 1);
    },
    [user],
  );

  const setDefault = useCallback<Ctx['setDefault']>(
    async (id) => {
      if (!supabase || !user) return;
      await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', user.id);
      await supabase.from('user_addresses').update({ is_default: true }).eq('id', id);
      setVersion((v) => v + 1);
    },
    [user],
  );

  const setLabel = useCallback<Ctx['setLabel']>(
    async (id, label) => {
      if (!supabase || !user) return;
      await supabase.from('user_addresses').update({ label }).eq('id', id);
      setVersion((v) => v + 1);
    },
    [user],
  );

  return (
    <C.Provider value={{ addresses, configured: !!supabase, reload, add, remove, setDefault, setLabel }}>{children}</C.Provider>
  );
}

export function useAddresses(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useAddresses must be used inside <AddressesProvider>');
  return ctx;
}
