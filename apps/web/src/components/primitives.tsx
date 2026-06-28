"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * ToLatino primitive components.
 * These encode the design system — extend them, don't fork their styling.
 * All use Tailwind tokens from tailwind.config.ts (bg-primary, text-ink, rounded-card …).
 * Spec: docs/design-system/DESIGN_SYSTEM.md §11
 */

/* ----------------------------------------------------------------------------
 * Wordmark — To(ink) + Latino(purple) + rotated 45° square
 * -------------------------------------------------------------------------- */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center font-extrabold tracking-tight ${className}`}>
      <span className="text-ink">To</span>
      <span className="text-primary">Latino</span>
      <span className="ml-1 inline-block h-1.5 w-1.5 rotate-45 bg-primary" />
    </span>
  );
}

/* ----------------------------------------------------------------------------
 * PhoneFrame — 392px mobile shell: status bar + scroll area + (optional) tabs
 * -------------------------------------------------------------------------- */
export function PhoneFrame({ children, tabBar }: { children: ReactNode; tabBar?: ReactNode }) {
  return (
    <div className="relative mx-auto flex h-[844px] w-full max-w-phone flex-col overflow-hidden rounded-phone bg-canvas shadow-card">
      {/* status bar */}
      <div className="flex flex-none items-center justify-between px-7 pt-3 pb-1 text-[13px] font-bold text-ink">
        <span>9:41</span>
        <span className="tracking-widest">●●● ▣</span>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
      {tabBar ? <div className="flex-none">{tabBar}</div> : null}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Card — hairline-bordered white surface
 * -------------------------------------------------------------------------- */
export function Card({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-card border border-hair bg-surface ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * StatTile — labelled metric tile (tappable). Used on home + dashboard.
 * -------------------------------------------------------------------------- */
export function StatTile({
  icon,
  label,
  value,
  sub,
  subTone = "muted",
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  subTone?: "success" | "rose" | "muted";
  onClick?: () => void;
}) {
  const tone = subTone === "success" ? "text-success" : subTone === "rose" ? "text-rose" : "text-muted-soft";
  return (
    <Card onClick={onClick} className="p-3.5">
      <div className="flex items-center gap-2">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-canvas">{icon}</div>
        <span className="text-[11.5px] font-bold text-muted">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{value}</div>
      {sub ? <div className={`mt-0.5 text-[11px] font-bold ${tone}`}>{sub}</div> : null}
    </Card>
  );
}

/* ----------------------------------------------------------------------------
 * StatusPill — small status / category badge
 * -------------------------------------------------------------------------- */
const PILL_TONES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  rose: "bg-rose-soft text-rose",
  ink: "bg-ink text-white",
  neutral: "bg-canvas text-muted",
} as const;

export function StatusPill({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: keyof typeof PILL_TONES;
  dot?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[10.5px] font-extrabold ${PILL_TONES[tone]}`}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------------
 * PrimaryButton / GhostButton
 * -------------------------------------------------------------------------- */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[14px] px-4 py-3 text-[13.5px] font-extrabold transition ${
        disabled ? "bg-canvas text-muted-soft" : "bg-primary text-white shadow-glow active:bg-primary-800"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = "" }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={`rounded-[14px] bg-canvas px-4 py-3 text-[13.5px] font-extrabold text-ink active:bg-primary/10 ${className}`}>
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------------------
 * SubView — sub-screen with a back header. Parent tab stays active.
 * -------------------------------------------------------------------------- */
export function SubView({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-hair px-4 pb-3 pt-1.5">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink" aria-label="Back">
          ‹
        </button>
        <div>
          <div className="text-base font-extrabold text-ink">{title}</div>
          {subtitle ? <div className="text-[12px] font-semibold text-muted">{subtitle}</div> : null}
        </div>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Sheet — bottom sheet overlay
 * -------------------------------------------------------------------------- */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-ink/40" onClick={onClose}>
      <div className="rounded-t-sheet bg-surface p-5 shadow-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-pill bg-line" />
        {children}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * EmptyState — reassuring empty / success state
 * -------------------------------------------------------------------------- */
export function EmptyState({ icon, title, sub }: { icon?: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">{icon ?? "✓"}</div>
      <div className="text-lg font-extrabold text-ink">{title}</div>
      {sub ? <div className="mt-1 text-[13px] font-semibold text-muted">{sub}</div> : null}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * categoryTile — placeholder imagery (gradient), NOT illustration
 * -------------------------------------------------------------------------- */
export function categoryTile(seed: string): CSSProperties {
  // deterministic hue from seed so a given business keeps its tile
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return {
    background: `repeating-linear-gradient(135deg, hsl(${h} 60% 88%) 0 14px, hsl(${(h + 24) % 360} 60% 82%) 14px 28px)`,
  };
}
