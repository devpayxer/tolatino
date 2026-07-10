'use client';

// Site-wide background-scroll lock for modals/sheets/overlays. While any lock is
// held the page behind the overlay can't scroll — on desktop AND iOS Safari
// (which ignores `overflow:hidden` on <body>, so we pin the body with
// `position:fixed` and restore the scroll position on release).
//
// Reference-counted so stacked overlays (e.g. cart → address, or a sheet opened
// from another sheet) don't unlock the page early: the body only unlocks when the
// LAST lock is released. Import `useScrollLock(active)` and pass your open flag —
// the shared <Overlay> already does this, so anything built on it is covered.

import { useEffect } from 'react';

let locks = 0;
let savedScrollY = 0;
const prev: Record<string, string> = {};

function engage() {
  const b = document.body;
  savedScrollY = window.scrollY;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  for (const k of ['overflow', 'position', 'top', 'left', 'right', 'width', 'paddingRight'] as const) prev[k] = b.style[k];
  b.style.overflow = 'hidden';
  b.style.position = 'fixed';
  b.style.top = `-${savedScrollY}px`;
  b.style.left = '0';
  b.style.right = '0';
  b.style.width = '100%';
  // Reserve the (now-gone) scrollbar gutter so desktop content doesn't jump.
  if (scrollbar > 0) b.style.paddingRight = `${scrollbar}px`;
}

function release() {
  const b = document.body;
  for (const k of ['overflow', 'position', 'top', 'left', 'right', 'width', 'paddingRight'] as const) b.style[k] = prev[k] ?? '';
  window.scrollTo(0, savedScrollY);
}

/** Lock background scroll while `active` is true. Safe to call from many overlays
 *  at once — the page unlocks only when every holder has released. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    if (locks === 0) engage();
    locks += 1;
    return () => {
      locks = Math.max(0, locks - 1);
      if (locks === 0) release();
    };
  }, [active]);
}
