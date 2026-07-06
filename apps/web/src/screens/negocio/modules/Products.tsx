'use client';

// Productos module (business dashboard) — fully functional, mirroring the Food
// module. Products live in business_items (kind='product'); the structure
// (categories, reusable option sets/variants, curated collections, discounts,
// sell mode) lives in businesses.product_config (migration 0048). Sub-tabs:
//   • Catálogo — product cards (tap → the shared 5-step wizard: create/edit/
//     duplicate/delete-confirmed, photo, price/sale, variants, inventory), plus a
//     "Modo de la tienda" toggle (Solo catálogo vs Vender en línea).
//   • Categorías / Variantes / Colecciones / Descuentos — real CRUD via editor
//     sheets. • Inventario — real stock from the catalog.
// Display-only mode hides the +/cart on the public listing. Fully explorable in
// demo (local sample); a signed-in owner persists to Supabase.
//
// Delivery + shipping (zones, drivers, pickup, carriers) live in the SHARED
// `Entregas y envíos` module (modules/Fulfillment.tsx) — reachable via a shortcut
// card — so Products and the Food menu configure fulfillment once.

import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Check, CheckCircle2, ChevronDown, ChevronUp, Copy, CreditCard,
  HardHat, Layers, Loader2, Pencil, Plus, Search, Store,
  Trash2, Truck, Upload,
} from 'lucide-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { ChipRow } from '@/components/ChipRow';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { QuickTagSheet } from '@/components/QuickTagSheet';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draftStore';
import { deleteBizItem, insertBizItem, listBizItems, updateBizItem, type BizItemRow, type NewBizItem } from '@/lib/bizItems';
import {
  defaultProductConfig, demoProductConfig, normalizeProductConfig, variantCount,
  type Collection, type Discount, type OptionSet, type ProductCategory, type ProductConfig,
} from '@/lib/productConfig';
import {
  CollectionEditor, DiscountEditor, OptionSetEditor, ProductCategoryEditor, prodCatIcon,
} from '@/screens/negocio/modules/ProductEditors';

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';
const stripe = (stops: string) => `repeating-linear-gradient(135deg,${stops})`;

const FALLBACK_CAT: ProductCategory = { id: 'pantry', es: 'Productos', en: 'Products', icon: 'package', tile: '#F3D9C8 0 8px,#E8C3AC 8px 16px', visible: true };

type Prod = {
  id: number; dbId?: string; name: string; cat: string;
  price: number; compareAt?: number; descEs: string; descEn: string;
  sku: string; stock: number; reorder: number;
  options: string[]; fulfill: string[]; tax: string;
  badges: string[]; sales: string; imageUrl?: string; extra?: Record<string, unknown>;
};

const KNOWN_ATTRS = new Set(['en', 'sku', 'stock', 'reorder', 'compareAt', 'options', 'fulfill', 'tax', 'badges', 'sales']);
function rowToProd(r: BizItemRow, idx: number): Prod {
  const a = (r.attrs ?? {}) as Record<string, unknown>;
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(a)) if (!KNOWN_ATTRS.has(k)) extra[k] = v;
  return {
    id: idx + 1,
    dbId: r.id,
    name: r.name,
    cat: r.section ?? FALLBACK_CAT.id,
    price: Number(r.price ?? 0),
    compareAt: a.compareAt != null ? Number(a.compareAt) : undefined,
    descEs: r.description ?? '',
    descEn: String(a.en ?? r.description ?? ''),
    sku: String(a.sku ?? ''),
    stock: Number(a.stock ?? 0),
    reorder: Number(a.reorder ?? 0),
    options: (a.options as string[]) ?? [],
    fulfill: Array.isArray(a.fulfill) ? (a.fulfill as string[]) : a.fulfill ? [String(a.fulfill)] : ['ship'],
    tax: String(a.tax ?? 'goods'),
    badges: (a.badges as string[]) ?? [],
    sales: String(a.sales ?? '$0'),
    imageUrl: r.image_url ?? undefined,
    extra,
  };
}
const prodAttrs = (p: Prod): Record<string, unknown> => ({
  ...(p.extra ?? {}),
  en: p.descEn, sku: p.sku, stock: p.stock, reorder: p.reorder,
  compareAt: p.compareAt ?? null, options: p.options, fulfill: p.fulfill, tax: p.tax,
  badges: p.badges, sales: p.sales,
});
function prodToRow(p: Prod, businessId: string, sort: number): NewBizItem {
  return {
    business_id: businessId, kind: 'product', name: p.name, description: p.descEs,
    price: p.price, unit: null, section: p.cat, available: true, sort,
    image_url: p.imageUrl ?? null, attrs: prodAttrs(p),
  };
}

// ---------- shared styles ----------
const chip = (on: boolean) => `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;
const fieldLabel = 'mb-1.5 text-[11px] font-extrabold text-ink-soft';
const inputCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary';
const addBtn = 'mt-3.5 w-full cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-app py-3 text-[12.5px] font-extrabold text-primary-dark';

function Switch({ on, onClick, big }: { on: boolean; onClick: () => void; big?: boolean }) {
  const w = big ? 46 : 38; const k = big ? 20 : 17;
  return (
    <span role="switch" aria-checked={on} onClick={onClick} className="relative inline-block flex-none cursor-pointer rounded-full transition-colors" style={{ width: w, height: big ? 26 : 23, background: on ? '#7B61FF' : '#D8D2E6' }}>
      <span className="absolute top-[3px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.18)] transition-all" style={{ width: k, height: k, left: on ? w - k - 3 : 3 }} />
    </span>
  );
}

const BADGES = ['Nuevo', 'Oferta', 'Popular', 'Local'];
const tagLabel = (t: string, L: (es: string, en: string) => string) =>
  ({ Nuevo: L('Nuevo', 'New'), Oferta: L('Oferta', 'Sale'), Popular: L('Popular', 'Popular'), Local: L('Local', 'Local') } as Record<string, string>)[t] ?? t;

// Demo products (sample so the module is explorable without signing in).
const DEMO_PRODS: Prod[] = [
  { id: 1, name: 'Mermelada fresa-ruibarbo · 6oz', cat: 'pantry', price: 14, compareAt: 18, descEs: 'Hecha en lotes pequeños con fruta local.', descEn: 'Small-batch with local fruit.', sku: 'JAM-001', stock: 42, reorder: 20, options: ['gift'], fulfill: ['ship', 'pickup'], tax: 'goods', badges: ['Oferta'], sales: '$1,820' },
  { id: 2, name: 'Libro de recetas Country Loaf', cat: 'books', price: 42, descEs: 'Guía completa de masa madre.', descEn: 'Complete sourdough guide.', sku: 'BOOK-001', stock: 12, reorder: 8, options: [], fulfill: ['ship'], tax: 'goods', badges: ['Popular'], sales: '$924' },
  { id: 3, name: 'Tote de lona To’Latino', cat: 'merch', price: 28, descEs: 'Lona resistente, serigrafía a mano.', descEn: 'Heavy canvas, hand-screened.', sku: 'MRC-001', stock: 84, reorder: 30, options: ['tee'], fulfill: ['ship'], tax: 'goods', badges: [], sales: '$2,128' },
  { id: 4, name: 'Masa madre · 100g', cat: 'baking', price: 18, descEs: 'Fermento activo listo para hornear.', descEn: 'Active starter ready to bake.', sku: 'STR-001', stock: 5, reorder: 15, options: [], fulfill: ['local', 'pickup'], tax: 'goods', badges: ['Local'], sales: '$486' },
  { id: 5, name: 'Café en grano · 12oz', cat: 'coffee', price: 19, descEs: 'Tueste medio, notas de chocolate.', descEn: 'Medium roast, chocolate notes.', sku: 'COF-001', stock: 62, reorder: 25, options: ['size', 'grind'], fulfill: ['ship', 'pickup'], tax: 'goods', badges: ['Nuevo'], sales: '$1,178' },
  { id: 6, name: 'Aceite de oliva · 500ml', cat: 'pantry', price: 24, descEs: 'Prensado en frío, primera cosecha.', descEn: 'Cold-pressed, first harvest.', sku: 'OIL-001', stock: 0, reorder: 12, options: [], fulfill: ['pickup'], tax: 'goods', badges: [], sales: '$2,400' },
];

// =====================================================================
export function ProductsModule({ ctx }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es, isFree, ci, go } = ctx;
  const admin = useBizAdmin();
  const { user } = useAuth();
  const real = admin.active;
  const persistable = !admin.demo && !!real;

  // ── config (categories / option sets / collections / discounts / sell mode) ──
  const [cfg, setCfg] = useState<ProductConfig>(demoProductConfig);
  useEffect(() => {
    setCfg(admin.demo ? demoProductConfig() : real?.product_config ? normalizeProductConfig(real.product_config) : defaultProductConfig());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);
  const saveCfg = (next: ProductConfig) => { setCfg(next); if (persistable) admin.update({ product_config: next }); };
  const catOf = (id: string): ProductCategory => cfg.categories.find((c) => c.id === id) ?? FALLBACK_CAT;
  const catLabel = (c: ProductCategory) => L(c.es, c.en);
  const optSetOf = (id: string) => cfg.optionSets.find((o) => o.id === id);

  // ── products (business_items kind='product') ───────────────────────────────
  const [products, setProducts] = useState<Prod[]>(DEMO_PRODS);
  useEffect(() => {
    if (!persistable || !real) { setProducts(DEMO_PRODS); return; }
    let cancelled = false;
    (async () => {
      const rows = await listBizItems(real.id, 'product');
      if (!cancelled) setProducts(rows.map(rowToProd));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  const nextId = () => (products.length ? Math.max(...products.map((p) => p.id)) : 0) + 1;
  const persistNew = async (p: Prod) => {
    if (!persistable || !real) return;
    const dbId = await insertBizItem(prodToRow(p, real.id, products.length));
    if (dbId) setProducts((l) => l.map((x) => (x.id === p.id ? { ...x, dbId } : x)));
  };
  const persistPatch = (p: Prod | undefined) => {
    if (persistable && p?.dbId) updateBizItem(p.dbId, { name: p.name, description: p.descEs, price: p.price, section: p.cat, image_url: p.imageUrl ?? null, attrs: prodAttrs(p) });
  };

  const countIn = (catId: string) => products.filter((p) => p.cat === catId).length;
  const optUsedBy = (optId: string) => products.filter((p) => p.options.includes(optId)).length;

  // ── ui state ────────────────────────────────────────────────────────────────
  const [sub, setSub] = useState<'catalog' | 'cats' | 'variants' | 'collections' | 'discounts' | 'inventory'>('catalog');
  const [view, setView] = useState<'module' | 'wizard' | 'success'>('module');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [wizStep, setWizStep] = useState(0);
  const [wizMax, setWizMax] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => newDraft('pantry'));
  const [confirmDel, setConfirmDel] = useState(false);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [catSheet, setCatSheet] = useState<{ open: boolean; initial: ProductCategory | null }>({ open: false, initial: null });
  const [optSheet, setOptSheet] = useState<{ open: boolean; initial: OptionSet | null }>({ open: false, initial: null });
  const [collSheet, setCollSheet] = useState<{ open: boolean; initial: Collection | null }>({ open: false, initial: null });
  const [discSheet, setDiscSheet] = useState<{ open: boolean; initial: Discount | null }>({ open: false, initial: null });
  const [catFromWiz, setCatFromWiz] = useState(false); // category sheet opened from the wizard → auto-select on create
  const [tagSheet, setTagSheet] = useState(false); // quick "new tag" popup

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };
  const upD = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const money = (n: number) => '$' + n.toFixed(2);

  // ── draft recovery: autosave the CREATE draft so the owner can leave & resume ─
  const draftKey = 'tl:draft:product:' + (real?.id ?? 'demo');
  useEffect(() => {
    if (view === 'wizard' && editingId == null) saveDraft(draftKey, draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, view, editingId]);

  // ── photo upload (same pipeline as Comunidad/Food) ─────────────────────────
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickPhoto = async (file: File | null | undefined) => {
    if (!file || !file.type.startsWith('image/') || photoBusy) return;
    setPhotoBusy(true);
    try {
      const url = !persistable || !user || !supabase ? URL.createObjectURL(file) : await uploadImage(file, user.id, 1200);
      upD({ photoUrl: url });
    } catch { flash(L('No se pudo subir la foto.', "Couldn't upload the photo.")); }
    setPhotoBusy(false);
  };

  // ── structure mutations ─────────────────────────────────────────────────────
  const upsertCategory = (c: ProductCategory) => {
    const exists = cfg.categories.some((x) => x.id === c.id);
    saveCfg({ ...cfg, categories: exists ? cfg.categories.map((x) => (x.id === c.id ? c : x)) : [...cfg.categories, c] });
    if (!exists && catFromWiz) upD({ cat: c.id }); // just created from the wizard → select it
    setCatFromWiz(false);
    flash(exists ? L('Categoría guardada', 'Category saved') : L('Categoría creada', 'Category created'));
  };
  // Create a custom tag/etiqueta (reusable) and select it on the current draft.
  const addTag = (label: string) => {
    if (!cfg.tags.includes(label)) saveCfg({ ...cfg, tags: [...cfg.tags, label] });
    if (!draft.badges.includes(label)) upD({ badges: [...draft.badges, label] });
  };
  const deleteCategory = (id: string) => { saveCfg({ ...cfg, categories: cfg.categories.filter((x) => x.id !== id) }); flash(L('Categoría eliminada', 'Category deleted')); };
  const moveCategory = (id: string, dir: -1 | 1) => {
    const i = cfg.categories.findIndex((x) => x.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= cfg.categories.length) return;
    const next = [...cfg.categories]; [next[i], next[j]] = [next[j], next[i]]; saveCfg({ ...cfg, categories: next });
  };
  const toggleCategory = (id: string) => saveCfg({ ...cfg, categories: cfg.categories.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)) });

  const upsertOptionSet = (o: OptionSet) => {
    const exists = cfg.optionSets.some((x) => x.id === o.id);
    saveCfg({ ...cfg, optionSets: exists ? cfg.optionSets.map((x) => (x.id === o.id ? o : x)) : [...cfg.optionSets, o] });
    flash(exists ? L('Conjunto guardado', 'Option set saved') : L('Conjunto creado', 'Option set created'));
  };
  const deleteOptionSet = (id: string) => {
    saveCfg({ ...cfg, optionSets: cfg.optionSets.filter((x) => x.id !== id) });
    setProducts((l) => l.map((p) => (p.options.includes(id) ? { ...p, options: p.options.filter((x) => x !== id) } : p)));
    flash(L('Conjunto eliminado', 'Option set deleted'));
  };

  const upsertCollection = (c: Collection) => {
    const exists = cfg.collections.some((x) => x.id === c.id);
    saveCfg({ ...cfg, collections: exists ? cfg.collections.map((x) => (x.id === c.id ? c : x)) : [...cfg.collections, c] });
    flash(exists ? L('Colección guardada', 'Collection saved') : L('Colección creada', 'Collection created'));
  };
  const deleteCollection = (id: string) => { saveCfg({ ...cfg, collections: cfg.collections.filter((x) => x.id !== id) }); flash(L('Colección eliminada', 'Collection deleted')); };

  const upsertDiscount = (d: Discount) => {
    const exists = cfg.discounts.some((x) => x.id === d.id);
    saveCfg({ ...cfg, discounts: exists ? cfg.discounts.map((x) => (x.id === d.id ? d : x)) : [...cfg.discounts, d] });
    flash(exists ? L('Descuento guardado', 'Discount saved') : L('Descuento creado', 'Discount created'));
  };
  const deleteDiscount = (id: string) => { saveCfg({ ...cfg, discounts: cfg.discounts.filter((x) => x.id !== id) }); flash(L('Descuento eliminado', 'Discount deleted')); };
  const toggleDiscount = (id: string) => saveCfg({ ...cfg, discounts: cfg.discounts.map((d) => (d.id === id ? { ...d, status: d.status === 'active' ? 'paused' : 'active' } : d)) });

  const stockPill = (s: number): [string, string] =>
    s === 0 ? [L('Agotado', 'Out'), 'bg-pink-bg text-pink-dark'] : s <= 8 ? [L('Bajo', 'Low'), 'bg-amber-bg text-amber-ink'] : [L('En stock', 'In stock'), 'bg-green-bg text-green-dark'];

  // ── wizard: draft ⇄ product ─────────────────────────────────────────────────
  const wizSteps: [string, string][] = [
    [L('Detalles', 'Details'), L('Detalles del producto', 'Product details')],
    [L('Precio', 'Pricing'), L('Precio y SKU', 'Pricing & SKU')],
    [L('Variantes', 'Variants'), L('Opciones y variantes', 'Options & variants')],
    [L('Inventario', 'Inventory'), L('Inventario y entrega', 'Inventory & fulfillment')],
    [L('Revisar', 'Review'), L('Revisar y publicar', 'Review & publish')],
  ];
  const draftReady = !!draft.name.trim() && !!draft.price;
  const startAdd = () => {
    setEditingId(null);
    const fresh = newDraft(cfg.categories.find((c) => c.visible)?.id ?? 'pantry');
    const saved = loadDraft<Draft>(draftKey);
    if (saved && (saved.name?.trim() || saved.descEs || saved.descEn || saved.price || saved.photoUrl)) {
      setDraft({ ...fresh, ...saved });
      flash(L('Borrador recuperado', 'Draft restored'));
    } else setDraft(fresh);
    setWizStep(0); setWizMax(0); setView('wizard');
  };
  const startEdit = (p: Prod) => {
    setEditingId(p.id);
    setDraft({
      name: p.name, descEs: p.descEs, descEn: p.descEn, cat: p.cat, price: String(p.price),
      compareAt: p.compareAt != null ? String(p.compareAt) : '', sku: p.sku, stock: String(p.stock),
      reorder: String(p.reorder), options: [...p.options], fulfill: [...p.fulfill], tax: p.tax,
      badges: [...p.badges], photoUrl: p.imageUrl ?? '',
    });
    setWizStep(0); setWizMax(wizSteps.length - 1); setView('wizard');
  };
  const draftFields = () => ({
    name: draft.name.trim() || L('Nuevo producto', 'New product'), cat: draft.cat,
    price: Number(draft.price) || 0, compareAt: draft.compareAt ? Number(draft.compareAt) || undefined : undefined,
    descEs: draft.descEs || draft.descEn, descEn: draft.descEn || draft.descEs,
    sku: draft.sku, stock: Number(draft.stock) || 0, reorder: Number(draft.reorder) || 0,
    options: draft.options, fulfill: draft.fulfill, tax: draft.tax, badges: draft.badges,
    imageUrl: draft.photoUrl || undefined,
  });
  const addFromDraft = () => { const p: Prod = { id: nextId(), sales: '$0', ...draftFields() }; setProducts((l) => [p, ...l]); persistNew(p); clearDraft(draftKey); };
  const saveFromDraft = () => {
    if (editingId == null) return;
    setProducts((l) => { const next = l.map((p) => (p.id === editingId ? { ...p, ...draftFields() } : p)); persistPatch(next.find((p) => p.id === editingId)); return next; });
  };
  const duplicateFromDraft = () => {
    const p: Prod = { id: nextId(), sales: '$0', ...draftFields(), name: `${draft.name.trim() || L('Nuevo producto', 'New product')} ${L('(copia)', '(copy)')}` };
    setProducts((l) => [p, ...l]); persistNew(p); setView('module'); setEditingId(null); flash(L('Producto duplicado', 'Product duplicated'));
  };
  const deleteEditing = () => {
    if (editingId == null) return;
    const target = products.find((p) => p.id === editingId);
    setProducts((l) => l.filter((p) => p.id !== editingId));
    if (persistable && target?.dbId) deleteBizItem(target.dbId);
    setView('module'); setEditingId(null); flash(L('Producto eliminado', 'Product deleted'));
  };
  const wizNext = () => {
    if (wizStep >= wizSteps.length - 1) {
      if (editingId != null) { saveFromDraft(); setView('module'); flash(L('Cambios guardados', 'Changes saved')); }
      else { addFromDraft(); setView('success'); }
      return;
    }
    const n = wizStep + 1; setWizStep(n); setWizMax((m) => Math.max(m, n));
  };
  const wizBack = () => { if (wizStep === 0) { setView('module'); setEditingId(null); return; } setWizStep((s) => s - 1); };
  const nextGated = wizStep === 0 ? !!draft.name.trim() : wizStep === 1 ? !!draft.price : true;

  // ============================ SUCCESS ============================
  if (view === 'success') {
    const dc = catOf(draft.cat);
    return (
      <>
        <ModulePage title={L('¡Publicado!', 'Published!')} onBack={() => { setView('module'); setSub('catalog'); }}>
          <div className="mx-auto flex max-w-[440px] flex-col items-center pb-4 pt-4 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-[18px] bg-green-bg text-green"><CheckCircle2 size={34} strokeWidth={2.4} /></span>
            <div className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{(draft.name || L('Nuevo producto', 'New product')) + ' ' + L('está activo', 'is live')}</div>
            <div className="mt-2 max-w-[300px] text-[13px] font-medium leading-relaxed text-muted">{L('Ya aparece en la pestaña Tienda de tu listado público.', "It now appears on your public listing's Shop tab.")}</div>
            <div className={`mt-5 w-full overflow-hidden text-left ${cardCls}`}>
              <div className="relative h-[104px]" style={{ background: stripe(dc.tile) }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {draft.photoUrl && <img src={draft.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              </div>
              <div className="flex items-center justify-between p-3.5">
                <div className="min-w-0">
                  <div className="text-[14px] font-extrabold text-ink">{draft.name || L('Nuevo producto', 'New product')}</div>
                  <div className="mt-0.5 text-[11.5px] font-medium text-muted-2">{catLabel(dc)} · {draft.price ? money(Number(draft.price)) : '$0.00'}</div>
                </div>
                <span className="flex-none rounded-lg bg-green-bg px-2.5 py-1.5 text-[10.5px] font-extrabold text-green-dark">{L('Activo', 'Live')}</span>
              </div>
            </div>
            <div className="mt-5 flex w-full flex-col gap-2.5">
              <button onClick={startAdd} className="flex items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta"><Plus size={16} strokeWidth={2.6} />{L('Agregar otro producto', 'Add another product')}</button>
              <button onClick={() => { setView('module'); setSub('catalog'); }} className="rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3.5 text-[13.5px] font-extrabold text-ink">{L('Volver a productos', 'Back to products')}</button>
            </div>
          </div>
        </ModulePage>
        <Toast msg={toast} />
      </>
    );
  }

  // ============================ WIZARD ============================
  if (view === 'wizard') {
    const dc = catOf(draft.cat);
    const preview = (
      <div className={`overflow-hidden ${cardCls}`}>
        <div className="relative h-[96px]" style={{ background: stripe(dc.tile) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {draft.photoUrl && <img src={draft.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        </div>
        <div className="flex items-start justify-between gap-2.5 p-3.5">
          <div className="min-w-0">
            <div className={`text-[14px] font-extrabold ${draft.name ? 'text-ink' : 'text-muted-faint'}`}>{draft.name || L('Nombre del producto', 'Product name')}</div>
            <div className="mt-0.5 text-[10.5px] font-medium text-muted-2">{catLabel(dc)}{draft.sku ? ` · ${draft.sku}` : ''}</div>
          </div>
          <span className="whitespace-nowrap text-[14px] font-extrabold text-ink">{draft.price ? money(Number(draft.price)) : '$0.00'}</span>
        </div>
      </div>
    );

    return (
      <>
        <ModulePage
          title={editingId != null ? L('Editar producto', 'Edit product') : L('Nuevo producto', 'New product')}
          subtitle={`${catLabel(dc)} · ${L('Paso', 'Step')} ${wizStep + 1}/${wizSteps.length}`}
          onBack={() => { setView('module'); setEditingId(null); }}
          backLabel={editingId != null ? L('Cerrar', 'Close') : L('Cancelar', 'Cancel')}
          maxW={940}
          footer={
            <div className="flex items-center gap-3">
              <button onClick={wizBack} className="flex-none cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3.5 text-[12.5px] font-extrabold text-ink">{wizStep === 0 ? (editingId != null ? L('Cerrar', 'Close') : L('Cancelar', 'Cancel')) : L('Atrás', 'Back')}</button>
              <button onClick={wizNext} disabled={!nextGated} className={`flex-1 rounded-btn-lg py-3.5 text-[13.5px] font-extrabold text-white ${nextGated ? 'cursor-pointer bg-primary shadow-cta-sm' : 'cursor-not-allowed bg-lilac-line'}`}>{wizStep >= wizSteps.length - 1 ? (editingId != null ? L('Guardar cambios', 'Save changes') : L('Publicar producto', 'Publish product')) : L('Continuar', 'Continue')}</button>
            </div>
          }
        >
          <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[340px_1fr]">
            <div className="flex flex-col gap-3 xl:sticky xl:top-0">
              <ChipRow className="-mx-1 px-1">
                {wizSteps.map(([lbl], i) => {
                  const active = wizStep === i, done = i < wizMax && i !== wizStep;
                  return (
                    <button key={lbl} onClick={() => { if (i <= wizMax) setWizStep(i); }} className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-extrabold ${active ? 'bg-primary text-white' : done ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted-2'}`}>
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white ${active ? 'bg-white/25' : done ? 'bg-primary' : 'bg-muted-faint'}`}>{done ? '✓' : i + 1}</span>{lbl}
                    </button>
                  );
                })}
              </ChipRow>
              {preview}
            </div>

            <div className={`${cardCls} p-4 md:p-5`}>
              <div className="mb-4 text-[13.5px] font-extrabold text-ink">{wizSteps[wizStep][1]}</div>

              {wizStep === 0 && (
                <div className="flex flex-col gap-4">
                  <div><div className={fieldLabel}>{L('Nombre del producto', 'Product name')} *</div><input value={draft.name} onChange={(e) => upD({ name: e.target.value })} placeholder={L('Ej. Mermelada de fresa', 'e.g. Strawberry jam')} className={inputCls} /></div>
                  <div><div className={fieldLabel}>{L('Descripción', 'Description')} <span className="font-semibold text-muted">· {es ? 'ES' : 'EN'}</span></div><textarea value={es ? draft.descEs : draft.descEn} onChange={(e) => upD(es ? { descEs: e.target.value } : { descEn: e.target.value })} rows={3} placeholder={L('Materiales, tamaño, qué lo hace especial…', 'Materials, size, what makes it special…')} className={`${inputCls} resize-none leading-relaxed`} /></div>
                  <div>
                    <div className={fieldLabel}>{L('Categoría', 'Category')} *</div>
                    <ChipRow className="-mx-1 px-1">
                      {cfg.categories.filter((c) => c.visible || c.id === draft.cat).map((c) => <button key={c.id} onClick={() => upD({ cat: c.id })} className={chip(draft.cat === c.id)}>{catLabel(c)}</button>)}
                      <button onClick={() => { setCatFromWiz(true); setCatSheet({ open: true, initial: null }); }} className="flex-none cursor-pointer rounded-full border-[1.5px] border-dashed border-lilac-line px-3.5 py-2 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar', 'Add')}</button>
                    </ChipRow>
                  </div>
                  <div>
                    <div className={fieldLabel}>{L('Foto', 'Photo')}</div>
                    {draft.photoUrl ? (
                      <div className="relative h-[150px] overflow-hidden rounded-tile border border-hair">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={draft.photoUrl} alt="" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => fileRef.current?.click()} disabled={photoBusy} className="absolute bottom-2 right-2 cursor-pointer rounded-[9px] bg-white/90 px-2.5 py-1.5 text-[11px] font-extrabold text-ink shadow-card">{photoBusy ? L('Subiendo…', 'Uploading…') : L('Cambiar', 'Change')}</button>
                        <button type="button" onClick={() => upD({ photoUrl: '' })} aria-label={L('Quitar foto', 'Remove photo')} className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-pink-dark shadow-card"><Trash2 size={14} strokeWidth={2.2} /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickPhoto(e.dataTransfer.files?.[0]); }} disabled={photoBusy} className="relative flex h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-tile border-[1.5px] border-dashed border-lilac-line bg-app disabled:opacity-60">
                        {photoBusy ? (<><Loader2 size={20} className="animate-spin text-primary" strokeWidth={2.2} /><span className="text-[12px] font-bold text-ink-soft">{L('Comprimiendo y subiendo…', 'Compressing & uploading…')}</span></>)
                          : (<><Upload size={20} className="text-primary" strokeWidth={2} /><span className="text-[12px] font-bold text-ink-soft">{L('Arrastra o toca para subir', 'Drag or tap to upload')}</span><span className="text-[10px] font-medium text-muted-2">{L('JPG o PNG · se comprime sola', 'JPG or PNG · auto-compressed')}</span></>)}
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; pickPhoto(f); }} />
                  </div>
                  <div>
                    <div className={fieldLabel}>{L('Etiquetas', 'Badges')}</div>
                    <div className="flex flex-wrap gap-2">
                      {[...BADGES, ...cfg.tags].map((t) => { const on = draft.badges.includes(t); return <button key={t} onClick={() => upD({ badges: on ? draft.badges.filter((x) => x !== t) : [...draft.badges, t] })} className={chip(on)}>{BADGES.includes(t) ? tagLabel(t, L) : t}</button>; })}
                      <button onClick={() => setTagSheet(true)} className="cursor-pointer rounded-full border-[1.5px] border-dashed border-lilac-line px-3.5 py-2 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar', 'Add')}</button>
                    </div>
                  </div>
                </div>
              )}

              {wizStep === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex-1">
                      <div className={fieldLabel}>{L('Precio', 'Price')} *</div>
                      <div className="flex items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 focus-within:border-primary">
                        <span className="text-[13px] font-bold text-muted-2">$</span>
                        <input value={draft.price} onChange={(e) => upD({ price: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="0.00" className="w-full bg-transparent px-2 py-3 text-[13px] font-semibold text-ink outline-none" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className={fieldLabel}>{L('Precio de lista', 'Compare-at')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span></div>
                      <div className="flex items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 focus-within:border-primary">
                        <span className="text-[13px] font-bold text-muted-2">$</span>
                        <input value={draft.compareAt} onChange={(e) => upD({ compareAt: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="0.00" className="w-full bg-transparent px-2 py-3 text-[13px] font-semibold text-ink outline-none" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex-1"><div className={fieldLabel}>SKU</div><input value={draft.sku} onChange={(e) => upD({ sku: e.target.value })} placeholder="ABC-001" className={inputCls} /></div>
                    <div className="flex-1">
                      <div className={fieldLabel}>{L('Categoría fiscal', 'Tax category')}</div>
                      <ChipRow className="-mx-1 px-1">
                        {([['prep', L('Preparada', 'Prepared')], ['goods', L('Empacado', 'Packaged')], ['exempt', L('Exento', 'Exempt')]] as [string, string][]).map(([k, lbl]) => <button key={k} onClick={() => upD({ tax: k })} className={chip(draft.tax === k)}>{lbl}</button>)}
                      </ChipRow>
                    </div>
                  </div>
                  {draft.compareAt && Number(draft.compareAt) > Number(draft.price) && (
                    <div className="rounded-field bg-pink-bg px-3 py-2 text-[10.5px] font-semibold text-pink-dark">{L('Se mostrará como oferta', 'Will show as a sale')} · −{Math.round((1 - Number(draft.price) / Number(draft.compareAt)) * 100)}%</div>
                  )}
                </div>
              )}

              {wizStep === 2 && (
                <div className="flex flex-col gap-2.5">
                  <div className="text-[11px] font-medium leading-relaxed text-muted">{L('Conjuntos de opciones reutilizables (talla, color…). Sus combinaciones son variantes vendibles. Opcional.', 'Reusable option sets (size, color…). Their combinations are sellable variants. Optional.')}</div>
                  {cfg.optionSets.length === 0 && (
                    <div className="rounded-field border-[1.5px] border-dashed border-lilac-line bg-app px-4 py-5 text-center text-[12px] font-semibold text-muted">{L('Aún no tienes conjuntos de opciones.', "You don't have option sets yet.")}</div>
                  )}
                  {cfg.optionSets.map((o) => {
                    const on = draft.options.includes(o.id);
                    return (
                      <button key={o.id} onClick={() => upD({ options: on ? draft.options.filter((x) => x !== o.id) : [...draft.options, o.id] })} className={`flex w-full items-center gap-3 rounded-btn-lg border-[1.5px] p-3 ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                        <span className={`flex h-4 w-4 flex-none items-center justify-center rounded ${on ? 'bg-primary' : 'bg-lilac-line'}`}>{on && <Check size={10} className="text-white" strokeWidth={3.4} />}</span>
                        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-lilac"><Layers size={15} className="text-primary-dark" strokeWidth={2.2} /></span>
                        <span className="min-w-0 flex-1 text-left"><span className="block text-[12.5px] font-extrabold text-ink">{L(o.es, o.en)}</span><span className="block text-[10px] font-semibold text-muted-2">{o.values.map((v) => L(v.es, v.en ?? v.es)).join(' · ')}</span></span>
                        <span className="flex-none text-[10px] font-extrabold text-muted-2">{o.single ? L('variante', 'variant') : L('extra', 'add-on')}</span>
                      </button>
                    );
                  })}
                  {draft.options.length > 0 && (() => { const n = variantCount(draft.options, cfg.optionSets); return n > 0 ? <div className="rounded-field bg-lilac-2 px-3 py-2 text-[11px] font-extrabold text-primary-dark">{n} {L('variantes vendibles', 'sellable variants')}</div> : null; })()}
                  <button onClick={() => setOptSheet({ open: true, initial: null })} className="mt-1 w-full cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-app py-3 text-[12px] font-extrabold text-primary-dark">+ {L('Nuevo conjunto', 'New option set')}</button>
                </div>
              )}

              {wizStep === 3 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex-1"><div className={fieldLabel}>{L('Cantidad en stock', 'Stock qty')}</div><input value={draft.stock} onChange={(e) => upD({ stock: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="0" className={inputCls} /></div>
                    <div className="flex-1"><div className={fieldLabel}>{L('Reordenar en', 'Reorder at')}</div><input value={draft.reorder} onChange={(e) => upD({ reorder: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="10" className={inputCls} /></div>
                  </div>
                  <div>
                    <div className={fieldLabel}>{L('Entrega', 'Fulfillment')} <span className="font-semibold text-muted">· {L('elige una o varias', 'pick one or more')}</span></div>
                    <div className="flex flex-col gap-2">
                      {([['ship', L('Envío', 'Shipping'), L('Transportista a domicilio', 'Carrier to address'), Truck], ['local', L('Entrega local', 'Local delivery'), L('Tus repartidores o apps', 'Your drivers or apps'), HardHat], ['pickup', L('Recoger', 'Pickup'), L('Recoger en tienda', 'In-store pickup'), Store]] as [string, string, string, LucideIcon][]).map(([k, lbl, subL, Icon]) => {
                        const on = draft.fulfill.includes(k);
                        return (
                          <button key={k} onClick={() => upD({ fulfill: on ? draft.fulfill.filter((x) => x !== k) : [...draft.fulfill, k] })} className={`flex items-center gap-3 rounded-btn-lg border-[1.5px] p-3 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                            <span className={`flex h-4 w-4 flex-none items-center justify-center rounded ${on ? 'bg-primary' : 'bg-lilac-line'}`}>{on && <Check size={10} className="text-white" strokeWidth={3.4} />}</span>
                            <Icon size={16} strokeWidth={2} className={on ? 'text-primary-dark' : 'text-muted-2'} />
                            <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-extrabold text-ink">{lbl}</span><span className="mt-0.5 block text-[10px] font-semibold text-muted-2">{subL}</span></span>
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => go('fulfillment')} className="mt-2 text-[11px] font-extrabold text-primary-dark">{L('Configurar zonas y envío →', 'Configure zones & shipping →')}</button>
                  </div>
                </div>
              )}

              {wizStep === 4 && (() => {
                const editing = editingId != null;
                const optNames = draft.options.map((id) => optSetOf(id)).filter(Boolean).map((o) => L(o!.es, o!.en));
                const rows: [string, string, boolean, number][] = [
                  [L('Nombre', 'Name'), draft.name || '—', !!draft.name, 0],
                  [L('Categoría', 'Category'), catLabel(dc), true, 0],
                  [L('Precio', 'Price'), draft.price ? money(Number(draft.price)) : '—', !!draft.price, 1],
                  ['SKU', draft.sku || '—', !!draft.sku, 1],
                  [L('Variantes', 'Variants'), optNames.length ? optNames.join(', ') : L('Ninguna', 'None'), true, 2],
                  [L('Stock', 'Stock'), draft.stock || '0', true, 3],
                ];
                return (
                  <div className="flex flex-col gap-4">
                    <div className={`flex items-center gap-3 rounded-btn-lg border p-3.5 ${draftReady ? 'border-[#A7E3C0] bg-green-bg' : 'border-[#FDE68A] bg-amber-bg'}`}>
                      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-white text-[15px] font-extrabold ${draftReady ? 'text-green-dark' : 'text-amber-ink'}`}>{draftReady ? '✓' : '⚠'}</span>
                      <div className="min-w-0">
                        <div className={`text-[12px] font-extrabold ${draftReady ? 'text-green-dark' : 'text-amber-ink'}`}>{draftReady ? (editing ? L('Listo para guardar', 'Ready to save') : L('Listo para publicar', 'Ready to publish')) : L('Faltan datos', 'A few essentials missing')}</div>
                        <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-ink-3">{draftReady ? L('Aparecerá en tu tienda al instante.', "It'll appear in your shop instantly.") : L('Agrega nombre y precio antes de continuar.', 'Add a name and price before continuing.')}</div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-btn-lg border border-hair">
                      {rows.map((r, i, a) => (
                        <div key={r[0]} className={`flex items-center gap-3 px-3.5 py-3 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}>
                          <span className="w-20 flex-none text-[10.5px] font-semibold text-muted-2">{r[0]}</span>
                          <span className={`min-w-0 flex-1 truncate text-[11.5px] font-bold ${r[2] ? 'text-ink' : 'text-muted-faint'}`}>{r[1]}</span>
                          <button onClick={() => setWizStep(r[3])} className="flex-none cursor-pointer text-[10.5px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
                        </div>
                      ))}
                    </div>
                    {editing && (
                      <div>
                        <div className={fieldLabel}>{L('Administrar producto', 'Manage product')}</div>
                        <div className="flex gap-2.5">
                          <button onClick={duplicateFromDraft} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3 text-[12.5px] font-extrabold text-ink"><Copy size={14} strokeWidth={2.4} />{L('Duplicar', 'Duplicate')}</button>
                          <button onClick={() => setConfirmDel(true)} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-pink-bg bg-white py-3 text-[12.5px] font-extrabold text-pink-dark"><Trash2 size={14} strokeWidth={2.4} />{L('Eliminar', 'Delete')}</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </ModulePage>
        {editorSheets()}
        <QuickTagSheet open={tagSheet} onClose={() => setTagSheet(false)} L={L} onCreate={addTag} existing={[...BADGES, ...cfg.tags]} />
        <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={() => { setConfirmDel(false); deleteEditing(); }} title={L('¿Eliminar producto?', 'Delete product?')} message={L(`“${draft.name || L('Este producto', 'This product')}” se quitará de tu tienda. Esta acción no se puede deshacer.`, `“${draft.name || 'This product'}” will be removed from your shop. This can’t be undone.`)} confirmLabel={L('Eliminar', 'Delete')} cancelLabel={L('Cancelar', 'Cancel')} />
        <Toast msg={toast} />
      </>
    );
  }

  // ============================ MODULE ============================
  function editorSheets() {
    return (
      <>
        <ProductCategoryEditor open={catSheet.open} onClose={() => { setCatSheet((s) => ({ ...s, open: false })); setCatFromWiz(false); }} L={L} initial={catSheet.initial} itemCount={catSheet.initial ? countIn(catSheet.initial.id) : 0} onSave={upsertCategory} onDelete={deleteCategory} />
        <OptionSetEditor open={optSheet.open} onClose={() => setOptSheet((s) => ({ ...s, open: false }))} L={L} initial={optSheet.initial} usedCount={optSheet.initial ? optUsedBy(optSheet.initial.id) : 0} onSave={upsertOptionSet} onDelete={deleteOptionSet} />
        <CollectionEditor open={collSheet.open} onClose={() => setCollSheet((s) => ({ ...s, open: false }))} L={L} initial={collSheet.initial} products={products.map((p) => ({ dbId: p.dbId, id: p.id, name: p.name }))} onSave={upsertCollection} onDelete={deleteCollection} />
        <DiscountEditor open={discSheet.open} onClose={() => setDiscSheet((s) => ({ ...s, open: false }))} L={L} initial={discSheet.initial} onSave={upsertDiscount} onDelete={deleteDiscount} />
      </>
    );
  }

  // ---- catalog ----
  // Plain computed (NOT useMemo) — it lives after the wizard/success early
  // returns, so a hook here would change the hook count between renders (React
  // #300). The product list is tiny; recomputing per render is free.
  const filtered = (() => {
    let list = catFilter === 'all' ? products : products.filter((p) => p.cat === catFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.name + ' ' + p.sku).toLowerCase().includes(q));
    return list;
  })();
  const catFilters = [{ id: 'all', label: L('Todos', 'All') }, ...cfg.categories.filter((c) => products.some((p) => p.cat === c.id)).map((c) => ({ id: c.id, label: catLabel(c) }))];

  const catalog = (
    <div className="flex flex-col gap-4">
      {/* MODE: display-only vs online selling */}
      <div className={`${cardCls} p-3.5`}>
        <div className="mb-2 flex items-center gap-2 text-[12.5px] font-extrabold text-ink"><CreditCard size={15} strokeWidth={2.2} className="text-primary-dark" />{L('Modo de la tienda', 'Shop mode')}</div>
        <div className="flex rounded-full bg-lilac-2 p-0.5">
          <button onClick={() => { if (cfg.selling) { saveCfg({ ...cfg, selling: false }); flash(L('Tienda en modo Solo catálogo', 'Shop set to Catalog only')); } }} className={`flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${!cfg.selling ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`}>{L('Solo catálogo', 'Catalog only')}</button>
          <button onClick={() => { if (!cfg.selling) { saveCfg({ ...cfg, selling: true }); flash(L('Tienda con venta en línea', 'Shop set to Online selling')); } }} className={`flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${cfg.selling ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`}>{L('Vender en línea', 'Sell online')}</button>
        </div>
        <p className="mt-2 text-[11px] font-medium leading-relaxed text-muted">
          {cfg.selling
            ? L('Tu listado muestra tus productos y los clientes pueden comprar en línea (carrito y checkout).', 'Your listing shows products and customers can buy online (cart & checkout).')
            : L('Tu listado muestra tus productos y precios. Los clientes te llaman o visitan para comprar — sin checkout.', 'Your listing shows products & prices. Customers call or visit to buy — no checkout.')}
        </p>
      </div>

      {/* search */}
      <div className="flex items-center gap-2.5 rounded-field border border-hair bg-white px-3 py-2.5">
        <Search size={15} strokeWidth={2.2} className="flex-none text-muted-2" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L('Buscar productos…', 'Search products…')} className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-muted-2" />
      </div>

      {catFilters.length > 1 && (
        <ChipRow className="-mx-1 px-1">
          {catFilters.map((c) => <button key={c.id} onClick={() => setCatFilter(c.id)} className={chip(catFilter === c.id)}>{c.label}</button>)}
        </ChipRow>
      )}

      {filtered.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{products.length === 0 ? L('Aún no tienes productos — agrega el primero.', 'No products yet — add your first one.') : L('Ningún producto coincide con tu búsqueda.', 'No products match your search.')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {filtered.map((p) => {
            const [lab, pillCls] = stockPill(p.stock);
            return (
              <button key={p.id} onClick={() => startEdit(p)} className={`${cardCls} cursor-pointer p-3 text-left`}>
                <div className="flex gap-3">
                  <span className="relative h-[60px] w-[60px] flex-none overflow-hidden rounded-tile" style={{ background: stripe(catOf(p.cat).tile) }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.imageUrl && <img src={p.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[13.5px] font-extrabold text-ink">{p.name}</span><Pencil size={11} strokeWidth={2.4} className="flex-none text-muted-faint" /></span>
                      <span className="flex flex-none items-center gap-1.5">
                        {p.compareAt && p.compareAt > p.price && <span className="text-[11px] font-bold text-muted line-through">{money(p.compareAt)}</span>}
                        <span className={`whitespace-nowrap text-[13.5px] font-extrabold ${p.compareAt && p.compareAt > p.price ? 'text-[#E0568F]' : 'text-ink'}`}>{money(p.price)}</span>
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[10.5px] font-semibold text-muted-2">{catLabel(catOf(p.cat))}{p.sku ? ` · ${p.sku}` : ''}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      {cfg.selling && <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${pillCls}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{p.stock === 0 ? lab : p.stock}</span>}
                      {p.options.length > 0 && <span className="rounded-md bg-lilac px-1.5 py-0.5 text-[9px] font-extrabold text-primary-dark">{variantCount(p.options, cfg.optionSets) || p.options.length} {L('variantes', 'variants')}</span>}
                      {p.badges.map((t) => <span key={t} className="rounded-md bg-amber-bg px-1.5 py-0.5 text-[9px] font-extrabold text-amber-ink">{tagLabel(t, L)}</span>)}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button onClick={startAdd} className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[14px] font-extrabold text-white shadow-cta-sm"><Plus size={16} strokeWidth={2.6} />{L('Nuevo producto', 'New product')}</button>
    </div>
  );

  // ---- categories ----
  const categoriesTab = (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3 text-[11.5px] font-medium leading-relaxed text-ink-3">{cfg.categories.length}{L(' categorías · toca para editar · reordena con las flechas · activa/desactiva para mostrar', ' categories · tap to edit · reorder with the arrows · toggle to show')}</div>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {cfg.categories.map((c, i) => {
          const Icon = prodCatIcon(c.icon); const n = countIn(c.id);
          return (
            <div key={c.id} className={`flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 shadow-card ${c.visible ? '' : 'opacity-60'}`}>
              <span className="flex flex-none flex-col">
                <button onClick={() => moveCategory(c.id, -1)} disabled={i === 0} aria-label={L('Subir', 'Up')} className="cursor-pointer p-0.5 text-muted-2 disabled:opacity-25"><ChevronUp size={13} strokeWidth={2.6} /></button>
                <button onClick={() => moveCategory(c.id, 1)} disabled={i === cfg.categories.length - 1} aria-label={L('Bajar', 'Down')} className="cursor-pointer p-0.5 text-muted-2 disabled:opacity-25"><ChevronDown size={13} strokeWidth={2.6} /></button>
              </span>
              <button onClick={() => setCatSheet({ open: true, initial: c })} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[11px] text-white" style={{ background: stripe(c.tile) }}><Icon size={18} strokeWidth={2.2} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-ink">{catLabel(c)}</span><Pencil size={11} strokeWidth={2.4} className="flex-none text-muted-faint" />{!c.visible && <span className="rounded bg-lilac-2 px-1.5 py-px text-[8.5px] font-extrabold text-muted-2">{L('Oculto', 'Hidden')}</span>}</div>
                  <div className="mt-0.5 text-[10px] font-semibold text-muted-2">{n} {n === 1 ? L('producto', 'product') : L('productos', 'products')}</div>
                </div>
              </button>
              <Switch big on={c.visible} onClick={() => toggleCategory(c.id)} />
            </div>
          );
        })}
      </div>
      <button onClick={() => setCatSheet({ open: true, initial: null })} className={addBtn}>+ {L('Nueva categoría', 'New category')}</button>
    </div>
  );

  // ---- variants (option sets) ----
  const variantsTab = (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3.5 flex items-center gap-3 rounded-tile bg-lilac-2 p-3">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-primary"><Layers size={15} className="text-white" strokeWidth={2.2} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[12px] font-extrabold text-ink">{L('Conjuntos de opciones reutilizables', 'Reusable option sets')}</span><span className="block text-[10.5px] font-medium leading-snug text-ink-3">{L('Crea talla/color una vez, úsalo en cualquier producto.', 'Build size/color once, use it on any product.')}</span></span>
      </div>
      {cfg.optionSets.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Aún no hay conjuntos — crea el primero (ej. Talla, Color).', 'No option sets yet — create your first (e.g. Size, Color).')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {cfg.optionSets.map((o) => {
            const used = optUsedBy(o.id); const n = variantCount([o.id], cfg.optionSets);
            return (
              <button key={o.id} onClick={() => setOptSheet({ open: true, initial: o })} className="flex cursor-pointer items-start gap-3 rounded-card-sm border border-hair bg-white p-3 text-left shadow-card">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-lilac"><Layers size={16} className="text-primary-dark" strokeWidth={2.2} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-ink">{L(o.es, o.en)}</span><Pencil size={11} strokeWidth={2.4} className="flex-none text-muted-faint" /></span>
                  <span className="mt-0.5 block truncate text-[10.5px] font-semibold text-ink-3">{o.values.map((v) => L(v.es, v.en ?? v.es)).join(' · ')}</span>
                  <span className="mt-1 block text-[10px] font-semibold text-muted-2">{o.single ? `${n} ${L('variantes', 'variants')}` : L('extras', 'add-ons')} · {used} {used === 1 ? L('producto', 'product') : L('productos', 'products')}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <button onClick={() => setOptSheet({ open: true, initial: null })} className={addBtn}>+ {L('Nuevo conjunto', 'New option set')}</button>
    </div>
  );

  // ---- collections ----
  const collectionsTab = (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3 text-[11.5px] font-medium leading-relaxed text-ink-3">{L('Agrupa productos en colecciones. Destaca algunas como franjas en tu tienda.', 'Group products into collections. Feature some as strips on your shop.')}</div>
      {cfg.collections.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Aún no hay colecciones — crea la primera (ej. Sets de regalo).', 'No collections yet — create your first (e.g. Gift sets).')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {cfg.collections.map((c) => (
            <button key={c.id} onClick={() => setCollSheet({ open: true, initial: c })} className={`cursor-pointer overflow-hidden text-left ${cardCls}`}>
              <div className="relative h-[70px]" style={{ background: stripe(c.tile) }}>
                {c.featured && <span className="absolute left-2.5 top-2.5 rounded-md bg-ink px-2 py-0.5 text-[9px] font-extrabold text-white">★ {L('Destacada', 'Featured')}</span>}
                <span className="absolute bottom-2.5 right-2.5 rounded-md bg-ink/50 px-2 py-0.5 text-[9.5px] font-bold text-white">{c.productIds.length} {L('artículos', 'items')}</span>
              </div>
              <div className="flex items-center gap-2.5 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-ink">{L(c.es, c.en)}</span><Pencil size={11} strokeWidth={2.4} className="flex-none text-muted-faint" /></div>
                  {(c.descEs || c.descEn) && <div className="mt-0.5 truncate text-[10.5px] font-medium text-muted-2">{L(c.descEs ?? '', c.descEn ?? '')}</div>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setCollSheet({ open: true, initial: null })} className={addBtn}>+ {L('Nueva colección', 'New collection')}</button>
    </div>
  );

  // ---- discounts ----
  const activeDisc = cfg.discounts.filter((d) => d.status === 'active').length;
  const discountsTab = (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3.5 grid grid-cols-3 gap-2.5">
        {([[L('Activos', 'Active'), String(activeDisc)], [L('Total', 'Total'), String(cfg.discounts.length)], [L('Automáticos', 'Automatic'), String(cfg.discounts.filter((d) => d.auto).length)]] as [string, string][]).map(([l, v]) => (
          <div key={l} className={`${cardCls} p-3`}><div className="text-[9px] font-bold text-muted-2">{l}</div><div className="mt-0.5 text-[18px] font-extrabold text-ink">{v}</div></div>
        ))}
      </div>
      {cfg.discounts.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Aún no hay descuentos — crea el primero (ej. WELCOME15).', 'No discounts yet — create your first (e.g. WELCOME15).')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {cfg.discounts.map((d) => {
            const val = d.type === 'percent' ? `${d.value ?? 0}%` : d.type === 'amount' ? `$${d.value ?? 0}` : d.type === 'shipping' ? '🚚' : '2×1';
            const paused = d.status === 'paused';
            return (
              <div key={d.id} className={`flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 shadow-card ${paused ? 'opacity-60' : ''}`}>
                <button onClick={() => setDiscSheet({ open: true, initial: d })} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-lilac text-[13px] font-extrabold text-primary-dark">{val}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5"><span className="truncate font-mono text-[12.5px] font-extrabold text-ink">{d.code}</span>{d.auto && <span className="rounded bg-lilac px-1.5 py-px text-[8px] font-extrabold text-primary-dark">{L('Auto', 'Auto')}</span>}<Pencil size={11} strokeWidth={2.4} className="flex-none text-muted-faint" /></div>
                    <div className="mt-0.5 truncate text-[10px] font-medium text-muted-2">{L(d.descEs, d.descEn)}</div>
                  </div>
                </button>
                <button onClick={() => toggleDiscount(d.id)} className={`flex-none rounded-md px-2 py-1 text-[9px] font-extrabold ${paused ? 'bg-lilac-2 text-muted-2' : 'bg-green-bg text-green-dark'}`}>{paused ? L('Pausado', 'Paused') : L('Activo', 'Active')}</button>
              </div>
            );
          })}
        </div>
      )}
      <button onClick={() => setDiscSheet({ open: true, initial: null })} className={addBtn}>+ {L('Nuevo descuento', 'New discount')}</button>
    </div>
  );

  // ---- inventory (real, from the catalog) ----
  const invValue = products.reduce((n, p) => n + p.price * p.stock, 0);
  const lowCount = products.filter((p) => p.stock > 0 && p.stock <= (p.reorder || 8)).length;
  const outCount = products.filter((p) => p.stock === 0).length;
  const inventoryTab = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2.5">
        <div className={`${cardCls} p-3`}><div className="text-[9px] font-bold text-muted-2">{L('Valor inv.', 'Inv. value')}</div><div className="mt-0.5 text-[16px] font-extrabold text-ink">{money(invValue)}</div><div className="text-[9px] font-extrabold text-muted-2">{products.length} SKU</div></div>
        <div className="rounded-card-sm border border-amber/40 bg-amber-bg p-3"><div className="text-[9px] font-bold text-amber-ink">{L('Reabastecer', 'Reorder')}</div><div className="mt-0.5 text-[16px] font-extrabold text-ink">{lowCount}</div><div className="text-[9px] font-extrabold text-amber-ink">⚠ {L('Bajo umbral', 'Below')}</div></div>
        <div className="rounded-card-sm border border-pink-bg bg-pink-bg p-3"><div className="text-[9px] font-bold text-pink-dark">{L('Agotados', 'Out')}</div><div className="mt-0.5 text-[16px] font-extrabold text-ink">{outCount}</div><div className="text-[9px] font-extrabold text-pink-dark">{L('Sin stock', 'No stock')}</div></div>
      </div>
      {products.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Agrega productos para ver tu inventario.', 'Add products to see your inventory.')}</div>
      ) : (
        <div className={`${cardCls} overflow-hidden`}>
          {products.map((p, i) => {
            const [lab, pillCls] = stockPill(p.stock);
            const onC = p.stock === 0 ? 'text-pink-dark' : p.stock <= (p.reorder || 8) ? 'text-amber-ink' : 'text-ink';
            return (
              <button key={p.id} onClick={() => startEdit(p)} className={`flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left ${i < products.length - 1 ? 'border-b border-hair' : ''}`}>
                <span className="relative h-10 w-10 flex-none overflow-hidden rounded-tile" style={{ background: stripe(catOf(p.cat).tile) }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-extrabold text-ink">{p.name}</div>
                  <div className="mt-0.5 text-[9.5px] font-semibold text-muted-2">{p.sku ? `SKU ${p.sku} · ` : ''}{L('Reordenar en', 'Reorder at')} {p.reorder || 0}</div>
                </div>
                <div className="flex-none text-right">
                  <div className={`text-[15px] font-extrabold ${onC}`}>{p.stock}</div>
                  <span className={`mt-0.5 inline-block rounded-md px-1.5 py-px text-[8.5px] font-extrabold ${pillCls}`}>{lab}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const subDefs: [typeof sub, string, string | null][] = [
    ['catalog', L('Catálogo', 'Catalog'), null],
    ['cats', L('Categorías', 'Categories'), String(cfg.categories.length)],
    ['variants', L('Variantes', 'Variants'), String(cfg.optionSets.length)],
    ['collections', L('Colecciones', 'Collections'), String(cfg.collections.length)],
    ['discounts', L('Descuentos', 'Discounts'), String(cfg.discounts.length)],
    ['inventory', L('Inventario', 'Inventory'), null],
  ];

  return (
    <div className="relative pb-8">
      {isFree && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-card-sm bg-amber-bg p-3.5">
          <span className="text-[18px]">✦</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-extrabold text-ink">{L('La tienda en línea es una función Verified.', 'The online shop is a Verified feature.')}</span>
            <span className="block text-[11px] font-semibold text-amber-ink">{L('Estás viendo una vista previa. Verifícate para vender productos.', "You're seeing a preview. Get verified to sell products.")}</span>
          </span>
          <button onClick={() => go('billing')} className="flex-none cursor-pointer rounded-btn bg-ink px-3.5 py-2 text-[11.5px] font-extrabold text-white">{L('Verificar', 'Verify')}</button>
        </div>
      )}

      {/* delivery + shipping live in the shared "Entregas y envíos" module */}
      <button onClick={() => go('fulfillment')} className="mb-3 flex w-full items-center gap-3 rounded-card-sm border border-hair bg-white p-3 text-left shadow-card">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac text-primary-dark"><Truck size={17} strokeWidth={2} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-extrabold text-ink">{L('Entregas y envíos', 'Delivery & shipping')}</span>
          <span className="block text-[10.5px] font-semibold leading-snug text-muted-2">{L('Zonas, repartidores y envío nacional — compartido con tu menú', 'Zones, drivers & national shipping — shared with your menu')}</span>
        </span>
        <span className="flex-none text-[13px] font-extrabold text-muted-2">›</span>
      </button>

      <div className="mb-4">
        <ChipRow className="-mx-1 px-1">
          {subDefs.map(([k, label, badge]) => (
            <button key={k} onClick={() => setSub(k)} className={chip(sub === k)}>{label}{badge != null && <span className={`ml-1.5 font-extrabold ${sub === k ? 'text-white/80' : 'text-muted-2'}`}>{badge}</span>}</button>
          ))}
        </ChipRow>
      </div>

      {sub === 'catalog' ? catalog : sub === 'cats' ? categoriesTab : sub === 'variants' ? variantsTab : sub === 'collections' ? collectionsTab : sub === 'discounts' ? discountsTab : inventoryTab}

      {editorSheets()}
      <Toast msg={toast} />
    </div>
  );
}

// ---------- draft ----------
type Draft = {
  name: string; descEs: string; descEn: string; cat: string; price: string; compareAt: string;
  sku: string; stock: string; reorder: string; options: string[]; fulfill: string[]; tax: string;
  badges: string[]; photoUrl: string;
};
const newDraft = (cat: string): Draft => ({ name: '', descEs: '', descEn: '', cat, price: '', compareAt: '', sku: '', stock: '', reorder: '', options: [], fulfill: ['ship'], tax: 'goods', badges: [], photoUrl: '' });
