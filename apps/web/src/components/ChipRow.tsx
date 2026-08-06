'use client';

// Horizontal chip row with desktop scroll arrows. On mobile the row pans with
// touch (arrows hidden); on md+ — where there's no touch and the scrollbar is
// hidden — floating ‹ › buttons appear whenever content overflows on that side,
// so nothing is ever unreachable with a mouse. Reusable for any chip/filter row.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight } from '@tabler/icons-react';

export function ChipRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  const check = () => {
    const el = ref.current;
    if (!el) return;
    setCanL(el.scrollLeft > 2);
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  // Re-measure after every render (children change) + on container resize.
  useEffect(() => { check(); });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener('resize', check);
    return () => { ro.disconnect(); window.removeEventListener('resize', check); };
  }, []);

  const nudge = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.7), behavior: 'smooth' });
  };

  const arrowCls =
    'absolute top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink shadow-card md:flex';

  return (
    <div className="relative min-w-0">
      {canL && (
        <button type="button" onClick={() => nudge(-1)} aria-label="‹" className={`${arrowCls} left-0`}>
          <ChevronLeft size={15} stroke={2.6} />
        </button>
      )}
      <div ref={ref} onScroll={check} className={`no-scrollbar -my-1.5 flex min-w-0 touch-pan-x gap-2 overflow-x-auto py-1.5 ${className}`}>
        {children}
      </div>
      {canR && (
        <button type="button" onClick={() => nudge(1)} aria-label="›" className={`${arrowCls} right-0`}>
          <ChevronRight size={15} stroke={2.6} />
        </button>
      )}
    </div>
  );
}
