'use client';

// Editor sheets for the Renta module's structure: rental category and reusable
// priced add-on. Mobile bottom-sheets (Overlay) with create + edit + delete
// (confirmed). They edit a local draft and hand the result back via onSave — the
// module owns persistence (rental_config on the business row). Mirrors
// ServiceEditors.

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Armchair, Bike, Boxes, Camera, Car, GraduationCap, Gift, Home, Music, Package,
  PartyPopper, Shirt, Tent, Trash2, Utensils, Wrench,
} from 'lucide-react';
import { Overlay, OverlayTitle } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RENTAL_TILES, rentId, type RentalAddon, type RentalCategory } from '@/lib/rentalConfig';

export type Lx = (es: string, en: string) => string;

export const RENT_CAT_ICONS: Record<string, LucideIcon> = {
  boxes: Boxes, home: Home, armchair: Armchair, utensils: Utensils, music: Music,
  wrench: Wrench, camera: Camera, party: PartyPopper, tent: Tent, gift: Gift,
  package: Package, car: Car, bike: Bike, shirt: Shirt, grad: GraduationCap,
};
export const rentCatIcon = (key: string): LucideIcon => RENT_CAT_ICONS[key] ?? Boxes;

const fieldLabel = 'mb-1.5 text-[11px] font-extrabold text-ink-soft';
const inputCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary';
const saveBtn = 'flex-1 cursor-pointer rounded-btn bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm disabled:cursor-not-allowed disabled:opacity-50';
const dangerBtn = 'flex-none cursor-pointer rounded-btn border-[1.5px] border-pink-bg bg-white px-4 py-3 text-[12.5px] font-extrabold text-pink-dark disabled:cursor-not-allowed disabled:opacity-40';

// ── Category ──────────────────────────────────────────────────────────────────
export function RentalCategoryEditor({
  open, onClose, L, initial, itemCount, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: RentalCategory | null;
  itemCount: number;
  onSave: (c: RentalCategory) => void;
  onDelete: (id: string) => void;
}) {
  const [es, setEs] = useState('');
  const [en, setEn] = useState('');
  const [icon, setIcon] = useState('boxes');
  const [tile, setTile] = useState(RENTAL_TILES[0]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEs(initial?.es ?? ''); setEn(initial?.en ?? ''); setIcon(initial?.icon ?? 'boxes');
    setTile(initial?.tile ?? RENTAL_TILES[0]); setConfirming(false);
  }, [open, initial]);

  const save = () => {
    const name = es.trim(); if (!name) return;
    onSave({ id: initial?.id ?? rentId(), es: name, en: en.trim() || name, icon, tile, visible: initial?.visible ?? true });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={430}>
      <OverlayTitle title={initial ? L('Editar categoría', 'Edit category') : L('Nueva categoría', 'New category')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (español)', 'Name (Spanish)')} *</div><input value={es} onChange={(e) => setEs(e.target.value)} placeholder={L('Ej. Mobiliario', 'e.g. Furniture')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (inglés)', 'Name (English)')}</div><input value={en} onChange={(e) => setEn(e.target.value)} placeholder={L('Opcional', 'Optional')} className={inputCls} /></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Ícono', 'Icon')}</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(RENT_CAT_ICONS).map(([k, Icon]) => (
              <button key={k} type="button" onClick={() => setIcon(k)} aria-label={k}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] ${icon === k ? 'border-primary bg-lilac-3 text-primary-dark' : 'border-lilac-line bg-white text-muted'}`}>
                <Icon size={17} strokeWidth={2.2} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Color', 'Color')}</div>
          <div className="flex flex-wrap gap-1.5">
            {RENTAL_TILES.map((t) => (
              <button key={t} type="button" onClick={() => setTile(t)} aria-label="tile"
                className={`h-10 w-10 cursor-pointer rounded-[10px] border-2 ${tile === t ? 'border-primary' : 'border-transparent'}`}
                style={{ background: `repeating-linear-gradient(135deg,${t})` }} />
            ))}
          </div>
        </div>
        <div className="mt-1 flex gap-2.5">
          {initial && (
            <button onClick={() => { if (itemCount === 0) setConfirming(true); }} disabled={itemCount > 0} className={dangerBtn}
              title={itemCount > 0 ? L('Mueve sus artículos antes de eliminar', 'Move its items before deleting') : undefined}>
              <Trash2 size={15} strokeWidth={2.2} />
            </button>
          )}
          <button onClick={save} disabled={!es.trim()} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear categoría', 'Create category')}</button>
        </div>
        {initial && itemCount > 0 && (
          <div className="rounded-field bg-amber-bg px-3 py-2 text-[10.5px] font-semibold text-amber-ink">
            {L(`Tiene ${itemCount} artículos — muévelos a otra categoría para poder eliminarla.`, `Has ${itemCount} items — move them to another category before deleting.`)}
          </div>
        )}
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar categoría?', 'Delete category?')}
            message={L(`“${initial.es}” se quitará de tus rentas. Esta acción no se puede deshacer.`, `“${initial.en}” will be removed from your rentals. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}

// ── Add-on ────────────────────────────────────────────────────────────────────
export function RentalAddonEditor({
  open, onClose, L, initial, usedCount, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: RentalAddon | null;
  usedCount: number;
  onSave: (a: RentalAddon) => void;
  onDelete: (id: string) => void;
}) {
  const [es, setEs] = useState('');
  const [en, setEn] = useState('');
  const [price, setPrice] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEs(initial?.es ?? ''); setEn(initial?.en ?? ''); setPrice(initial?.price ? String(initial.price) : '');
    setConfirming(false);
  }, [open, initial]);

  const save = () => {
    const name = es.trim(); if (!name) return;
    onSave({ id: initial?.id ?? rentId(), es: name, en: en.trim() || undefined, price: Number(price) || 0 });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={430}>
      <OverlayTitle title={initial ? L('Editar extra', 'Edit add-on') : L('Nuevo extra', 'New add-on')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (español)', 'Name (Spanish)')} *</div><input value={es} onChange={(e) => setEs(e.target.value)} placeholder={L('Ej. Entrega a domicilio', 'e.g. Home delivery')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (inglés)', 'Name (English)')}</div><input value={en} onChange={(e) => setEn(e.target.value)} placeholder={L('Opcional', 'Optional')} className={inputCls} /></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Precio extra', 'Extra price')}</div>
          <div className="flex w-[130px] items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary">
            <span className="text-[13px] font-bold text-muted-2">+$</span>
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" inputMode="decimal" className="min-w-0 flex-1 border-none bg-transparent px-1 py-2.5 text-[13px] font-semibold text-ink outline-none" />
          </div>
        </div>
        {initial && usedCount > 0 && (
          <div className="rounded-field bg-lilac-2 px-3 py-2 text-[10.5px] font-semibold text-ink-2">
            {L(`Se usa en ${usedCount} artículo${usedCount === 1 ? '' : 's'} — los cambios aplican en todos.`, `Used by ${usedCount} item${usedCount === 1 ? '' : 's'} — changes apply everywhere.`)}
          </div>
        )}
        <div className="mt-1 flex gap-2.5">
          {initial && <button onClick={() => setConfirming(true)} aria-label={L('Eliminar', 'Delete')} className={dangerBtn}><Trash2 size={15} strokeWidth={2.2} /></button>}
          <button onClick={save} disabled={!es.trim()} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear extra', 'Create add-on')}</button>
        </div>
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar extra?', 'Delete add-on?')}
            message={L(`“${initial.es}” se eliminará y se quitará de los artículos que lo usan. No se puede deshacer.`, `“${initial.en ?? initial.es}” will be deleted and removed from items using it. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}

export { ConfirmDialog };
