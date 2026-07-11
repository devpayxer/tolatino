'use client';

// Shared UI primitives — compose every screen from these; don't fork markup.

import { IconX as X } from '@tabler/icons-react';
import type { CSSProperties, ReactNode } from 'react';
import { useScrollLock } from '@/lib/scrollLock';

/** CSS wordmark: To'(ink) + Latino(purple) + amber diamond. */
export function Wordmark({ size = 'md', onClick }: { size?: 'sm' | 'md' | 'lg'; onClick?: () => void }) {
  const px = size === 'lg' ? 'text-[21px]' : size === 'md' ? 'text-[20px]' : 'text-[18px]';
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-baseline font-extrabold tracking-[-.03em] ${px} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <span className="text-ink">To&rsquo;</span>
      <span className="text-primary">Latino</span>
      <span className="ml-1 inline-block h-1.5 w-1.5 rotate-45 self-center bg-amber" />
    </span>
  );
}

/** Verified check badge (purple circle). */
export function VerifiedBadge({ size = 19 }: { size?: number }) {
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-full bg-primary"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

export function Avatar({
  initials,
  color,
  size = 44,
  className = '',
}: {
  initials: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full font-extrabold text-white ${className}`}
      style={{ width: size, height: size, background: color, fontSize: size * 0.34 }}
    >
      {initials}
    </span>
  );
}

/** The signed-in "TÚ" avatar (lilac). */
export function YouAvatar({ size = 40, onClick }: { size?: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-none cursor-pointer items-center justify-center rounded-full border-2 border-lilac-ring bg-lilac font-extrabold text-primary-dark"
      style={{ width: size, height: size, fontSize: 12 }}
      aria-label="TÚ"
    >
      TÚ
    </button>
  );
}

export function Chip({
  active,
  children,
  onClick,
  className = '',
  style,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={style}
      className={`flex-none whitespace-nowrap rounded-full px-[15px] py-2 text-[12.5px] font-extrabold transition-colors ${
        active
          ? 'bg-primary text-white shadow-cta-sm'
          : 'bg-white text-ink-soft shadow-[inset_0_0_0_1px_rgba(30,27,46,.08)]'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** On/off toggle. The visual pill stays compact, but the tappable area is ≥44px
 *  (mobile touch minimum) and colors come from tokens — never raw hex. Replaces
 *  the hand-rolled per-screen switches. */
export function Switch({ on, onClick, big, label }: { on: boolean; onClick: () => void; big?: boolean; label?: string }) {
  const w = big ? 44 : 40;
  const h = big ? 26 : 24;
  const k = h - 6;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className="relative flex min-h-11 flex-none cursor-pointer items-center"
      style={{ width: w }}
    >
      <span
        className={`relative block w-full rounded-full transition-colors ${on ? 'bg-primary' : 'bg-lilac-ring'}`}
        style={{ height: h }}
      >
        <span
          className="absolute top-[3px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.18)] transition-all"
          style={{ width: k, height: k, left: on ? w - k - 3 : 3 }}
        />
      </span>
    </button>
  );
}

export function SoonTag({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-amber-bg px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-[.03em] text-amber-ink">
      {label}
    </span>
  );
}

/**
 * Responsive overlay: bottom sheet on mobile, centered dialog (or side panel)
 * on ≥768px — per handoff modal specs.
 */
export function Overlay({
  open,
  onClose,
  children,
  align = 'center',
  width = 460,
  fullHeightSheet = false,
  zIndex,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'center' | 'right' | 'top';
  width?: number;
  fullHeightSheet?: boolean;
  // Base overlays share z-index 70. Pass a higher value for an overlay that must
  // stack ABOVE another open overlay (e.g. a confirm/customize sheet opened from
  // WITHIN the cart) — with equal z-index the later-in-DOM overlay would win and
  // hide it.
  zIndex?: number;
}) {
  useScrollLock(open); // lock background scroll while this overlay is open (site-wide)
  if (!open) return null;
  const desktopAlign =
    align === 'right'
      ? 'md:items-start md:justify-end md:p-[14px]'
      : align === 'top'
        ? 'md:items-start md:justify-center md:p-10'
        : 'md:items-center md:justify-center md:p-6';
  return (
    <div
      style={zIndex != null ? { zIndex } : undefined}
      className={`fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(30,27,46,.45)] ${desktopAlign}`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ['--w' as string]: `${width}px` }}
        className={`w-full overflow-y-auto rounded-t-panel bg-white p-4 pb-7 shadow-sheet md:w-[var(--w)] md:max-w-[calc(100%-28px)] md:rounded-card md:p-5 md:shadow-modal ${
          fullHeightSheet ? 'h-[90%] md:h-auto md:max-h-[min(640px,calc(100%-40px))]' : 'max-h-[88%] md:max-h-[calc(100%-24px)]'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function OverlayTitle({ title, onClose, onBack }: { title: string; onClose: () => void; onBack?: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {onBack && (
        <button
          onClick={onBack}
          className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2"
          aria-label="back"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      <div className="text-[16px] font-extrabold text-ink">{title}</div>
      <button
        onClick={onClose}
        className="ml-auto flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink-2"
        aria-label="close"
      >
        <X size={15} stroke={2.8} />
      </button>
    </div>
  );
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-card border border-hair bg-white shadow-card ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function Stars({ className = '' }: { className?: string }) {
  return <span className={`font-bold tracking-[1px] text-amber ${className}`}>★★★★★</span>;
}

export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="rounded-card-sm border border-dashed border-[rgba(123,97,255,.3)] bg-white p-8 text-center">
      <div className="text-[13.5px] font-bold text-muted">{title}</div>
      {sub && <div className="mt-1 text-[12px] font-semibold text-muted-2">{sub}</div>}
    </div>
  );
}

/** Loading skeletons — shown while real data is fetched, so screens never flash
 *  the demo fixtures. `card` = media card (Negocios/Eventos); `post` = feed post
 *  (Comunidad). Pass the screen's own grid/stack classes via `className`. */
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-card border border-hair bg-white shadow-card">
      <div className="aspect-[16/10] w-full animate-pulse bg-lilac-2" />
      <div className="flex flex-col gap-2 p-3.5">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-lilac-2" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-hair" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-hair" />
      </div>
    </div>
  );
}
function SkeletonPost() {
  return (
    <div className="rounded-card border border-hair bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 flex-none animate-pulse rounded-full bg-lilac-2" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-28 animate-pulse rounded bg-lilac-2" />
          <div className="h-2.5 w-20 animate-pulse rounded bg-hair" />
        </div>
      </div>
      <div className="mt-3.5 flex flex-col gap-2">
        <div className="h-3 w-full animate-pulse rounded bg-hair" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-hair" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-hair" />
      </div>
    </div>
  );
}
export function SkeletonList({ count = 6, variant = 'card', className = '' }: { count?: number; variant?: 'card' | 'post'; className?: string }) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }, (_, i) => (variant === 'post' ? <SkeletonPost key={i} /> : <SkeletonCard key={i} />))}
    </div>
  );
}

/** Primary CTA button (purple, elevated). */
export function PrimaryBtn({
  children,
  onClick,
  disabled,
  className = '',
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
      className={`w-full rounded-btn-lg p-[13px] text-[14px] font-extrabold text-white transition-colors ${
        disabled ? 'cursor-not-allowed bg-lilac-line' : 'cursor-pointer bg-primary shadow-cta hover:bg-primary-dark'
      } ${className}`}
    >
      {children}
    </button>
  );
}
