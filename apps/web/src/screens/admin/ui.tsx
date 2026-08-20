'use client';

// Primitivas de la consola Super Admin v2 (handoff 06-super-admin).
// Escritorio-primero, densa y profesional — pero SOLO tokens del design system
// (ink/primary/lilac/green/pink/amber/dash), nunca hex crudo. En ≤lg el shell
// pasa a drawer; estas piezas son responsivas por dentro.

import type { ReactNode } from 'react';

// ── Píldora de estado (consistente en toda la consola) ───────────────────────
export type Tone = 'green' | 'amber' | 'pink' | 'purple' | 'blue' | 'gray';
const TONE: Record<Tone, string> = {
  green: 'bg-green-bg text-green-ink',
  amber: 'bg-amber-bg text-amber-ink',
  pink: 'bg-pink-bg text-pink-dark',
  purple: 'bg-lilac text-primary-dark',
  blue: 'bg-blue-bg text-blue-ink',
  gray: 'bg-lilac-2 text-ink-2',
};
export function Pill({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex flex-none items-center rounded-md px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[.03em] ${TONE[tone]}`}>
      {children}
    </span>
  );
}

// ── Tarjeta blanca base de la consola ────────────────────────────────────────
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card-sm border border-line bg-white ${className}`}>{children}</div>;
}

// ── KPI / stat ───────────────────────────────────────────────────────────────
export function Stat({ value, label, tone }: { value: ReactNode; label: string; tone?: 'ink' | 'green' | 'amber' | 'pink' | 'purple' }) {
  const c = tone === 'green' ? 'text-green-ink' : tone === 'amber' ? 'text-amber-ink'
    : tone === 'pink' ? 'text-pink-dark' : tone === 'purple' ? 'text-primary-dark' : 'text-ink';
  return (
    <div className="rounded-card-sm border border-line bg-white px-4 py-3.5">
      <div className={`text-[21px] font-extrabold tracking-[-.02em] ${c}`}>{value}</div>
      <div className="mt-1 text-[10.5px] font-semibold leading-tight text-muted-2">{label}</div>
    </div>
  );
}

// ── Chip de filtro ───────────────────────────────────────────────────────────
export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick}
      className={`min-h-[34px] flex-none cursor-pointer rounded-btn px-3 text-[12px] font-extrabold transition-colors ${
 active ? 'bg-primary text-white shadow-cta-sm' : 'border-[1.5px] border-lilac-line bg-white text-ink-2 hover:bg-lilac-3'}`}>
      {children}
    </button>
  );
}
export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">{children}</div>;
}

// ── Estado vacío por sección ─────────────────────────────────────────────────
export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="rounded-card border border-dashed border-lilac-ring bg-white px-6 py-12 text-center">
      <div className="text-[15px] font-extrabold text-ink">{title}</div>
      {sub && <div className="mt-1.5 text-[12px] font-semibold text-muted-2">{sub}</div>}
    </div>
  );
}

// ── Cabecera de bloque ───────────────────────────────────────────────────────
export function BlockTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <div className="text-[15px] font-extrabold tracking-[-.01em] text-ink">{children}</div>
      {sub && <div className="mt-0.5 text-[11px] font-semibold text-muted-2">{sub}</div>}
    </div>
  );
}

// ── Toggle (kill-switch / módulo) ────────────────────────────────────────────
export function Toggle({ on, onClick, size = 'md' }: { on: boolean; onClick: () => void; size?: 'md' | 'lg' }) {
  const w = size === 'lg' ? 'h-[27px] w-[46px]' : 'h-[26px] w-[44px]';
  const k = size === 'lg' ? 'h-[21px] w-[21px]' : 'h-5 w-5';
  return (
    <button onClick={onClick} aria-pressed={on}
      className={`relative flex-none cursor-pointer rounded-full transition-colors ${w} ${on ? 'bg-green' : 'bg-muted-faint'}`}>
      <span className={`absolute top-[3px] rounded-full bg-white shadow-md transition-all ${k} ${on ? 'left-[calc(100%-3px)] -translate-x-full' : 'left-[3px]'}`} />
    </button>
  );
}
