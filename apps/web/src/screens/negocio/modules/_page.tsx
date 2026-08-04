'use client';

// Full-screen "page" for the business dashboard's edit / create / detail flows.
// Replaces cramped bottom-sheet popups (tedious on phones): a dedicated screen
// that takes over the viewport with its own sticky header (← back · title ·
// optional action), a naturally-scrolling body (centered, capped width on
// desktop so it reads as a focused page, not a stretched form), and an optional
// sticky footer bar for the primary actions / wizard nav — keyboard-friendly,
// safe-area aware. Rendered as a high-z fixed layer so it needs no coordination
// with the panel chrome underneath.

import type { ReactNode } from 'react';
import { IconChevronLeft as ChevronLeft } from '@tabler/icons-react';
import { useScrollLock } from '@/lib/scrollLock';

export function ModulePage({
  title,
  subtitle,
  onBack,
  backLabel = 'Volver',
  action,
  footer,
  children,
  maxW = 640,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  maxW?: number;
}) {
  useScrollLock(true); // this is a full-screen takeover; lock the panel behind it
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-app">
      <header className="flex flex-none items-center gap-2.5 border-b border-hair bg-white px-3.5 py-2.5 md:px-5">
        <button
          onClick={onBack}
          aria-label={backLabel}
          className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink"
        >
          <ChevronLeft size={18} stroke={2.4} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-extrabold text-ink">{title}</div>
          {subtitle && <div className="truncate text-[11.5px] font-semibold text-muted">{subtitle}</div>}
        </div>
        {action && <div className="flex flex-none items-center gap-2">{action}</div>}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-3.5 py-4 md:px-5 md:py-5" style={{ maxWidth: maxW }}>
          {children}
        </div>
      </div>

      {footer && (
        <div className="flex-none border-t border-hair bg-white px-3.5 py-3 pb-[max(env(safe-area-inset-bottom),12px)] md:px-5">
          <div className="mx-auto w-full" style={{ maxWidth: maxW }}>{footer}</div>
        </div>
      )}
    </div>
  );
}

/** Shared toast used by every module (bottom-center, above everything). */
export function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-ink px-4 py-3 text-[12.5px] font-bold text-white shadow-modal">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7BE0A8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      {msg}
    </div>
  );
}

/**
 * «No pudimos cargar esto» — el aviso honesto de una consulta que falló.
 *
 * POR QUÉ EXISTE: la auditoría de Negocios (2026-08-04) encontró 14 lecturas del
 * panel que, al fallar, escribían una lista VACÍA. El dueño leía «Sin pedidos en
 * este filtro» o «Sin citas» cuando en realidad la consulta se había caído — y en
 * un panel de negocio eso no es cosmético: quien ve «0 pedidos» no cocina.
 * Se pinta ARRIBA del listado, sin borrar lo que ya hubiera en pantalla.
 */
export function FalloCarga({ msg, onReintentar }: { msg: string; onReintentar?: () => void }) {
  return (
    <div role="alert" className="mb-3 flex flex-wrap items-center gap-2 rounded-field border border-[#F3C9D6] bg-pink-bg px-3.5 py-2.5 text-[12.5px] font-bold text-pink-dark">
      <span>{msg}</span>
      {onReintentar && (
        <button onClick={onReintentar} className="tap-y ml-auto cursor-pointer rounded-btn bg-white px-3 py-1.5 text-[12px] font-extrabold text-ink shadow-card">
          {msg.startsWith('We') || msg.startsWith("Couldn") ? 'Retry' : 'Reintentar'}
        </button>
      )}
    </div>
  );
}
