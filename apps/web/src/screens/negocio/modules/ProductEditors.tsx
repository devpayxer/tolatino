'use client';

// Editor sheets for the Productos module's structure: product category, reusable
// option set (variant axis), curated collection and discount code. Mobile
// bottom-sheets (Overlay) with create + edit + delete (confirmed). Each edits a
// local draft and hands the result back via onSave — the module owns persistence
// (product_config on the business row). Mirrors FoodEditors / ServiceEditors.

import { useEffect, useState } from 'react';
import { Icon as LucideIcon } from '@tabler/icons-react';
import { IconBook2 as BookOpen, IconCheck as Check, IconCoffee as Coffee, IconCookie as Cookie, IconFlower as Flower2, IconGift as Gift, IconHome as Home, IconLeaf as Leaf, IconPackage as Package, IconPalette as Palette, IconPlus as Plus, IconShoppingBag as ShoppingBag, IconShirt as Shirt, IconSparkles as Sparkles, IconTrash as Trash2, IconGlassCocktail as Wine, IconTool as Wrench, IconX as X } from '@tabler/icons-react';
import { Overlay, OverlayTitle } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  PRODUCT_TILES, prodId,
  type Collection, type Discount, type DiscountType, type OptionSet, type OptionValue, type ProductCategory,
} from '@/lib/productConfig';

export type Lx = (es: string, en: string) => string;

export const PRODUCT_CAT_ICONS: Record<string, LucideIcon> = {
  package: Package, shirt: Shirt, cookie: Cookie, coffee: Coffee, book: BookOpen,
  gift: Gift, bag: ShoppingBag, wine: Wine, sparkles: Sparkles, home: Home,
  leaf: Leaf, palette: Palette, flower: Flower2, wrench: Wrench,
};
export const prodCatIcon = (key: string): LucideIcon => PRODUCT_CAT_ICONS[key] ?? Package;

const fieldLabel = 'mb-1.5 text-[11px] font-extrabold text-ink-soft';
const inputCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary';
const saveBtn = 'flex-1 cursor-pointer rounded-btn bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm disabled:cursor-not-allowed disabled:opacity-50';
const dangerBtn = 'flex-none cursor-pointer rounded-btn border-[1.5px] border-pink-bg bg-white px-4 py-3 text-[12.5px] font-extrabold text-pink-dark disabled:cursor-not-allowed disabled:opacity-40';

// ── Category ──────────────────────────────────────────────────────────────────
export function ProductCategoryEditor({
  open, onClose, L, initial, itemCount, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: ProductCategory | null;
  itemCount: number;
  onSave: (c: ProductCategory) => void;
  onDelete: (id: string) => void;
}) {
  const [es, setEs] = useState('');
  const [en, setEn] = useState('');
  const [icon, setIcon] = useState('package');
  const [tile, setTile] = useState(PRODUCT_TILES[0]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEs(initial?.es ?? ''); setEn(initial?.en ?? ''); setIcon(initial?.icon ?? 'package');
    setTile(initial?.tile ?? PRODUCT_TILES[0]); setConfirming(false);
  }, [open, initial]);

  const save = () => {
    const name = es.trim(); if (!name) return;
    onSave({ id: initial?.id ?? prodId(), es: name, en: en.trim() || name, icon, tile, visible: initial?.visible ?? true });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={430}>
      <OverlayTitle title={initial ? L('Editar categoría', 'Edit category') : L('Nueva categoría', 'New category')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (español)', 'Name (Spanish)')} *</div><input value={es} onChange={(e) => setEs(e.target.value)} placeholder={L('Ej. Despensa', 'e.g. Pantry')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (inglés)', 'Name (English)')}</div><input value={en} onChange={(e) => setEn(e.target.value)} placeholder={L('Opcional', 'Optional')} className={inputCls} /></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Ícono', 'Icon')}</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PRODUCT_CAT_ICONS).map(([k, Icon]) => (
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
            {PRODUCT_TILES.map((t) => (
              <button key={t} type="button" onClick={() => setTile(t)} aria-label={L('Estampado', 'Pattern')}
                className={`h-10 w-10 cursor-pointer rounded-[10px] border-2 ${tile === t ? 'border-primary' : 'border-transparent'}`}
                style={{ background: `repeating-linear-gradient(135deg,${t})` }} />
            ))}
          </div>
        </div>
        <div className="mt-1 flex gap-2.5">
          {initial && (
            <button onClick={() => { if (itemCount === 0) setConfirming(true); }} disabled={itemCount > 0} className={dangerBtn}
              title={itemCount > 0 ? L('Mueve sus productos antes de eliminar', 'Move its products before deleting') : undefined}>
              <Trash2 size={15} stroke={2.2} />
            </button>
          )}
          <button onClick={save} disabled={!es.trim()} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear categoría', 'Create category')}</button>
        </div>
        {initial && itemCount > 0 && (
          <div className="rounded-field bg-amber-bg px-3 py-2 text-[10.5px] font-semibold text-amber-ink">
            {L(`Tiene ${itemCount} productos — muévelos a otra categoría para poder eliminarla.`, `Has ${itemCount} products — move them to another category before deleting.`)}
          </div>
        )}
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar categoría?', 'Delete category?')}
            message={L(`“${initial.es}” se quitará de tu tienda. Esta acción no se puede deshacer.`, `“${initial.en}” will be removed from your shop. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}

// ── Option set (variant axis) ─────────────────────────────────────────────────
export function OptionSetEditor({
  open, onClose, L, initial, usedCount, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: OptionSet | null;
  usedCount: number;
  onSave: (s: OptionSet) => void;
  onDelete: (id: string) => void;
}) {
  const [es, setEs] = useState('');
  const [en, setEn] = useState('');
  const [single, setSingle] = useState(true);
  const [values, setValues] = useState<OptionValue[]>([]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEs(initial?.es ?? ''); setEn(initial?.en ?? ''); setSingle(initial?.single ?? true);
    setValues(initial?.values?.length ? initial.values.map((v) => ({ ...v })) : [{ es: '', price: 0 }]);
    setConfirming(false);
  }, [open, initial]);

  const setVal = (i: number, patch: Partial<OptionValue>) => setValues((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const addVal = () => setValues((vs) => [...vs, { es: '', price: 0 }]);
  const delVal = (i: number) => setValues((vs) => vs.filter((_, j) => j !== i));

  const save = () => {
    const name = es.trim(); if (!name) return;
    const clean = values.filter((v) => v.es.trim()).map((v) => ({ es: v.es.trim(), en: v.en?.trim() || undefined, price: Number(v.price) || 0 }));
    if (!clean.length) return;
    onSave({ id: initial?.id ?? prodId(), es: name, en: en.trim() || name, single, values: clean });
    onClose();
  };
  const ready = !!es.trim() && values.some((v) => v.es.trim());

  return (
    <Overlay open={open} onClose={onClose} width={460}>
      <OverlayTitle title={initial ? L('Editar conjunto de opciones', 'Edit option set') : L('Nuevo conjunto de opciones', 'New option set')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (español)', 'Name (Spanish)')} *</div><input value={es} onChange={(e) => setEs(e.target.value)} placeholder={L('Ej. Talla', 'e.g. Size')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (inglés)', 'Name (English)')}</div><input value={en} onChange={(e) => setEn(e.target.value)} placeholder={L('Opcional', 'Optional')} className={inputCls} /></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Tipo', 'Type')}</div>
          <div className="flex gap-1.5">
            {([[true, L('Elegir una (variante)', 'Choose one (variant)')], [false, L('Varios (extras)', 'Multiple (add-ons)')]] as [boolean, string][]).map(([v, lbl]) => (
              <button key={String(v)} onClick={() => setSingle(v)} className={`flex-1 cursor-pointer rounded-btn py-2 text-[11.5px] font-extrabold ${single === v ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'}`}>{lbl}</button>
            ))}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Valores', 'Values')}</div>
          <div className="flex flex-col gap-2">
            {values.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={v.es} onChange={(e) => setVal(i, { es: e.target.value })} placeholder={L('Ej. Grande', 'e.g. Large')} className={`${inputCls} flex-1`} />
                <div className="flex w-[104px] flex-none items-center rounded-field border-[1.5px] border-lilac-line bg-white px-2.5 focus-within:border-primary">
                  <span className="text-[12px] font-bold text-muted-2">+$</span>
                  <input value={v.price ? String(v.price) : ''} onChange={(e) => setVal(i, { price: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 })} placeholder="0" inputMode="decimal" className="min-w-0 flex-1 border-none bg-transparent px-1 py-2.5 text-[13px] font-semibold text-ink outline-none" />
                </div>
                <button onClick={() => delVal(i)} disabled={values.length <= 1} aria-label={L('Quitar', 'Remove')} className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-lg text-muted-2 disabled:opacity-30"><X size={15} stroke={2.4} /></button>
              </div>
            ))}
          </div>
          <button onClick={addVal} className="mt-2 flex items-center gap-1.5 text-[11.5px] font-extrabold text-primary-dark"><Plus size={13} stroke={2.6} />{L('Agregar valor', 'Add value')}</button>
        </div>
        {initial && usedCount > 0 && (
          <div className="rounded-field bg-lilac-2 px-3 py-2 text-[10.5px] font-semibold text-ink-2">
            {L(`Se usa en ${usedCount} producto${usedCount === 1 ? '' : 's'} — los cambios aplican en todos.`, `Used by ${usedCount} product${usedCount === 1 ? '' : 's'} — changes apply everywhere.`)}
          </div>
        )}
        <div className="mt-1 flex gap-2.5">
          {initial && <button onClick={() => setConfirming(true)} aria-label={L('Eliminar', 'Delete')} className={dangerBtn}><Trash2 size={15} stroke={2.2} /></button>}
          <button onClick={save} disabled={!ready} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear conjunto', 'Create set')}</button>
        </div>
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar conjunto?', 'Delete option set?')}
            message={L(`“${initial.es}” se eliminará y se quitará de los productos que lo usan. No se puede deshacer.`, `“${initial.en}” will be deleted and removed from products using it. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}

// ── Collection ────────────────────────────────────────────────────────────────
export function CollectionEditor({
  open, onClose, L, initial, products, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: Collection | null;
  products: { dbId?: string; id: number; name: string }[];
  onSave: (c: Collection) => void;
  onDelete: (id: string) => void;
}) {
  const [es, setEs] = useState('');
  const [en, setEn] = useState('');
  const [descEs, setDescEs] = useState('');
  const [tile, setTile] = useState(PRODUCT_TILES[5]);
  const [featured, setFeatured] = useState(true);
  const [members, setMembers] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEs(initial?.es ?? ''); setEn(initial?.en ?? ''); setDescEs(initial?.descEs ?? '');
    setTile(initial?.tile ?? PRODUCT_TILES[5]); setFeatured(initial?.featured ?? true);
    setMembers(initial?.productIds ?? []); setConfirming(false);
  }, [open, initial]);

  const toggleMember = (dbId: string) => setMembers((m) => (m.includes(dbId) ? m.filter((x) => x !== dbId) : [...m, dbId]));
  const save = () => {
    const name = es.trim(); if (!name) return;
    onSave({ id: initial?.id ?? prodId(), es: name, en: en.trim() || name, descEs: descEs.trim() || undefined, descEn: descEs.trim() || undefined, tile, productIds: members, featured });
    onClose();
  };
  const pickable = products.filter((p) => p.dbId);

  return (
    <Overlay open={open} onClose={onClose} width={460}>
      <OverlayTitle title={initial ? L('Editar colección', 'Edit collection') : L('Nueva colección', 'New collection')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (español)', 'Name (Spanish)')} *</div><input value={es} onChange={(e) => setEs(e.target.value)} placeholder={L('Ej. Sets de regalo', 'e.g. Gift sets')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Nombre (inglés)', 'Name (English)')}</div><input value={en} onChange={(e) => setEn(e.target.value)} placeholder={L('Opcional', 'Optional')} className={inputCls} /></div>
        </div>
        <div><div className={fieldLabel}>{L('Descripción', 'Description')}</div><input value={descEs} onChange={(e) => setDescEs(e.target.value)} placeholder={L('Paquetes curados de temporada', 'Curated seasonal bundles')} className={inputCls} /></div>
        <div>
          <div className={fieldLabel}>{L('Color', 'Color')}</div>
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_TILES.map((t) => (
              <button key={t} type="button" onClick={() => setTile(t)} aria-label={L('Estampado', 'Pattern')}
                className={`h-10 w-10 cursor-pointer rounded-[10px] border-2 ${tile === t ? 'border-primary' : 'border-transparent'}`}
                style={{ background: `repeating-linear-gradient(135deg,${t})` }} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-field border border-hair bg-app p-3">
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-bold text-ink">{L('Destacar en el listado', 'Feature on listing')}</div>
            <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-muted-2">{L('Aparece como franja en tu tienda pública.', 'Shows as a strip on your public shop.')}</div>
          </div>
          <button onClick={() => setFeatured((v) => !v)} aria-pressed={featured} className={`relative h-[26px] w-[46px] flex-none cursor-pointer rounded-full transition-colors ${featured ? 'bg-primary' : 'bg-lilac-line'}`}>
            <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-all ${featured ? 'left-[23px]' : 'left-[3px]'}`} />
          </button>
        </div>
        <div>
          <div className={fieldLabel}>{L('Productos', 'Products')} <span className="font-semibold text-muted">· {members.length}</span></div>
          {pickable.length === 0 ? (
            <div className="rounded-field border-[1.5px] border-dashed border-lilac-line bg-app px-3 py-4 text-center text-[11.5px] font-semibold text-muted">{L('Guarda productos primero para agruparlos.', 'Save products first to group them.')}</div>
          ) : (
            <div className="flex max-h-[168px] flex-col gap-1.5 overflow-y-auto">
              {pickable.map((p) => {
                const on = members.includes(p.dbId!);
                return (
                  <button key={p.dbId} onClick={() => toggleMember(p.dbId!)} className={`flex items-center gap-2.5 rounded-field border-[1.5px] p-2.5 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                    <span className={`flex h-4 w-4 flex-none items-center justify-center rounded ${on ? 'bg-primary' : 'bg-lilac-line'}`}>{on && <Check size={10} className="text-white" stroke={3.4} />}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-ink">{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-1 flex gap-2.5">
          {initial && <button onClick={() => setConfirming(true)} aria-label={L('Eliminar', 'Delete')} className={dangerBtn}><Trash2 size={15} stroke={2.2} /></button>}
          <button onClick={save} disabled={!es.trim()} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear colección', 'Create collection')}</button>
        </div>
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar colección?', 'Delete collection?')}
            message={L(`“${initial.es}” se eliminará (los productos no se borran). No se puede deshacer.`, `“${initial.en}” will be deleted (its products are not). This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}

// ── Discount ──────────────────────────────────────────────────────────────────
const DISCOUNT_TYPES: [DiscountType, string, string][] = [
  ['percent', '% descuento', '% off'],
  ['amount', '$ descuento', '$ off'],
  ['shipping', 'Envío gratis', 'Free shipping'],
  ['bogo', '2x1', 'BOGO'],
];

export function DiscountEditor({
  open, onClose, L, initial, onSave, onDelete,
}: {
  open: boolean; onClose: () => void; L: Lx;
  initial: Discount | null;
  onSave: (d: Discount) => void;
  onDelete: (id: string) => void;
}) {
  const [code, setCode] = useState('');
  const [type, setType] = useState<DiscountType>('percent');
  const [value, setValue] = useState('');
  const [descEs, setDescEs] = useState('');
  const [auto, setAuto] = useState(false);
  const [minOrder, setMinOrder] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(initial?.code ?? ''); setType(initial?.type ?? 'percent');
    setValue(initial?.value != null ? String(initial.value) : ''); setDescEs(initial?.descEs ?? '');
    setAuto(initial?.auto ?? false); setMinOrder(initial?.minOrder != null ? String(initial.minOrder) : '');
    setConfirming(false);
  }, [open, initial]);

  const needsValue = type === 'percent' || type === 'amount';
  const save = () => {
    const c = code.trim().toUpperCase(); if (!c) return;
    onSave({
      id: initial?.id ?? prodId(), code: c, type,
      value: needsValue ? Number(value) || 0 : undefined,
      descEs: descEs.trim(), descEn: descEs.trim(), auto,
      minOrder: minOrder ? Number(minOrder) || undefined : undefined,
      status: initial?.status ?? 'active', startDate: initial?.startDate,
    });
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={440}>
      <OverlayTitle title={initial ? L('Editar descuento', 'Edit discount') : L('Nuevo descuento', 'New discount')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        <div><div className={fieldLabel}>{L('Código', 'Code')} *</div><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="WELCOME15" className={`${inputCls} font-mono uppercase tracking-wide`} /></div>
        <div>
          <div className={fieldLabel}>{L('Tipo', 'Type')}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {DISCOUNT_TYPES.map(([t, esL, enL]) => (
              <button key={t} onClick={() => setType(t)} className={`cursor-pointer rounded-btn py-2 text-[11.5px] font-extrabold ${type === t ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'}`}>{L(esL, enL)}</button>
            ))}
          </div>
        </div>
        {needsValue && (
          <div>
            <div className={fieldLabel}>{type === 'percent' ? L('Porcentaje', 'Percent') : L('Monto', 'Amount')}</div>
            <div className="flex w-[130px] items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary">
              <span className="text-[13px] font-bold text-muted-2">{type === 'percent' ? '' : '$'}</span>
              <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" inputMode="decimal" className="min-w-0 flex-1 border-none bg-transparent px-1 py-2.5 text-[13px] font-semibold text-ink outline-none" />
              <span className="text-[13px] font-bold text-muted-2">{type === 'percent' ? '%' : ''}</span>
            </div>
          </div>
        )}
        <div><div className={fieldLabel}>{L('Descripción', 'Description')}</div><input value={descEs} onChange={(e) => setDescEs(e.target.value)} placeholder={L('Primer pedido', 'First order')} className={inputCls} /></div>
        <div><div className={fieldLabel}>{L('Pedido mínimo', 'Minimum order')}</div>
          <div className="flex w-[130px] items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary">
            <span className="text-[13px] font-bold text-muted-2">$</span>
            <input value={minOrder} onChange={(e) => setMinOrder(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" inputMode="decimal" className="min-w-0 flex-1 border-none bg-transparent px-1 py-2.5 text-[13px] font-semibold text-ink outline-none" />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-field border border-hair bg-app p-3">
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-bold text-ink">{L('Aplicar automáticamente', 'Apply automatically')}</div>
            <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-muted-2">{L('Sin que el cliente escriba el código.', 'No code needed at checkout.')}</div>
          </div>
          <button onClick={() => setAuto((v) => !v)} aria-pressed={auto} className={`relative h-[26px] w-[46px] flex-none cursor-pointer rounded-full transition-colors ${auto ? 'bg-primary' : 'bg-lilac-line'}`}>
            <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-all ${auto ? 'left-[23px]' : 'left-[3px]'}`} />
          </button>
        </div>
        <div className="mt-1 flex gap-2.5">
          {initial && <button onClick={() => setConfirming(true)} aria-label={L('Eliminar', 'Delete')} className={dangerBtn}><Trash2 size={15} stroke={2.2} /></button>}
          <button onClick={save} disabled={!code.trim()} className={saveBtn}>{initial ? L('Guardar cambios', 'Save changes') : L('Crear descuento', 'Create discount')}</button>
        </div>
        {initial && (
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={() => { setConfirming(false); onDelete(initial.id); onClose(); }}
            title={L('¿Eliminar descuento?', 'Delete discount?')}
            message={L(`“${initial.code}” dejará de funcionar. No se puede deshacer.`, `“${initial.code}” will stop working. This can’t be undone.`)}
            confirmLabel={L('Eliminar', 'Delete')}
            cancelLabel={L('Cancelar', 'Cancel')}
          />
        )}
      </div>
    </Overlay>
  );
}

export { ConfirmDialog };
