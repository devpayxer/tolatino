'use client';

// Editor sheets for the Servicios module's structure: service category and
// reusable add-on. Mobile bottom-sheets (Overlay) with create + edit + delete
// (confirmed). They edit a local draft and hand the result back via onSave — the
// module owns persistence (service_config on the business row). Mirrors
// FoodEditors.

import { useEffect, useState } from 'react';
import { Icon as LucideIcon } from '@tabler/icons-react';
import { IconBrush as Brush, IconCamera as Camera, IconCar as Car, IconCheck as Check, IconDroplets as Droplets, IconDumbbell as Dumbbell, IconGift as Gift, IconSchool as GraduationCap, IconHandFinger as Hand, IconHeart as Heart, IconHome as Home, IconMusic as Music, IconScissors as Scissors, IconSparkles as Sparkles, IconTrash as Trash2, IconUsers as Users, IconToolsKitchen2 as Utensils, IconGlassCocktail as Wine, IconTool as Wrench } from '@tabler/icons-react';
import { Overlay, OverlayTitle } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PROVIDER_COLORS, SERVICE_TILES, svcId, type ServiceAddon, type ServiceCategory, type SvcProvider } from '@/lib/serviceConfig';

export type Lx = (es: string, en: string) => string;

export const SVC_CAT_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles, scissors: Scissors, wrench: Wrench, car: Car, wine: Wine,
  grad: GraduationCap, gift: Gift, utensils: Utensils, heart: Heart, users: Users,
  camera: Camera, droplets: Droplets, brush: Brush, hand: Hand, home: Home,
  dumbbell: Dumbbell, music: Music,
};
export const svcCatIcon = (key: string): LucideIcon => SVC_CAT_ICONS[key] ?? Sparkles;

const fieldLabel = 'mb-1.5 text-[11px] font-extrabold text-ink-soft';
const inputCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary';
const saveBtn = 'flex-1 cursor-pointer rounded-btn bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm disabled:cursor-not-allowed disabled:opacity-50';
const dangerBtn = 'flex-none cursor-pointer rounded-btn border-[1.5px] border-pink-bg bg-white px-4 py-3 text-[12.5px] font-extrabold text-pink-dark disabled:cursor-not-allowed disabled:opacity-40';

// ── Category ──────────────────────────────────────────────────────────────────
export function ServiceCategoryEditor({
  open, onClose, L, initial, itemCount, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: ServiceCategory | null;
  itemCount: number;
  onSave: (c: ServiceCategory) => void;
  onDelete: (id: string) => void;
}) {
  const [es, setEs] = useState('');
  const [en, setEn] = useState('');
  const [icon, setIcon] = useState('sparkles');
  const [tile, setTile] = useState(SERVICE_TILES[0]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEs(initial?.es ?? ''); setEn(initial?.en ?? ''); setIcon(initial?.icon ?? 'sparkles');
    setTile(initial?.tile ?? SERVICE_TILES[0]); setConfirming(false);
  }, [open, initial]);

  const save = () => {
    const name = es.trim(); if (!name) return;
    onSave({ id: initial?.id ?? svcId(), es: name, en: en.trim() || name, icon, tile, visible: initial?.visible ?? true });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={430}>
      <OverlayTitle title={initial ? L('Editar categoría', 'Edit category') : L('Nueva categoría', 'New category')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (español)', 'Name (Spanish)')} *</div><input value={es} onChange={(e) => setEs(e.target.value)} placeholder={L('Ej. Cortes', 'e.g. Haircuts')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (inglés)', 'Name (English)')}</div><input value={en} onChange={(e) => setEn(e.target.value)} placeholder={L('Opcional', 'Optional')} className={inputCls} /></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Ícono', 'Icon')}</div>
          <div className="flex flex-wrap gap-x-1 gap-y-[18px].5">
            {Object.entries(SVC_CAT_ICONS).map(([k, Icon]) => (
              <button key={k} type="button" onClick={() => setIcon(k)} aria-label={k}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] ${icon === k ? 'border-primary bg-lilac-3 text-primary-dark' : 'border-lilac-line bg-white text-muted'}`}>
                <Icon size={17} strokeWidth={2.2} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Color', 'Color')}</div>
          <div className="flex flex-wrap gap-x-1 gap-y-[18px].5">
            {SERVICE_TILES.map((t) => (
              <button key={t} type="button" onClick={() => setTile(t)} aria-label={L('Estampado', 'Pattern')}
                className={`h-10 w-10 cursor-pointer rounded-[10px] border-2 ${tile === t ? 'border-primary' : 'border-transparent'}`}
                style={{ background: `repeating-linear-gradient(135deg,${t})` }} />
            ))}
          </div>
        </div>
        <div className="mt-1 flex gap-2.5">
          {initial && (
            <button onClick={() => { if (itemCount === 0) setConfirming(true); }} disabled={itemCount > 0} className={dangerBtn}
              title={itemCount > 0 ? L('Mueve sus servicios antes de eliminar', 'Move its services before deleting') : undefined}>
              <Trash2 size={15} stroke={2.2} />
            </button>
          )}
          <button onClick={save} disabled={!es.trim()} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear categoría', 'Create category')}</button>
        </div>
        {initial && itemCount > 0 && (
          <div className="rounded-field bg-amber-bg px-3 py-2 text-[10.5px] font-semibold text-amber-ink">
            {L(`Tiene ${itemCount} servicios — muévelos a otra categoría para poder eliminarla.`, `Has ${itemCount} services — move them to another category before deleting.`)}
          </div>
        )}
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar categoría?', 'Delete category?')}
            message={L(`“${initial.es}” se quitará de tus servicios. Esta acción no se puede deshacer.`, `“${initial.en}” will be removed from your services. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}

// ── Add-on ────────────────────────────────────────────────────────────────────
export function ServiceAddonEditor({
  open, onClose, L, initial, usedCount, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: ServiceAddon | null;
  usedCount: number;
  onSave: (a: ServiceAddon) => void;
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
    onSave({ id: initial?.id ?? svcId(), es: name, en: en.trim() || undefined, price: Number(price) || 0 });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={430}>
      <OverlayTitle title={initial ? L('Editar add-on', 'Edit add-on') : L('Nuevo add-on', 'New add-on')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (español)', 'Name (Spanish)')} *</div><input value={es} onChange={(e) => setEs(e.target.value)} placeholder={L('Ej. Lavado', 'e.g. Wash')} className={inputCls} /></div>
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
            {L(`Se usa en ${usedCount} servicio${usedCount === 1 ? '' : 's'} — los cambios aplican en todos.`, `Used by ${usedCount} service${usedCount === 1 ? '' : 's'} — changes apply everywhere.`)}
          </div>
        )}
        <div className="mt-1 flex gap-2.5">
          {initial && <button onClick={() => setConfirming(true)} aria-label={L('Eliminar', 'Delete')} className={dangerBtn}><Trash2 size={15} stroke={2.2} /></button>}
          <button onClick={save} disabled={!es.trim()} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear add-on', 'Create add-on')}</button>
        </div>
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar add-on?', 'Delete add-on?')}
            message={L(`“${initial.es}” se eliminará y se quitará de los servicios que lo usan. No se puede deshacer.`, `“${initial.en ?? initial.es}” will be deleted and removed from services using it. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}

// ── Professional (bookable team member — Booksy's "Elige tu profesional") ─────
export function ServiceProviderEditor({
  open, onClose, L, initial, services, onSave, onDelete, onPickPhoto,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: SvcProvider | null;
  /** Bookable services to assign (dbId + name). Empty selection = performs ALL. */
  services: { id: string; name: string }[];
  onSave: (p: SvcProvider) => void;
  onDelete: (id: string) => void;
  /** Upload pipeline from the module (compressed → storage URL); null = local-only. */
  onPickPhoto: (file: File) => Promise<string | null>;
}) {
  const [name, setName] = useState('');
  const [tagEs, setTagEs] = useState('');
  const [tagEn, setTagEn] = useState('');
  const [color, setColor] = useState(PROVIDER_COLORS[0]);
  const [photo, setPhoto] = useState('');
  const [svcIds, setSvcIds] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? ''); setTagEs(initial?.tagEs ?? ''); setTagEn(initial?.tagEn ?? '');
    setColor(initial?.color ?? PROVIDER_COLORS[0]); setPhoto(initial?.photo ?? '');
    setSvcIds(initial?.serviceIds ?? []); setPhotoBusy(false); setConfirming(false);
  }, [open, initial]);

  const save = () => {
    const n = name.trim(); if (!n) return;
    onSave({
      id: initial?.id ?? svcId(), name: n, tagEs: tagEs.trim(), tagEn: tagEn.trim() || undefined,
      color, photo: photo || undefined, serviceIds: svcIds, active: initial?.active ?? true,
    });
    onClose();
  };
  const pick = async (file: File | null | undefined) => {
    if (!file || !file.type.startsWith('image/') || photoBusy) return;
    setPhotoBusy(true);
    const url = await onPickPhoto(file).catch(() => null);
    if (url) setPhoto(url);
    setPhotoBusy(false);
  };

  return (
    <Overlay open={open} onClose={onClose} width={430}>
      <OverlayTitle title={initial ? L('Editar profesional', 'Edit professional') : L('Nuevo profesional', 'New professional')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-3.5">
          <label className="relative flex h-16 w-16 flex-none cursor-pointer items-center justify-center overflow-hidden rounded-full text-[20px] font-extrabold text-white" style={{ background: color }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo ? <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (name.trim() ? name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : <Camera size={20} stroke={2} />)}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
            {photoBusy && <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-[9px] font-extrabold text-white">…</span>}
          </label>
          <div className="min-w-0 flex-1">
            <div className={fieldLabel}>{L('Nombre', 'Name')} *</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('Ej. Marco', 'e.g. Marco')} className={inputCls} />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Especialidad (español)', 'Specialty (Spanish)')}</div><input value={tagEs} onChange={(e) => setTagEs(e.target.value)} placeholder={L('Ej. Fades y degradados', 'e.g. Fades')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Especialidad (inglés)', 'Specialty (English)')}</div><input value={tagEn} onChange={(e) => setTagEn(e.target.value)} placeholder={L('Opcional', 'Optional')} className={inputCls} /></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Color del avatar', 'Avatar color')}</div>
          <div className="flex flex-wrap gap-x-1 gap-y-[18px].5">
            {PROVIDER_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={L('Color', 'Color')}
                className={`h-9 w-9 cursor-pointer rounded-full border-2 ${color === c ? 'border-ink' : 'border-transparent'}`} style={{ background: c }} />
            ))}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Servicios que realiza', 'Services they perform')}</div>
          <div className="mb-1.5 text-[10.5px] font-medium text-muted">{L('Sin selección = realiza todos los servicios.', 'No selection = performs every service.')}</div>
          <div className="flex flex-wrap gap-x-1 gap-y-[18px].5">
            {services.map((s) => {
              const on = svcIds.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => setSvcIds((l) => (on ? l.filter((x) => x !== s.id) : [...l, s.id]))}
                  className={`tap-y cursor-pointer rounded-full border-[1.5px] px-3 py-1.5 text-[11px] font-extrabold ${on ? 'border-primary bg-lilac-3 text-primary-dark' : 'border-lilac-line bg-white text-muted'}`}>
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-1 flex gap-2.5">
          {initial && <button onClick={() => setConfirming(true)} aria-label={L('Eliminar', 'Delete')} className={dangerBtn}><Trash2 size={15} stroke={2.2} /></button>}
          <button onClick={save} disabled={!name.trim()} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Agregar profesional', 'Add professional')}</button>
        </div>
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar profesional?', 'Remove professional?')}
            message={L(`“${initial.name}” dejará de aparecer al reservar. Sus citas existentes no cambian.`, `“${initial.name}” will no longer appear at booking. Their existing appointments stay.`)}
            confirmLabel={L('Eliminar', 'Remove')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}

// A tiny confirm hook wrapper for the module's own delete buttons (service delete
// in the wizard). Re-exported ConfirmDialog for convenience.
export { ConfirmDialog };
