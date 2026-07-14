// Per-business cart persistence (localStorage) with a 24h TTL. The cart is the
// consumer's in-progress order for ONE business; like DoorDash/Uber Eats we keep
// it across leaving/returning to the listing so a half-built order isn't lost.
// After 24h (from the last edit) it expires and disappears. The caller REVALIDATES
// stock on restore (an item may have sold out / left the menu). Local only —
// nothing touches the DB until checkout, so it works for guests and signed-in
// users alike. Keyed by business slug; storing/reading is best-effort (a disabled
// or full localStorage never throws up to the UI).

const PREFIX = 'tl:cart:';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type Stored<T> = { v: 1; savedAt: number; cart: Record<string, T> };

/** Load a business's saved cart, or null if none / expired / unreadable. Expired
 *  or malformed entries are cleared as a side effect. */
export function loadCart<T>(slug: string): Record<string, T> | null {
  if (typeof window === 'undefined' || !slug) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + slug);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored<T>;
    if (!s || typeof s !== 'object' || !s.cart || typeof s.cart !== 'object' || Date.now() - (s.savedAt ?? 0) > TTL_MS) {
      window.localStorage.removeItem(PREFIX + slug);
      return null;
    }
    return s.cart;
  } catch {
    return null;
  }
}

/** Persist a business's cart, re-stamping the 24h TTL. An empty cart clears the
 *  entry (nothing to keep). Best-effort — quota / disabled storage is swallowed. */
export function saveCart<T>(slug: string, cart: Record<string, T>): void {
  if (typeof window === 'undefined' || !slug) return;
  try {
    if (!cart || Object.keys(cart).length === 0) { window.localStorage.removeItem(PREFIX + slug); return; }
    window.localStorage.setItem(PREFIX + slug, JSON.stringify({ v: 1, savedAt: Date.now(), cart } as Stored<T>));
  } catch {
    /* storage full or disabled — the in-memory cart still works this session */
  }
}

/** Drop a business's saved cart (e.g. after a completed order). */
export function clearCart(slug: string): void {
  if (typeof window === 'undefined' || !slug) return;
  try { window.localStorage.removeItem(PREFIX + slug); } catch { /* ignore */ }
}
