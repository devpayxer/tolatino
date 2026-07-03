'use client';

// Shared 1-minute clock. Time-based UI (a business's open/closed status) needs
// the current time and must refresh as it passes an open/close boundary — but we
// don't want a timer per card. All subscribers share one interval. Returns null
// until mounted so static-exported HTML and the first client render match
// (avoids a hydration mismatch); callers fall back to a static label meanwhile.

import { useEffect, useState } from 'react';

const subs = new Set<(d: Date) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function ensureTimer() {
  if (timer) return;
  timer = setInterval(() => {
    const d = new Date();
    subs.forEach((fn) => fn(d));
  }, 60_000);
}

export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const fn = (d: Date) => setNow(d);
    subs.add(fn);
    ensureTimer();
    return () => {
      subs.delete(fn);
      if (subs.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);
  return now;
}
