'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// Reflect an in-app view (an open detail, or the active tab/section) in the URL
// query string, so a refresh restores where you are, links are shareable, and the
// browser Back button behaves. Two patterns, both SSR/hydration-safe — they read
// the URL in an effect AFTER mount, never during render, so the static-export HTML
// and the first client render always match:
//   · useUrlTab    — a tab/section key → ?<key>=. replaceState (no history spam);
//                    refresh keeps the tab, Back still exits the screen.
//   · useUrlDetail — an opened detail id (slug / index) → ?<key>=. pushState, so the
//                    browser Back button closes the detail; refresh/shared-link
//                    reopens it. The caller resolves the id → object and renders.
//
// This is deliberately built on the History API (not next/router) so it updates the
// URL WITHOUT a route navigation — the screen keeps its scroll, filters and data.

const readParam = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return new URLSearchParams(window.location.search).get(key); } catch { return null; }
};

const writeParam = (key: string, value: string | null, mode: 'push' | 'replace') => {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (value == null || value === '') url.searchParams.delete(key); else url.searchParams.set(key, value);
    // Tag the history entry so useUrlDetail.close() knows whether WE pushed it.
    const state = { ...(window.history.state || {}), [`v_${key}`]: value ?? undefined };
    if (mode === 'push') window.history.pushState(state, '', url.toString());
    else window.history.replaceState(state, '', url.toString());
  } catch { /* history API unavailable — the in-memory state still drives the view */ }
};

/** Active tab/section mirrored to `?<key>=`. `def` (the home/default section) omits
 *  the param for a clean URL. Refresh-safe via replaceState; leaves Back alone. */
export function useUrlTab<T extends string>(key: string, def: T, isValid: (v: string) => boolean): [T, (t: T) => void] {
  const [tab, setTab] = useState<T>(def);
  const ready = useRef(false);
  // Restore from the URL once, after mount (avoids hydration mismatch).
  useEffect(() => {
    const v = readParam(key);
    if (v && isValid(v)) setTab(v as T);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Reflect tab → URL. Skip the very first run so we don't strip the param before
  // the restore above has applied it.
  useEffect(() => {
    if (!ready.current) { ready.current = true; return; }
    writeParam(key, tab === def ? null : tab, 'replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
  // Back/forward → mirror the URL back into state.
  useEffect(() => {
    const onPop = () => { const v = readParam(key); setTab(v && isValid(v) ? (v as T) : def); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [tab, useCallback((t: T) => setTab(t), [])];
}

/** An opened detail id mirrored to `?<key>=`. `open(id)` pushes history (so Back
 *  closes the detail); `close()` pops our pushed entry, or strips the param in place
 *  on a fresh deep-link load (nothing of ours to pop). `value` is the id in the URL
 *  (null when closed) — the caller resolves it to the object and renders. */
export function useUrlDetail(key: string, isValid?: (v: string) => boolean): {
  value: string | null; open: (id: string) => void; close: () => void;
} {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    const v = readParam(key);
    if (v && (!isValid || isValid(v))) setValue(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onPop = () => { const v = readParam(key); setValue(v && (!isValid || isValid(v)) ? v : null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const open = useCallback((id: string) => { setValue(id); writeParam(key, id, 'push'); }, [key]);
  const close = useCallback(() => {
    setValue(null);
    if (typeof window === 'undefined') return;
    const owned = !!(window.history.state && window.history.state[`v_${key}`]);
    if (owned) window.history.back();                       // pop the entry we pushed
    else if (readParam(key)) writeParam(key, null, 'replace'); // deep-link load → strip in place
  }, [key]);
  return { value, open, close };
}
