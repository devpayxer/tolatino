'use client';

// Shared UI primitives — compose every screen from these; don't fork markup.

import { IconX as X } from '@tabler/icons-react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useScrollLock } from '@/lib/scrollLock';
import { useLang } from '@/lib/i18n';

/**
 * Logotipo de la marca — el globo con América en negativo.
 *
 * FUENTE ÚNICA: este trazo es el mismo que `apps/web/public/logo-tolatino.svg`
 * y el que usa `scripts/make-brand-assets.mjs` para generar los iconos y la
 * imagen para redes. Va INCRUSTADO (no `<img src>`) para que herede el color
 * del sitio donde se ponga y no cueste una petición más.
 *
 * Sustituye al rombo ámbar que se usaba de marcador mientras no había logotipo.
 */
export function LogoMark({ size = 16, color = '#7B61FF', className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 482 482" fill="none" aria-hidden focusable="false" className={className}
         style={{ width: size, height: size, flex: 'none' }}>
      <path fill={color} d="M241 0C374.101 0 482 107.899 482 241C482 368.894 382.378 473.519 256.5 481.509V450.929L381.533 334.135C382.856 332.899 383.895 331.39 384.577 329.714L418.577 246.214C420.824 240.696 418.864 234.358 413.894 231.072L294.394 152.072C292.802 151.02 290.991 150.347 289.102 150.103L288.723 150.06L205.263 141.857L151.825 107.028C151.144 106.585 150.422 106.208 149.668 105.904L117.808 93.0771L110.363 43.1562C110.159 41.785 109.729 40.4722 109.104 39.2637C147 14.4373 192.314 0 241 0ZM57.3691 122.079C58.9823 126.176 62.6321 129.122 66.9775 129.835L155.481 144.344L181.041 163.33L159.012 237.961C157.746 242.248 158.867 246.885 161.95 250.122L218.336 309.304L199.104 457.391C198.508 461.983 200.499 466.528 204.279 469.203L221.23 481.199C97.3773 471.143 0 367.444 0 241C0 187.108 17.6887 137.348 47.5771 97.209L57.3691 122.079ZM297 91.5V116.5H308.5V91.5H297ZM241 113.5H282.5V88.5H241V113.5ZM187.655 61.1211C184.505 59.3389 180.743 59.0113 177.341 60.2119L177.013 60.333L157.513 67.833L166.487 91.167L180.48 85.7842L213.345 104.379L225.655 82.6211L187.655 61.1211Z" />
    </svg>
  );
}

/** Marca completa: To'(tinta) + Latino(morado) + logotipo. */
export function Wordmark({ size = 'md', onClick }: { size?: 'sm' | 'md' | 'lg'; onClick?: () => void }) {
  const fs = size === 'lg' ? 21 : size === 'md' ? 20 : 18;
  const px = size === 'lg' ? 'text-[21px]' : size === 'md' ? 'text-[20px]' : 'text-[18px]';
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-baseline font-extrabold tracking-[-.03em] ${px} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <span className="text-ink">To&rsquo;</span>
      <span className="text-primary">Latino</span>
      <LogoMark size={Math.round(fs * 0.88)} className="ml-1 self-center" />
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
  /** Foto de perfil. Si falta o no carga, quedan las iniciales debajo. */
  src,
  /** Redondez en px. Por defecto círculo; el alta lo pide cuadrado-redondeado. */
  radius,
}: {
  initials: string;
  color?: string;
  size?: number;
  className?: string;
  src?: string | null;
  radius?: number;
}) {
  // Una URL rota (archivo borrado, sin red) no puede dejar un cuadro gris: al
  // fallar la carga se descarta la foto y vuelven las iniciales.
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const photo = src && !broken ? src : null;

  return (
    <span
      className={`relative flex flex-none items-center justify-center overflow-hidden font-extrabold text-white ${className}`}
      style={{ width: size, height: size, background: color, fontSize: size * 0.34, borderRadius: radius ?? '50%' }}
    >
      {initials}
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- export estático: sin optimizador de imágenes
        <img
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}

/** The signed-in "TÚ" avatar (lilac). */
export function YouAvatar({ size = 40, onClick }: { size?: number; onClick?: () => void }) {
  const { L } = useLang();
  return (
    <button
      onClick={onClick}
      className="tap flex flex-none cursor-pointer items-center justify-center rounded-full border-2 border-lilac-ring bg-lilac font-extrabold text-primary-dark"
      style={{ width: size, height: size, fontSize: 12 }}
      aria-label={L('Tu cuenta', 'Your account')}
    >
      {L('TÚ', 'YOU')}
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
      className={`tap-y flex-none whitespace-nowrap rounded-full px-[15px] py-2 text-[12.5px] font-extrabold transition-colors ${
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
  // Una hoja no era un diálogo: sin `role`, sin Escape, sin trampa de foco y sin
  // devolver el foco al cerrar. Con el teclado te salías de la hoja sin que ella
  // se enterara y seguías tabulando por el feed de detrás; con lector de pantalla
  // no se anunciaba nada. (2ª auditoría de Comunidad, 2026-08-03.)
  const caja = useRef<HTMLDivElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);
  // `onClose` llega casi siempre como una flecha nueva en cada render del padre
  // (`onClose={close}` con `const close = () => …`). Si el efecto dependiera de
  // ella, se DESMONTARÍA Y VOLVERÍA A MONTAR en cada render — y su limpieza
  // devuelve el foco al elemento anterior. Resultado: escribías una letra, el
  // padre re-renderizaba, y el foco saltaba fuera del campo; en el teléfono se
  // cerraba el teclado y en escritorio había que volver a hacer clic tras cada
  // letra. Por eso el manejador vive en una ref y el efecto solo depende de
  // `open`. (Regresión mía del 2026-08-03 al convertir la hoja en diálogo;
  // reportada por el fundador el 2026-08-04.)
  const alCerrar = useRef(onClose);
  alCerrar.current = onClose;
  useEffect(() => {
    if (!open) return;
    focoPrevio.current = document.activeElement as HTMLElement | null;
    // El primer control de la hoja recibe el foco; si no hay ninguno, la caja.
    const t = window.setTimeout(() => {
      const c = caja.current;
      if (!c) return;
      const foco = c.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      (foco ?? c).focus({ preventScroll: true });
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); alCerrar.current(); return; }
      if (e.key !== 'Tab') return;
      const c = caja.current;
      if (!c) return;
      const focos = [...c.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focos.length === 0) return;
      const primero = focos[0], ultimo = focos[focos.length - 1];
      // El foco da la vuelta DENTRO de la hoja en vez de escaparse al fondo.
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      focoPrevio.current?.focus?.({ preventScroll: true });
    };
    // OJO: `onClose` NO va aquí a propósito — ver la nota de `alCerrar` arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
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
        ref={caja}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ ['--w' as string]: `${width}px` }}
        className={`w-full overflow-y-auto rounded-t-panel bg-white p-4 pb-7 shadow-sheet outline-none md:w-[var(--w)] md:max-w-[calc(100%-28px)] md:rounded-card md:p-5 md:shadow-modal ${
          fullHeightSheet ? 'h-[90%] md:h-auto md:max-h-[min(640px,calc(100%-40px))]' : 'max-h-[88%] md:max-h-[calc(100%-24px)]'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function OverlayTitle({ title, onClose, onBack }: { title: string; onClose: () => void; onBack?: () => void }) {
  const { L } = useLang();
  return (
    <div className="mb-3 flex items-center gap-2">
      {onBack && (
        <button
          onClick={onBack}
          className="tap flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2"
          aria-label={L('Atrás', 'Back')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      <div className="text-[16px] font-extrabold text-ink">{title}</div>
      <button
        onClick={onClose}
        className="tap ml-auto flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink-2"
        aria-label={L('Cerrar', 'Close')}
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

export function Stars({ className = '', rating }: { className?: string; rating?: number }) {
  // With a rating, render proportional stars (filled vs muted) — never a flat
  // ★★★★★ over a real 3.2. Without one (decorative/marketing use), keep 5.
  if (rating == null || !Number.isFinite(rating)) {
    return <span className={`font-bold tracking-[1px] text-amber ${className}`}>★★★★★</span>;
  }
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className={`font-bold tracking-[1px] ${className}`}>
      <span className="text-amber">{'★'.repeat(full)}</span>
      <span className="text-lilac-line">{'★'.repeat(5 - full)}</span>
    </span>
  );
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
