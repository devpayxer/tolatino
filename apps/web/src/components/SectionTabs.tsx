'use client';

// SectionTabs — the underline tab bar for a module's top-level SECTIONS
// (Despacho / Zonas / Repartidores · Platillos / Categorías / Modificadores ·
// Equipo / Horario / Nómina …). Deliberately styled as TABS, not pills, so the
// owner reads them as "configuration sections to move between" — never confuses
// them with the pill-style data filters (chip()) that sit below. Horizontally
// scrollable on mobile with desktop ‹ › arrows (via ChipRow); tokens only.

import type { ReactNode } from 'react';
import { ChipRow } from '@/components/ChipRow';

export type SectionTab<T extends string> = readonly [T, ReactNode] | readonly [T, ReactNode, string | number | null | undefined];

export function SectionTabs<T extends string>({
  tabs, value, onChange, className = '',
}: {
  tabs: readonly SectionTab<T>[];
  value: T;
  onChange: (t: T) => void;
  className?: string;
}) {
  return (
    <div className={`border-b border-hair ${className}`}>
      <ChipRow>
        {tabs.map(([key, label, badge]) => {
          const on = key === value;
          return (
            <button
              key={String(key)}
              type="button"
              onClick={() => onChange(key)}
              aria-current={on ? 'page' : undefined}
              className={`tap-y relative flex min-h-[42px] flex-none cursor-pointer items-center gap-1.5 whitespace-nowrap px-1.5 pb-2.5 pt-2 text-[13.5px] transition-colors ${
                on ? 'font-extrabold text-primary-dark' : 'font-bold text-muted hover:text-ink-soft'
              }`}
            >
              {label}
              {badge != null && badge !== '' && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold leading-none ${on ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted-2'}`}>
                  {badge}
                </span>
              )}
              {on && <span className="absolute inset-x-1 -bottom-px h-[2.5px] rounded-t-full bg-primary" />}
            </button>
          );
        })}
      </ChipRow>
    </div>
  );
}
