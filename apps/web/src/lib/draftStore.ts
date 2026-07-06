'use client';

// Persist an in-progress wizard draft to localStorage so the owner can leave the
// create flow and recover their progress later. Keyed per business + module.
// Window-guarded (Next static export / SSR). Best-effort: quota or disabled
// storage never throws to the caller.

export function loadDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, draft: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    /* quota exceeded / storage disabled — recovery is a nicety, not critical */
  }
}

export function clearDraft(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
