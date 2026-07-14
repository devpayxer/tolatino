'use client';

// Editor sheets for the Food module's menu STRUCTURE: category, modifier group,
// daypart (time window) and promotion. Each is a mobile bottom-sheet (Overlay)
// with create + edit + delete (and duplicate for modifier groups). They only
// edit a local draft and hand the result back via onSave — the module owns
// persistence (menu_config on the business row).

import { useEffect, useState } from 'react';
import { Icon as LucideIcon } from '@tabler/icons-react';
import { IconMeat as Beef, IconCake as Cake, IconCheck as Check, IconClock as Clock, IconCoffee as Coffee, IconBread as Croissant, IconCup as CupSoda, IconFish as Fish, IconGift as Gift, IconIceCream as IceCream, IconPizza as Pizza, IconPlus as Plus, IconSalad as Salad, IconBurger as Sandwich, IconShoppingBag as ShoppingBag, IconSoup as Soup, IconTag as Tag, IconTrash as Trash2, IconToolsKitchen2 as Utensils, IconGlassCocktail as Wine, IconX as X } from '@tabler/icons-react';
import { Overlay, OverlayTitle } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  DAYPART_COLORS, MENU_TILES, hourLabel, menuId,
  type Daypart, type MenuCategory, type ModGroup, type ModOption, type Promo, type PromoType,
} from '@/lib/menuConfig';

export type Lx = (es: string, en: string) => string;

// Icon library for categories (string key → icon). Keys are stored in config.
export const CAT_ICONS: Record<string, LucideIcon> = {
  croissant: Croissant, cake: Cake, pizza: Pizza, utensils: Utensils, salad: Salad,
  coffee: Coffee, wine: Wine, soup: Soup, fish: Fish, beef: Beef, sandwich: Sandwich,
  icecream: IceCream, cupsoda: CupSoda,
};
export const catIcon = (key: string): LucideIcon => CAT_ICONS[key] ?? Utensils;

export const PROMO_TYPES: { type: PromoType; Icon: LucideIcon; es: string; en: string; subEs: string; subEn: string; c: string; bg: string }[] = [
  { type: 'percent', Icon: Tag, es: '% descuento', en: '% off', subEs: 'Descuento porcentual', subEn: 'Percentage discount', c: '#4338CA', bg: '#EFEBFF' },
  { type: 'combo', Icon: ShoppingBag, es: 'Combo', en: 'Combo', subEs: 'Agrupa a un precio', subEn: 'Group at one price', c: '#065F46', bg: '#E3F5EA' },
  { type: 'bogo', Icon: Gift, es: 'BOGO', en: 'BOGO', subEs: 'Compra uno, lleva uno', subEn: 'Buy one, get one', c: '#9A3412', bg: '#FCEFD6' },
  { type: 'happy', Icon: Clock, es: 'Happy hour', en: 'Happy hour', subEs: 'Precio por horario', subEn: 'Time-based pricing', c: '#9F1239', bg: '#FDE7EF' },
];

const fieldLabel = 'mb-1.5 text-[11px] font-extrabold text-ink-soft';
const inputCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary';
const segCls = (on: boolean) =>
  `flex-1 cursor-pointer rounded-full py-2 text-center text-[11.5px] font-extrabold transition-colors ${on ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`;
const saveBtn = 'flex-1 cursor-pointer rounded-btn bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm disabled:cursor-not-allowed disabled:opacity-50';
const dangerBtn = 'flex-none cursor-pointer rounded-btn border-[1.5px] border-pink-bg bg-white px-4 py-3 text-[12.5px] font-extrabold text-pink-dark disabled:cursor-not-allowed disabled:opacity-40';
const ghostBtn = 'flex-none cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white px-4 py-3 text-[12.5px] font-extrabold text-ink';

const timeToHour = (t: string) => { const [h, m] = t.split(':').map(Number); return (h || 0) + (m || 0) / 60; };
const hourToTime = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h - Math.floor(h)) * 60)).padStart(2, '0')}`;

function DayChips({ days, onChange, es }: { days: number[]; onChange: (d: number[]) => void; es: boolean }) {
  const labels = es ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div className="flex gap-1.5">
      {labels.map((d, i) => (
        <button
          key={i}
          type="button"
          onClick={() => { const nd = [...days]; nd[i] = nd[i] ? 0 : 1; onChange(nd); }}
          className={`h-[34px] w-[34px] flex-none cursor-pointer rounded-[9px] text-[11px] font-extrabold ${days[i] ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

// ── Category ──────────────────────────────────────────────────────────────────
export function CategoryEditor({
  open, onClose, L, initial, itemCount, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: MenuCategory | null; // null = create
  itemCount: number; // items currently in this category (guards delete)
  onSave: (c: MenuCategory) => void;
  onDelete: (id: string) => void;
}) {
  const [es, setEs] = useState('');
  const [en, setEn] = useState('');
  const [icon, setIcon] = useState('utensils');
  const [tile, setTile] = useState(MENU_TILES[0]);
  const [sched, setSched] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEs(initial?.es ?? ''); setEn(initial?.en ?? ''); setIcon(initial?.icon ?? 'utensils');
    setTile(initial?.tile ?? MENU_TILES[0]); setSched(initial?.schedEs ?? ''); setConfirming(false);
  }, [open, initial]);

  const save = () => {
    const name = es.trim(); if (!name) return;
    onSave({
      id: initial?.id ?? menuId(), es: name, en: en.trim() || name, icon, tile,
      schedEs: sched.trim() || undefined, schedEn: sched.trim() || undefined,
      visible: initial?.visible ?? true,
    });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={430}>
      <OverlayTitle title={initial ? L('Editar categoría', 'Edit category') : L('Nueva categoría', 'New category')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (español)', 'Name (Spanish)')} *</div><input value={es} onChange={(e) => setEs(e.target.value)} placeholder={L('Ej. Antojitos', 'e.g. Street food')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (inglés)', 'Name (English)')}</div><input value={en} onChange={(e) => setEn(e.target.value)} placeholder={L('Opcional', 'Optional')} className={inputCls} /></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Ícono', 'Icon')}</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(CAT_ICONS).map(([k, Icon]) => (
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
            {MENU_TILES.map((t) => (
              <button key={t} type="button" onClick={() => setTile(t)} aria-label="tile"
                className={`h-10 w-10 cursor-pointer rounded-[10px] border-2 ${tile === t ? 'border-primary' : 'border-transparent'}`}
                style={{ background: `repeating-linear-gradient(135deg,${t})` }} />
            ))}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Horario (etiqueta)', 'Schedule (label)')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span></div>
          <input value={sched} onChange={(e) => setSched(e.target.value)} placeholder={L('Ej. Mañana · 7–11', 'e.g. Morning · 7–11')} className={inputCls} />
        </div>
        <div className="mt-1 flex gap-2.5">
          {initial && (
            <button onClick={() => { if (itemCount === 0) setConfirming(true); }} disabled={itemCount > 0} className={dangerBtn}
              title={itemCount > 0 ? L('Mueve sus platillos antes de eliminar', 'Move its items before deleting') : undefined}>
              <Trash2 size={15} stroke={2.2} />
            </button>
          )}
          <button onClick={save} disabled={!es.trim()} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear categoría', 'Create category')}</button>
        </div>
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar categoría?', 'Delete category?')}
            message={L(`“${initial.es}” se quitará de tu menú. Esta acción no se puede deshacer.`, `“${initial.en}” will be removed from your menu. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
        {initial && itemCount > 0 && (
          <div className="rounded-field bg-amber-bg px-3 py-2 text-[10.5px] font-semibold text-amber-ink">
            {L(`Tiene ${itemCount} platillos — muévelos a otra categoría para poder eliminarla.`, `Has ${itemCount} items — move them to another category before deleting.`)}
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ── Modifier group ────────────────────────────────────────────────────────────
export function ModGroupEditor({
  open, onClose, L, initial, usedCount, onSave, onDelete, onDuplicate,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: ModGroup | null;
  usedCount: number; // items using this group (info only)
  onSave: (g: ModGroup) => void;
  onDelete: (id: string) => void;
  onDuplicate: (g: ModGroup) => void;
}) {
  const [es, setEs] = useState('');
  const [en, setEn] = useState('');
  const [single, setSingle] = useState(true);
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<ModOption[]>([{ es: '', price: 0 }]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEs(initial?.es ?? ''); setEn(initial?.en ?? '');
    setSingle(initial?.single ?? true); setRequired(initial?.required ?? false);
    setOptions(initial?.options.length ? initial.options.map((o) => ({ ...o })) : [{ es: '', price: 0 }, { es: '', price: 0 }]);
    setConfirming(false);
  }, [open, initial]);

  const upOpt = (i: number, p: Partial<ModOption>) => setOptions((xs) => xs.map((o, j) => (j === i ? { ...o, ...p } : o)));
  const validOpts = options.filter((o) => o.es.trim());
  const ready = !!es.trim() && validOpts.length >= 1;

  const build = (): ModGroup => ({
    id: initial?.id ?? menuId(), es: es.trim(), en: en.trim() || es.trim(),
    single, required, options: validOpts.map((o) => ({ es: o.es.trim(), en: o.en?.trim() || undefined, price: Number(o.price) || 0 })),
  });

  return (
    <Overlay open={open} onClose={onClose} width={440} fullHeightSheet>
      <OverlayTitle title={initial ? L('Editar grupo', 'Edit group') : L('Nuevo grupo de opciones', 'New option group')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (español)', 'Name (Spanish)')} *</div><input value={es} onChange={(e) => setEs(e.target.value)} placeholder={L('Ej. Salsa', 'e.g. Salsa')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (inglés)', 'Name (English)')}</div><input value={en} onChange={(e) => setEn(e.target.value)} placeholder={L('Opcional', 'Optional')} className={inputCls} /></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('El cliente elige', 'Customer picks')}</div>
          <div className="flex rounded-full bg-lilac-2 p-0.5">
            <button type="button" onClick={() => setSingle(true)} className={segCls(single)}>{L('Una opción', 'One option')}</button>
            <button type="button" onClick={() => setSingle(false)} className={segCls(!single)}>{L('Varias', 'Multiple')}</button>
          </div>
        </div>
        <button type="button" onClick={() => setRequired(!required)} className="flex cursor-pointer items-center gap-2.5 rounded-field border border-hair bg-app px-3 py-2.5 text-left">
          <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded ${required ? 'bg-primary' : 'bg-lilac-line'}`}>{required && <Check size={11} className="text-white" stroke={3.2} />}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-bold text-ink">{L('Obligatorio', 'Required')}</span>
            <span className="block text-[10px] font-medium text-muted-2">{L('El cliente debe elegir antes de agregar.', 'The customer must choose before adding.')}</span>
          </span>
        </button>
        <div>
          <div className={fieldLabel}>{L('Opciones', 'Options')} *</div>
          <div className="flex flex-col gap-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={o.es} onChange={(e) => upOpt(i, { es: e.target.value })} placeholder={L(`Opción ${i + 1}`, `Option ${i + 1}`)} className={`${inputCls} min-w-0 flex-1`} />
                <div className="flex w-[92px] flex-none items-center rounded-field border-[1.5px] border-lilac-line bg-white px-2 focus-within:border-primary">
                  <span className="text-[12px] font-bold text-muted-2">+$</span>
                  <input value={o.price || ''} onChange={(e) => upOpt(i, { price: Number(String(e.target.value).replace(/[^0-9.]/g, '')) || 0 })} placeholder="0" inputMode="decimal" className="min-w-0 flex-1 border-none bg-transparent px-1 py-2.5 text-[12.5px] font-semibold text-ink outline-none" />
                </div>
                <button type="button" onClick={() => setOptions((xs) => xs.filter((_, j) => j !== i))} disabled={options.length <= 1} aria-label={L('Quitar opción', 'Remove option')} className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-btn text-pink-dark disabled:opacity-30">
                  <X size={14} stroke={2.6} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setOptions((xs) => [...xs, { es: '', price: 0 }])} className="mt-2 flex cursor-pointer items-center gap-1.5 text-[11.5px] font-extrabold text-primary-dark">
            <Plus size={13} stroke={2.6} />{L('Agregar opción', 'Add option')}
          </button>
        </div>
        {initial && usedCount > 0 && (
          <div className="rounded-field bg-lilac-2 px-3 py-2 text-[10.5px] font-semibold text-ink-2">
            {L(`Se usa en ${usedCount} platillo${usedCount === 1 ? '' : 's'} — los cambios aplican en todos.`, `Used by ${usedCount} item${usedCount === 1 ? '' : 's'} — changes apply everywhere.`)}
          </div>
        )}
        <div className="mt-1 flex gap-2.5">
          {initial && (
            <>
              <button onClick={() => setConfirming(true)} aria-label={L('Eliminar', 'Delete')} className={dangerBtn}><Trash2 size={15} stroke={2.2} /></button>
              <button onClick={() => { if (ready) { onDuplicate({ ...build(), id: menuId(), es: `${build().es} (copia)`, en: `${build().en} (copy)` }); onClose(); } }} className={ghostBtn}>{L('Duplicar', 'Duplicate')}</button>
            </>
          )}
          <button onClick={() => { if (ready) { onSave(build()); onClose(); } }} disabled={!ready} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear grupo', 'Create group')}</button>
        </div>
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar grupo de opciones?', 'Delete option group?')}
            message={usedCount > 0
              ? L(`“${initial.es}” se usa en ${usedCount} platillo${usedCount === 1 ? '' : 's'} y se quitará de todos. No se puede deshacer.`, `“${initial.en}” is used by ${usedCount} item${usedCount === 1 ? '' : 's'} and will be removed from all of them. This can’t be undone.`)
              : L(`“${initial.es}” se eliminará. Esta acción no se puede deshacer.`, `“${initial.en}” will be deleted. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}

// ── Daypart ───────────────────────────────────────────────────────────────────
export function DaypartEditor({
  open, onClose, L, es: isEs, initial, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx; es: boolean;
  initial: Daypart | null;
  onSave: (d: Daypart) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [start, setStart] = useState('07:00');
  const [end, setEnd] = useState('11:00');
  const [days, setDays] = useState<number[]>([1, 1, 1, 1, 1, 1, 1]);
  const [colorIdx, setColorIdx] = useState(0);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.es ?? '');
    setStart(initial ? hourToTime(initial.start) : '07:00');
    setEnd(initial ? hourToTime(initial.end) : '11:00');
    setDays(initial?.days ? [...initial.days] : [1, 1, 1, 1, 1, 1, 1]);
    setColorIdx(Math.max(0, DAYPART_COLORS.findIndex((c) => c.color === initial?.color)));
    setConfirming(false);
  }, [open, initial]);

  const ready = !!name.trim() && timeToHour(end) > timeToHour(start) && days.some(Boolean);

  const save = () => {
    if (!ready) return;
    const c = DAYPART_COLORS[colorIdx] ?? DAYPART_COLORS[0];
    onSave({
      id: initial?.id ?? menuId(), es: name.trim(), en: initial?.en && initial.es === name.trim() ? initial.en : name.trim(),
      start: timeToHour(start), end: timeToHour(end), days, color: c.color, bg: c.bg, on: initial?.on ?? true,
    });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={430}>
      <OverlayTitle title={initial ? L('Editar franja', 'Edit daypart') : L('Nueva franja', 'New daypart')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div><div className={fieldLabel}>{L('Nombre', 'Name')} *</div><input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('Ej. Desayunos', 'e.g. Breakfast')} className={inputCls} /></div>
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Empieza', 'Starts')}</div><input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={`${inputCls} text-left [&::-webkit-date-and-time-value]:text-left`} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Termina', 'Ends')}</div><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={`${inputCls} text-left [&::-webkit-date-and-time-value]:text-left`} /></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Días', 'Days')}</div>
          <DayChips days={days} onChange={setDays} es={isEs} />
        </div>
        <div>
          <div className={fieldLabel}>{L('Color', 'Color')}</div>
          <div className="flex gap-1.5">
            {DAYPART_COLORS.map((c, i) => (
              <button key={c.color} type="button" onClick={() => setColorIdx(i)} aria-label={c.color}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 ${colorIdx === i ? 'border-ink' : 'border-transparent'}`} style={{ background: c.bg }}>
                <span className="h-4 w-4 rounded-full" style={{ background: c.color }} />
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-field bg-lilac-2 px-3 py-2 text-[10.5px] font-semibold text-ink-2">
          {hourLabel(timeToHour(start))} – {hourLabel(timeToHour(end))}
        </div>
        <div className="mt-1 flex gap-2.5">
          {initial && <button onClick={() => setConfirming(true)} aria-label={L('Eliminar', 'Delete')} className={dangerBtn}><Trash2 size={15} stroke={2.2} /></button>}
          <button onClick={save} disabled={!ready} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear franja', 'Create daypart')}</button>
        </div>
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar franja?', 'Delete daypart?')}
            message={L(`“${initial.es}” se eliminará de tu horario. Esta acción no se puede deshacer.`, `“${initial.en}” will be removed from your schedule. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}

// ── Promotion ─────────────────────────────────────────────────────────────────
export function PromoEditor({
  open, onClose, L, es: isEs, initial, createType, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx; es: boolean;
  initial: Promo | null;
  createType: PromoType; // used when initial == null
  onSave: (p: Promo) => void;
  onDelete: (id: string) => void;
}) {
  const type = initial?.type ?? createType;
  const meta = PROMO_TYPES.find((t) => t.type === type) ?? PROMO_TYPES[0];
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');        // redeemable checkout code (percent promos)
  const [minOrder, setMinOrder] = useState(''); // subtotal required to use the code
  const [tStart, setTStart] = useState('16:00');
  const [tEnd, setTEnd] = useState('18:00');
  const [days, setDays] = useState<number[]>([1, 1, 1, 1, 1, 1, 1]);
  const [status, setStatus] = useState<Promo['status']>('active');
  const [startDate, setStartDate] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirming(false);
    setName(initial?.es ?? ''); setDesc(initial?.descEs ?? '');
    setValue(initial?.value != null ? String(initial.value) : '');
    setCode(initial?.code ?? ''); setMinOrder(initial?.minOrder != null ? String(initial.minOrder) : '');
    setTStart(initial?.timeStart != null ? hourToTime(initial.timeStart) : '16:00');
    setTEnd(initial?.timeEnd != null ? hourToTime(initial.timeEnd) : '18:00');
    setDays(initial?.days ? [...initial.days] : [1, 1, 1, 1, 1, 1, 1]);
    setStatus(initial?.status ?? 'active'); setStartDate(initial?.startDate ?? '');
  }, [open, initial]);

  const needsValue = type === 'percent' || type === 'combo';
  const ready = !!name.trim() && (!needsValue || Number(value) > 0) && (status !== 'scheduled' || !!startDate);

  const save = () => {
    if (!ready) return;
    onSave({
      id: initial?.id ?? menuId(), type,
      es: name.trim(), en: initial?.en && initial.es === name.trim() ? initial.en : name.trim(),
      descEs: desc.trim(), descEn: initial?.descEn && initial.descEs === desc.trim() ? initial.descEn : desc.trim(),
      value: needsValue ? Number(value) || undefined : undefined,
      code: type === 'percent' && code.trim() ? code.trim().toUpperCase().replace(/\s+/g, '') : undefined,
      minOrder: type === 'percent' && Number(minOrder) > 0 ? Number(minOrder) : undefined,
      timeStart: type === 'happy' ? timeToHour(tStart) : undefined,
      timeEnd: type === 'happy' ? timeToHour(tEnd) : undefined,
      days: days.every(Boolean) ? undefined : days,
      status, startDate: status === 'scheduled' ? startDate : undefined,
    });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={440} fullHeightSheet>
      <OverlayTitle title={initial ? L('Editar promoción', 'Edit promotion') : L('Nueva promoción', 'New promotion')} onClose={onClose} />
      <div className="mb-3.5 flex items-center gap-2.5 rounded-field px-3 py-2.5" style={{ background: meta.bg }}>
        <meta.Icon size={16} strokeWidth={2.2} style={{ color: meta.c }} />
        <span className="text-[12px] font-extrabold" style={{ color: meta.c }}>{L(meta.es, meta.en)}</span>
      </div>
      <div className="flex flex-col gap-3.5">
        <div><div className={fieldLabel}>{L('Nombre', 'Name')} *</div><input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('Ej. Martes 2x1', 'e.g. Taco Tuesday')} className={inputCls} /></div>
        <div><div className={fieldLabel}>{L('Descripción corta', 'Short description')}</div><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={L('Lo que ve el cliente', 'What the customer sees')} className={inputCls} /></div>
        {type === 'percent' && (
          <>
          <div><div className={fieldLabel}>{L('Descuento (%)', 'Discount (%)')} *</div>
            <div className="flex w-[130px] items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary">
              <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))} placeholder="20" inputMode="numeric" className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-[13px] font-semibold text-ink outline-none" />
              <span className="text-[13px] font-bold text-muted-2">%</span>
            </div>
          </div>
          {/* Redeemable code: with a code, the customer types it in the cart to get
              this % off (the business absorbs it). Without a code it stays a
              display-only badge. */}
          <div className="flex gap-3">
            <div className="flex-1"><div className={fieldLabel}>{L('Código (opcional)', 'Code (optional)')}</div>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))} placeholder={L('Ej. BIENVENIDO10', 'e.g. WELCOME10')} maxLength={24} className={`${inputCls} uppercase`} />
            </div>
            <div className="w-[120px] flex-none"><div className={fieldLabel}>{L('Pedido mínimo', 'Minimum')}</div>
              <div className="flex items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary">
                <span className="text-[13px] font-bold text-muted-2">$</span>
                <input value={minOrder} onChange={(e) => setMinOrder(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" inputMode="decimal" className="min-w-0 flex-1 border-none bg-transparent px-1.5 py-2.5 text-[13px] font-semibold text-ink outline-none" />
              </div>
            </div>
          </div>
          <div className="-mt-1 text-[10.5px] font-medium leading-snug text-muted-2">
            {code.trim()
              ? L('El cliente escribe este código en el carrito para recibir el descuento. Tú absorbes la promoción; To’Latino no cobra nada de ella.',
                  'The customer types this code in the cart to get the discount. You fund the promo; To’Latino takes nothing from it.')
              : L('Sin código = solo se muestra como distintivo (no se canjea en el carrito).',
                  'No code = it only shows as a badge (not redeemable at checkout).')}
          </div>
          </>
        )}
        {type === 'combo' && (
          <div><div className={fieldLabel}>{L('Precio del combo', 'Combo price')} *</div>
            <div className="flex w-[130px] items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary">
              <span className="text-[13px] font-bold text-muted-2">$</span>
              <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="25" inputMode="decimal" className="min-w-0 flex-1 border-none bg-transparent px-1.5 py-2.5 text-[13px] font-semibold text-ink outline-none" />
            </div>
          </div>
        )}
        {type === 'happy' && (
          <div className="flex gap-3">
            <div className="flex-1"><div className={fieldLabel}>{L('Desde', 'From')}</div><input type="time" value={tStart} onChange={(e) => setTStart(e.target.value)} className={`${inputCls} text-left [&::-webkit-date-and-time-value]:text-left`} /></div>
            <div className="flex-1"><div className={fieldLabel}>{L('Hasta', 'To')}</div><input type="time" value={tEnd} onChange={(e) => setTEnd(e.target.value)} className={`${inputCls} text-left [&::-webkit-date-and-time-value]:text-left`} /></div>
          </div>
        )}
        <div>
          <div className={fieldLabel}>{L('Días', 'Days')}</div>
          <DayChips days={days} onChange={setDays} es={isEs} />
        </div>
        <div>
          <div className={fieldLabel}>{L('Estado', 'Status')}</div>
          <div className="flex rounded-full bg-lilac-2 p-0.5">
            {([['active', L('Activa', 'Active')], ['paused', L('Pausada', 'Paused')], ['scheduled', L('Programada', 'Scheduled')]] as [Promo['status'], string][]).map(([k, lab]) => (
              <button key={k} type="button" onClick={() => setStatus(k)} className={segCls(status === k)}>{lab}</button>
            ))}
          </div>
          {status === 'scheduled' && (
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${inputCls} mt-2 text-left [&::-webkit-date-and-time-value]:text-left`} />
          )}
        </div>
        <div className="mt-1 flex gap-2.5">
          {initial && <button onClick={() => setConfirming(true)} aria-label={L('Eliminar', 'Delete')} className={dangerBtn}><Trash2 size={15} stroke={2.2} /></button>}
          <button onClick={save} disabled={!ready} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear promoción', 'Create promotion')}</button>
        </div>
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar promoción?', 'Delete promotion?')}
            message={L(`“${initial.es}” se eliminará. Esta acción no se puede deshacer.`, `“${initial.en}” will be deleted. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}
