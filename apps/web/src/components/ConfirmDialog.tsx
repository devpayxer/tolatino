'use client';

// Small confirmation dialog for destructive actions (delete/remove). A tap on
// "Eliminar" should never delete instantly — this asks first so an accidental
// tap can be undone. Renders above any Overlay/sheet (z-[90]); bottom-sheet on
// mobile, centered card on desktop. Controlled: the caller owns `open`.

import { IconAlertTriangle as AlertTriangle } from '@tabler/icons-react';
import { useScrollLock } from '@/lib/scrollLock';

export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel, cancelLabel,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
}) {
  useScrollLock(open);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(30,27,46,.5)] md:items-center md:p-6"
      onClick={onClose}
      role="alertdialog"
      aria-modal="true"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-panel bg-white p-5 pb-7 shadow-sheet md:w-[380px] md:max-w-[calc(100%-28px)] md:rounded-card md:pb-5 md:shadow-modal">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-pink-bg text-pink-dark">
            <AlertTriangle size={18} stroke={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-extrabold text-ink">{title}</div>
            {message && <div className="mt-1 text-[12.5px] font-medium leading-relaxed text-muted">{message}</div>}
          </div>
        </div>
        <div className="mt-4 flex gap-2.5">
          <button onClick={onClose} className="flex-1 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white py-3 text-[13px] font-extrabold text-ink">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="flex-1 cursor-pointer rounded-btn bg-pink-dark py-3 text-[13px] font-extrabold text-white shadow-cta-sm">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
