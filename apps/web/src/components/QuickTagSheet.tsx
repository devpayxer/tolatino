'use client';

// Tiny popup to create a custom tag/etiqueta without leaving the wizard. Shared
// by the Productos / Servicios / Menú create flows. The parent owns persistence
// (adds the label to its config's reusable tag list + selects it on the draft).

import { useEffect, useState } from 'react';
import { Overlay, OverlayTitle } from '@/components/ui';

export function QuickTagSheet({
  open, onClose, L, onCreate, existing = [],
}: {
  open: boolean;
  onClose: () => void;
  L: (es: string, en: string) => string;
  onCreate: (label: string) => void;
  existing?: string[];
}) {
  const [v, setV] = useState('');
  useEffect(() => { if (open) setV(''); }, [open]);

  const label = v.trim();
  const dup = existing.some((t) => t.toLowerCase() === label.toLowerCase());
  const create = () => { if (!label || dup) return; onCreate(label); onClose(); };

  return (
    <Overlay open={open} onClose={onClose} width={380}>
      <OverlayTitle title={L('Nueva etiqueta', 'New tag')} onClose={onClose} />
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
          placeholder={L('Ej. Hecho a mano, Sin gluten…', 'e.g. Handmade, Gluten-free…')}
          maxLength={24}
          className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary"
        />
        {dup && <div className="text-[11px] font-semibold text-pink-dark">{L('Ya existe esa etiqueta.', 'That tag already exists.')}</div>}
        <button onClick={create} disabled={!label || dup} className="w-full cursor-pointer rounded-btn bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm disabled:cursor-not-allowed disabled:opacity-50">
          {L('Crear etiqueta', 'Create tag')}
        </button>
      </div>
    </Overlay>
  );
}
