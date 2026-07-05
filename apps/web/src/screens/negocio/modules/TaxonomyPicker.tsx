'use client';

// Reusable multi-select chip picker with an owner-proposes-a-new-one flow
// (pending admin approval). Used for Subcategorías and "Lo que ofrece" in
// Información general. Official chips come in one or more labelled groups;
// selected labels outside those groups (custom-approved) render as selected
// extras; pending proposals show as dashed amber chips the owner can cancel.

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Suggestion } from '@/lib/suggestions';

export type ChipGroup = { title?: string; items: [string, string][] };

export function TaxonomyPicker({
  title, hint, groups, selected, onToggle, pending, onPropose, onCancelPending, addPlaceholder, note, L, inputCls,
}: {
  title: string;
  hint: string;
  groups: ChipGroup[];
  selected: string[];
  onToggle: (es: string) => void;
  pending: Suggestion[];
  onPropose: (label: string) => void;
  onCancelPending: (id: string) => void;
  addPlaceholder: string;
  note: string;
  L: (es: string, en: string) => string;
  inputCls: string;
}) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState('');

  const officialSet = new Set(groups.flatMap((g) => g.items.map(([es]) => es)));
  const extras = selected.filter((s) => !officialSet.has(s)); // custom-approved / cross-group
  const pend = pending.filter((s) => s.status === 'pending');

  const submit = () => {
    const v = val.trim();
    setVal('');
    setAdding(false);
    if (v) onPropose(v);
  };

  const chip = (on: boolean) =>
    `cursor-pointer rounded-full px-3 py-2 text-[12px] font-extrabold ${on ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'}`;

  return (
    <div>
      <span className="mb-1.5 block text-[12px] font-extrabold text-ink">
        {title} <span className="font-semibold text-muted">· {hint}</span>
      </span>

      <div className="max-h-[220px] overflow-y-auto">
        {groups.map((g, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-2.5' : ''}>
            {g.title && <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[.04em] text-muted">{g.title}</div>}
            <div className="flex flex-wrap gap-2">
              {g.items.map(([es, en]) => (
                <button key={es} type="button" onClick={() => onToggle(es)} className={chip(selected.includes(es))}>
                  {L(es, en)}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-2 flex flex-wrap gap-2">
          {extras.map((es) => (
            <button key={`x-${es}`} type="button" onClick={() => onToggle(es)} className={chip(true)}>
              {es}
            </button>
          ))}
          {pend.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-amber bg-amber-bg px-3 py-2 text-[12px] font-extrabold text-amber-ink">
              {s.label_es}
              <span className="rounded bg-white/70 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-[.03em] text-amber-ink">{L('pendiente', 'pending')}</span>
              <button type="button" onClick={() => onCancelPending(s.id)} aria-label={L('Cancelar', 'Cancel')} className="cursor-pointer text-amber-ink/70 hover:text-amber-ink">
                <X size={12} strokeWidth={2.8} />
              </button>
            </span>
          ))}
          {!adding && (
            <button
              type="button"
              onClick={() => { setAdding(true); setVal(''); }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border-[1.5px] border-dashed border-lilac-line bg-white px-3 py-2 text-[12px] font-extrabold text-primary-dark"
            >
              <Plus size={13} strokeWidth={2.8} /> {L('Agregar', 'Add')}
            </button>
          )}
        </div>
      </div>

      {adding && (
        <div className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); submit(); }
              if (e.key === 'Escape') { setAdding(false); setVal(''); }
            }}
            maxLength={40}
            placeholder={addPlaceholder}
            className={inputCls}
          />
          <button type="button" onClick={submit} disabled={!val.trim()} className="flex-none cursor-pointer rounded-btn bg-primary px-3.5 py-3 text-[12px] font-extrabold text-white shadow-cta-sm disabled:opacity-50">
            {L('Enviar', 'Send')}
          </button>
          <button type="button" onClick={() => { setAdding(false); setVal(''); }} className="flex-none cursor-pointer rounded-btn bg-lilac-2 px-3.5 py-3 text-[12px] font-extrabold text-ink-2">
            {L('Cancelar', 'Cancel')}
          </button>
        </div>
      )}

      <div className="mt-1.5 text-[11px] font-semibold leading-snug text-muted">{note}</div>
    </div>
  );
}
