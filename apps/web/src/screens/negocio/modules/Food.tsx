'use client';

// Menú de comida / Food module (business dashboard). The largest module — and
// fully functional: 7 sub-tabs (Platillos / Categorías / Modificadores /
// Horarios / Promociones / Alérgenos / Stock 86) with real CRUD on every one.
//   • Items live in `business_items` (kind='menu', migration 0021): create via
//     the 6-step wizard, edit, DUPLICATE and delete on the edit page.
//   • Menu STRUCTURE (categories, reusable modifier groups, dayparts, promos,
//     stock automation) lives in `businesses.menu_config` (migration 0045),
//     edited through the FoodEditors sheets and saved as one blob via the
//     resilient bizAdmin.update.
//   • The allergen matrix is real: tap a cell to cycle none → contains → may;
//     it persists to each item.
// Demo mode (not signed in) keeps a rich local sample so everything stays
// explorable; nothing persists. Mobile-first throughout.

import { useEffect, useRef, useState } from 'react';
import { imgUrl, ANCHO } from '@/lib/img';
import { Icon as LucideIcon } from '@tabler/icons-react';
import { IconAlertTriangle as AlertTriangle, IconCalendar as Calendar, IconCheck as Check, IconChevronDown as ChevronDown, IconChevronUp as ChevronUp, IconClock as Clock, IconCopy as Copy, IconGift as Gift, IconInfoCircle as Info, IconLink as Link2, IconLoader2 as Loader2, IconPencil as Pencil, IconPlus as Plus, IconSearch as Search, IconShieldCheck as ShieldCheck, IconShoppingBag as ShoppingBag, IconSparkles as Sparkles, IconTrash as Trash2, IconTruck as Truck, IconUpload as Upload, IconToolsKitchen2 as Utensils, IconX as X, IconBolt as Zap } from '@tabler/icons-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { ChipRow } from '@/components/ChipRow';
import { SectionTabs, type SectionTab } from '@/components/SectionTabs';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { QuickTagSheet } from '@/components/QuickTagSheet';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useUrlTab } from '@/lib/urlView';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draftStore';
import { deleteBizItem, insertBizItem, listBizItems, updateBizItem, type BizItemRow, type NewBizItem } from '@/lib/bizItems';
import {
  defaultMenuConfig, demoMenuConfig, hourLabel, normalizeMenuConfig,
  type Daypart, type MenuCategory, type MenuConfig, type ModGroup, type Promo, type PromoType,
} from '@/lib/menuConfig';
import { CategoryEditor, DaypartEditor, ModGroupEditor, PromoEditor, PROMO_TYPES, catIcon } from '@/screens/negocio/modules/FoodEditors';

const cardCls = 'rounded-card-sm border border-line bg-white ';

// ---------- domain types ----------
type Stock = 'in' | 'low' | 'out';
type Item = {
  id: number; dbId?: string; name: string; cat: string; price: number; compareAt?: number;
  es: string; en: string; diet: string[]; allergens: number[]; mods: string[];
  stock: Stock; popular: boolean; isNew: boolean; loves: number; visible: boolean;
  dailyLimit?: string; imageUrl?: string; tags?: string[]; // custom owner tags
  extra?: Record<string, unknown>; // pass-through attrs (channels/sched/days/rules)
};

// 7 allergen columns — value semantics: 0 none · 2 contains (✓) · 1 may (~).
const ALLERGENS_ES = ['Gluten', 'Lácteo', 'Huevo', 'Nuez', 'Soya', 'Marisco', 'Ajonjolí'];
const ALLERGENS_EN = ['Gluten', 'Dairy', 'Eggs', 'Nuts', 'Soy', 'Shellfish', 'Sesame'];
const blankAllergens = () => [0, 0, 0, 0, 0, 0, 0];

// Neutral category shown for items whose category was deleted.
const FALLBACK_CAT: MenuCategory = { id: '_', es: 'Menú', en: 'Menu', icon: 'utensils', tile: '#FFECF2 0 8px,#FED2DF 8px 16px', visible: true };

// Map a business_items row (kind='menu') ⇄ the module's rich Item.
const KNOWN_ATTRS = new Set(['en', 'diet', 'allergens', 'mods', 'stock', 'popular', 'isNew', 'loves', 'compareAt', 'dailyLimit', 'tags']);
function rowToItem(r: BizItemRow, idx: number): Item {
  const a = (r.attrs ?? {}) as Record<string, unknown>;
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(a)) if (!KNOWN_ATTRS.has(k)) extra[k] = v;
  const alg = Array.isArray(a.allergens) ? (a.allergens as number[]) : blankAllergens();
  return {
    id: idx + 1,
    dbId: r.id,
    name: r.name,
    cat: r.section ?? FALLBACK_CAT.id,
    price: Number(r.price ?? 0),
    compareAt: a.compareAt != null ? Number(a.compareAt) : undefined,
    es: r.description ?? '',
    en: String(a.en ?? r.description ?? ''),
    diet: (a.diet as string[]) ?? [],
    allergens: [...alg, ...blankAllergens()].slice(0, 7),
    mods: (a.mods as string[]) ?? [],
    stock: (a.stock as Stock) ?? 'in',
    popular: !!a.popular,
    isNew: !!a.isNew,
    loves: Number(a.loves ?? 0),
    visible: r.available,
    dailyLimit: a.dailyLimit != null ? String(a.dailyLimit) : undefined,
    imageUrl: r.image_url ?? undefined,
    tags: (a.tags as string[]) ?? [],
    extra,
  };
}
const itemAttrs = (it: Item): Record<string, unknown> => ({
  ...(it.extra ?? {}),
  en: it.en, diet: it.diet, allergens: it.allergens, mods: it.mods, stock: it.stock,
  popular: it.popular, isNew: it.isNew, loves: it.loves,
  ...(it.compareAt != null ? { compareAt: it.compareAt } : {}),
  ...(it.dailyLimit ? { dailyLimit: it.dailyLimit } : {}),
  ...(it.tags?.length ? { tags: it.tags } : {}),
});
function itemToRow(it: Item, businessId: string, sort: number): NewBizItem {
  return {
    business_id: businessId, kind: 'menu', name: it.name, description: it.es,
    price: it.price, unit: null, section: it.cat, available: it.visible, sort,
    image_url: it.imageUrl ?? null, attrs: itemAttrs(it),
  };
}

const money = (n: number | string) => '$' + Number(n || 0).toFixed(2);

type Draft = {
  name: string; descEs: string; descEn: string; cat: string; price: string; compareAt: string;
  channels: Record<string, boolean>; sched: string; days: number[];
  mods: Record<string, boolean>; diet: string[]; allergens: number[]; stock: Stock;
  flags: Record<string, boolean>; dailyLimit: string; visible: boolean; publishMode: string;
  rules: Record<number, boolean>; photoUrl: string; tags: string[];
};
const newDraft = (cat: string): Draft => ({
  name: '', descEs: '', descEn: '', cat, price: '', compareAt: '',
  channels: { dinein: true, pickup: true, delivery: true, catering: false },
  sched: 'all-day', days: [1, 1, 1, 1, 1, 1, 1], mods: {}, diet: [], stock: 'in',
  allergens: blankAllergens(), flags: { isNew: true, popular: false, featured: false },
  dailyLimit: '', visible: true, publishMode: 'now', rules: { 0: true, 1: true, 2: false }, photoUrl: '', tags: [],
});

// ---------- shared UI atoms ----------
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-[25px] w-[42px] flex-none cursor-pointer rounded-full transition-colors ${on ? 'bg-primary' : 'bg-lilac-line'}`}
      aria-pressed={on}
    >
      <span className={`absolute top-[3px] h-[19px] w-[19px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.18)] transition-all ${on ? 'left-[20px]' : 'left-[3px]'}`} />
    </button>
  );
}

const chip = (on: boolean) =>
  `tap-y flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;

const sectionLabel = 'text-[10px] font-extrabold uppercase tracking-[.06em] text-muted-2';
const fieldLabel = 'mb-1.5 text-[11px] font-extrabold text-ink-soft';
const inputCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary';
const addBtn = 'mt-3.5 w-full cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-app py-3 text-[12.5px] font-extrabold text-primary-dark';

const STOCK_META: Record<Stock, { es: string; en: string; badge: string; dot: string }> = {
  in: { es: 'En stock', en: 'In stock', badge: 'bg-green-bg text-green-ink', dot: 'bg-green-dark' },
  low: { es: 'Bajo', en: 'Low', badge: 'bg-amber-bg text-amber-ink', dot: 'bg-amber-ink' },
  out: { es: 'Agotado', en: 'Sold out', badge: 'bg-pink-bg text-pink-dark', dot: 'bg-pink-dark' },
};

// Demo items (sample menu so the module is explorable without signing in).
const DEMO_ITEMS: Item[] = [
  { id: 1, name: 'Country Loaf', cat: 'bread', price: 12, es: 'Pan de campo de masa madre. Trigo integral, horneado a diario.', en: 'Naturally-leavened country bread. Whole wheat, baked daily.', diet: ['V'], allergens: [2, 0, 0, 0, 0, 0, 1], mods: [], stock: 'in', popular: true, isNew: false, loves: 184, visible: true },
  { id: 2, name: 'Pizza Margherita', cat: 'pizza', price: 18, es: 'Tomate San Marzano, fior di latte, albahaca, AOVE. 90 seg al horno.', en: 'San Marzano tomato, fior di latte, basil. Wood-fired 90 sec.', diet: ['V'], allergens: [2, 2, 0, 0, 0, 0, 0], mods: ['size', 'toppings', 'crust'], stock: 'in', popular: true, isNew: false, loves: 142, visible: true },
  { id: 3, name: 'Morning Bun', cat: 'pastry', price: 5, es: 'Masa de croissant con azúcar de canela y naranja.', en: 'Croissant dough with cinnamon-orange sugar.', diet: ['V'], allergens: [2, 2, 2, 1, 0, 0, 0], mods: [], stock: 'low', popular: false, isNew: true, loves: 126, visible: true },
  { id: 4, name: 'Menú degustación', cat: 'wine', price: 140, es: '5 tiempos, maridaje opcional (+$60). Mar–Dom, solo cena.', en: '5 courses, optional pairing (+$60). Tue–Sun, dinner only.', diet: [], allergens: blankAllergens(), mods: ['winepair'], stock: 'in', popular: true, isNew: false, loves: 42, visible: true },
  { id: 5, name: 'Ensalada de jitomate', cat: 'salad', price: 13, es: 'Jitomates heirloom, albahaca, sal de mar, AOVE.', en: 'Heritage tomatoes, basil, sea salt, EVOO.', diet: ['VG'], allergens: blankAllergens(), mods: [], stock: 'in', popular: false, isNew: true, loves: 38, visible: true },
  { id: 6, name: 'Tiramisú', cat: 'pastry', price: 9, es: 'Clásico — savoiardi al espresso, mascarpone, cacao.', en: 'Classic — espresso savoiardi, mascarpone, cocoa.', diet: ['V'], allergens: [2, 2, 2, 0, 0, 0, 0], mods: [], stock: 'in', popular: false, isNew: false, loves: 58, visible: true },
  { id: 7, name: 'Cortado', cat: 'drinks', price: 4.5, es: 'Espresso y leche vaporizada a partes iguales.', en: 'Equal parts espresso & steamed milk.', diet: ['V'], allergens: [0, 2, 0, 0, 0, 0, 0], mods: ['milk'], stock: 'in', popular: false, isNew: false, loves: 320, visible: true },
  { id: 8, name: 'Masa madre sin gluten', cat: 'bread', price: 14, es: 'Receta sin gluten, fermento de 36h. Cantidad limitada.', en: 'Gluten-free recipe, 36-hour ferment. Limited daily.', diet: ['GF', 'V'], allergens: [0, 0, 0, 0, 0, 0, 1], mods: [], stock: 'out', popular: false, isNew: false, loves: 24, visible: true },
  { id: 9, name: 'Pizza anchoa y burrata', cat: 'pizza', price: 22, es: 'Anchoa del Cantábrico, burrata, limón, aceite de oliva.', en: 'Cantabrian anchovy, burrata, lemon, olive oil.', diet: [], allergens: [2, 2, 0, 0, 0, 2, 0], mods: ['size', 'crust'], stock: 'in', popular: false, isNew: false, loves: 72, visible: false },
];

// =====================================================================
export function FoodModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es, go } = ctx;
  void tab;

  const admin = useBizAdmin();
  const { user } = useAuth();
  const real = admin.active;
  const persistable = !admin.demo && !!real; // real signed-in business → persist

  // Item photo upload — SAME compression protocol as Comunidad (client-side
  // WebP + EXIF strip via lib/image). Demo / signed-out → local object URL so
  // the flow stays explorable without uploading anything.
  const [photoBusy, setPhotoBusy] = useState(false);
  const wizFileRef = useRef<HTMLInputElement>(null);
  const pickPhoto = async (file: File | null | undefined, apply: (url: string) => void) => {
    if (!file || !file.type.startsWith('image/') || photoBusy) return;
    setPhotoBusy(true);
    try {
      const url = !persistable || !user || !supabase
        ? URL.createObjectURL(file)
        : await uploadImage(file, user.id, 1200); // menu cards never need more than ~1200px
      apply(url);
    } catch {
      flash(L('No se pudo subir la foto.', "Couldn't upload the photo."));
    }
    setPhotoBusy(false);
  };

  // ── menu structure (categories / mods / dayparts / promos / automation) ────
  const [cfg, setCfg] = useState<MenuConfig>(demoMenuConfig);
  useEffect(() => {
    setCfg(admin.demo ? demoMenuConfig() : real?.menu_config ? normalizeMenuConfig(real.menu_config) : defaultMenuConfig());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);
  const saveCfg = (next: MenuConfig) => {
    setCfg(next);
    if (persistable) admin.update({ menu_config: next });
  };
  const catOf = (id: string): MenuCategory => cfg.categories.find((c) => c.id === id) ?? FALLBACK_CAT;
  const catLabel = (c: MenuCategory) => L(c.es, c.en);

  // ── items ───────────────────────────────────────────────────────────────────
    // El estado inicial NO puede ser de ejemplo: se pinta antes de saber si
  // hay negocio real, así que un dueño ve un instante el catálogo de otro.
  // Quien decide es el cargador de abajo. (Auditoría de Negocios, 2026-08-04.)
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    if (!persistable || !real) { setItems(DEMO_ITEMS); return; }
    let cancelled = false;
    (async () => {
      const rows = await listBizItems(real.id, 'menu');
      if (!cancelled) setItems(rows.map(rowToItem));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  const nextId = () => (items.length ? Math.max(...items.map((i) => i.id)) : 0) + 1;
  const persistNew = async (it: Item) => {
    if (!persistable || !real) return;
    const dbId = await insertBizItem(itemToRow(it, real.id, items.length));
    if (dbId) setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, dbId } : x)));
  };
  const persistPatch = (it: Item | undefined) => {
    if (persistable && it?.dbId) {
      updateBizItem(it.dbId, { name: it.name, description: it.es, price: it.price, section: it.cat, available: it.visible, image_url: it.imageUrl ?? null, attrs: itemAttrs(it) });
    }
  };
  const patchItem = (id: number, p: Partial<Item>) =>
    setItems((xs) => { const next = xs.map((i) => (i.id === id ? { ...i, ...p } : i)); persistPatch(next.find((i) => i.id === id)); return next; });

  // ── ui state ────────────────────────────────────────────────────────────────
  // Sub-tab mirrored to ?sub= so a refresh keeps you on the same section (Panel
  // clears ?sub when you switch modules; default 'items' omits the param).
  const [subtab, setSubtab] = useUrlTab<'items' | 'categories' | 'mods' | 'schedules' | 'promos' | 'allergens' | 'stock'>('sub', 'items', (v) => ['items', 'categories', 'mods', 'schedules', 'promos', 'allergens', 'stock'].includes(v));
  const [view, setView] = useState<'module' | 'wizard' | 'success'>('module');
  const [cat, setCat] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null); // null = creating; else editing this item
  const [confirmDel, setConfirmDel] = useState(false); // delete-item confirmation
  const [wizStep, setWizStep] = useState(0);
  const [wizMax, setWizMax] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => newDraft('pizza'));
  const [toast, setToast] = useState('');
  // structure editor sheets
  const [catSheet, setCatSheet] = useState<{ open: boolean; initial: MenuCategory | null }>({ open: false, initial: null });
  const [modSheet, setModSheet] = useState<{ open: boolean; initial: ModGroup | null }>({ open: false, initial: null });
  const [dpSheet, setDpSheet] = useState<{ open: boolean; initial: Daypart | null }>({ open: false, initial: null });
  const [promoSheet, setPromoSheet] = useState<{ open: boolean; initial: Promo | null; createType: PromoType }>({ open: false, initial: null, createType: 'percent' });
  const [catFromWiz, setCatFromWiz] = useState(false); // category sheet opened from the wizard → auto-select on create
  const [tagSheet, setTagSheet] = useState(false); // quick "new tag" popup

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };
  const upDraft = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  // ── draft recovery: autosave the CREATE draft so the owner can leave & resume ─
  const draftKey = 'tl:draft:menu:' + (real?.id ?? 'demo');
  useEffect(() => {
    if (view === 'wizard' && editingId == null) saveDraft(draftKey, draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, view, editingId]);

  const lowCount = items.filter((i) => i.stock === 'low').length;
  const outCount = items.filter((i) => i.stock === 'out').length;
  const visibleCount = items.filter((i) => i.visible).length;
  const countIn = (catId: string) => items.filter((i) => i.cat === catId).length;
  const usedBy = (groupId: string) => items.filter((i) => i.mods.includes(groupId)).length;

  const startAdd = () => {
    setEditingId(null);
    const fresh = newDraft(cfg.categories.find((c) => c.visible)?.id ?? 'pizza');
    const saved = loadDraft<Draft>(draftKey);
    if (saved && (saved.name?.trim() || saved.descEs || saved.descEn || saved.price || saved.photoUrl)) {
      setDraft({ ...fresh, ...saved });
      flash(L('Borrador recuperado', 'Draft restored'));
    } else setDraft(fresh);
    setWizStep(0); setWizMax(0); setView('wizard');
  };

  // Editing reuses the SAME full wizard, pre-filled from the item — so every
  // field (channels, schedule, days, allergens, límite, flags, foto…) is editable,
  // not the trimmed sheet. All steps are unlocked (it's real data).
  const draftFromItem = (it: Item): Draft => {
    const ex = (it.extra ?? {}) as Record<string, unknown>;
    return {
      name: it.name, descEs: it.es, descEn: it.en, cat: it.cat,
      price: it.price ? String(it.price) : '', compareAt: it.compareAt != null ? String(it.compareAt) : '',
      channels: (ex.channels as Record<string, boolean>) ?? { dinein: true, pickup: true, delivery: true, catering: false },
      sched: (ex.sched as string) ?? 'all-day',
      days: Array.isArray(ex.days) ? (ex.days as number[]) : [1, 1, 1, 1, 1, 1, 1],
      mods: Object.fromEntries(it.mods.map((id) => [id, true])),
      diet: [...it.diet], allergens: [...it.allergens], stock: it.stock,
      flags: { isNew: it.isNew, popular: it.popular, featured: !!ex.featured },
      dailyLimit: it.dailyLimit ?? '', visible: it.visible, publishMode: 'now',
      rules: (ex.rules as Record<number, boolean>) ?? { 0: true, 1: true, 2: false },
      photoUrl: it.imageUrl ?? '', tags: it.tags ? [...it.tags] : [],
    };
  };
  const startEdit = (it: Item) => { setEditingId(it.id); setDraft(draftFromItem(it)); setWizStep(0); setWizMax(wizStepDefs.length - 1); setView('wizard'); };

  // ── structure mutations (all persist via saveCfg) ───────────────────────────
  const upsertCategory = (c: MenuCategory) => {
    const exists = cfg.categories.some((x) => x.id === c.id);
    saveCfg({ ...cfg, categories: exists ? cfg.categories.map((x) => (x.id === c.id ? c : x)) : [...cfg.categories, c] });
    if (!exists && catFromWiz) upDraft({ cat: c.id }); // just created from the wizard → select it
    setCatFromWiz(false);
    flash(exists ? L('Categoría guardada', 'Category saved') : L('Categoría creada', 'Category created'));
  };
  // Create a custom tag/etiqueta (reusable) and select it on the current draft.
  const addTag = (label: string) => {
    if (!cfg.tags.includes(label)) saveCfg({ ...cfg, tags: [...cfg.tags, label] });
    if (!draft.tags.includes(label)) upDraft({ tags: [...draft.tags, label] });
  };
  const deleteCategory = (id: string) => { saveCfg({ ...cfg, categories: cfg.categories.filter((x) => x.id !== id) }); flash(L('Categoría eliminada', 'Category deleted')); };
  const moveCategory = (id: string, dir: -1 | 1) => {
    const i = cfg.categories.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cfg.categories.length) return;
    const next = [...cfg.categories];
    [next[i], next[j]] = [next[j], next[i]];
    saveCfg({ ...cfg, categories: next });
  };
  const toggleCategory = (id: string) =>
    saveCfg({ ...cfg, categories: cfg.categories.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)) });

  const upsertMod = (g: ModGroup) => {
    const exists = cfg.mods.some((x) => x.id === g.id);
    saveCfg({ ...cfg, mods: exists ? cfg.mods.map((x) => (x.id === g.id ? g : x)) : [...cfg.mods, g] });
    flash(exists ? L('Grupo guardado', 'Group saved') : L('Grupo creado', 'Group created'));
  };
  const deleteMod = (id: string) => { saveCfg({ ...cfg, mods: cfg.mods.filter((x) => x.id !== id) }); flash(L('Grupo eliminado', 'Group deleted')); };

  const upsertDaypart = (d: Daypart) => {
    const exists = cfg.dayparts.some((x) => x.id === d.id);
    saveCfg({ ...cfg, dayparts: exists ? cfg.dayparts.map((x) => (x.id === d.id ? d : x)) : [...cfg.dayparts, d] });
    flash(exists ? L('Franja guardada', 'Daypart saved') : L('Franja creada', 'Daypart created'));
  };
  const deleteDaypart = (id: string) => { saveCfg({ ...cfg, dayparts: cfg.dayparts.filter((x) => x.id !== id) }); flash(L('Franja eliminada', 'Daypart deleted')); };
  const toggleDaypart = (id: string) =>
    saveCfg({ ...cfg, dayparts: cfg.dayparts.map((x) => (x.id === id ? { ...x, on: !x.on } : x)) });

  const upsertPromo = (p: Promo) => {
    const exists = cfg.promos.some((x) => x.id === p.id);
    saveCfg({ ...cfg, promos: exists ? cfg.promos.map((x) => (x.id === p.id ? p : x)) : [...cfg.promos, p] });
    flash(exists ? L('Promoción guardada', 'Promotion saved') : L('Promoción creada', 'Promotion created'));
  };
  const deletePromo = (id: string) => { saveCfg({ ...cfg, promos: cfg.promos.filter((x) => x.id !== id) }); flash(L('Promoción eliminada', 'Promotion deleted')); };
  const setAutomation = (k: keyof MenuConfig['automation']) =>
    saveCfg({ ...cfg, automation: { ...cfg.automation, [k]: !cfg.automation[k] } });

  // ============ SUB-TAB CHIPS ============
  const subtabDefs: [typeof subtab, string][] = [
    ['items', L('Platillos', 'Items')],
    ['categories', L('Categorías', 'Categories')],
    ['mods', L('Modificadores', 'Modifiers')],
    ['schedules', L('Horarios', 'Schedules')],
    ['promos', L('Promociones', 'Promos')],
    ['allergens', L('Alérgenos', 'Allergens')],
    ['stock', L('Stock & 86', 'Stock & 86')],
  ];

  // ============ ITEMS ============
  const renderItems = () => {
    let filtered = cat === 'all' ? items : items.filter((i) => i.cat === cat);
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter((i) => (i.name + ' ' + i.es + ' ' + i.en).toLowerCase().includes(q));
    }

    const catFilters: [string, string, number][] = [
      ['all', L('Todos', 'All'), items.length],
      ...cfg.categories.filter((c) => items.some((i) => i.cat === c.id)).map(
        (c) => [c.id, catLabel(c), countIn(c.id)] as [string, string, number],
      ),
    ];

    const smartSets: [LucideIcon, string, number, string][] = [
      [Sparkles, L('Popular', 'Popular'), items.filter((i) => i.popular).length, 'text-amber-ink'],
      [Sparkles, L('Nuevo', 'New'), items.filter((i) => i.isNew).length, 'text-primary-dark'],
      [AlertTriangle, L('Bajo/agotado', 'Low/out'), lowCount + outCount, 'text-amber-ink'],
      [X, L('Ocultos', 'Hidden'), items.length - visibleCount, 'text-muted-2'],
    ];

    const sorted = [...items].sort((a, b) => b.loves - a.loves);
    const maxLoves = sorted[0]?.loves || 1;
    const barCs = ['#4F46E5', '#FF7A9E', '#FFC2D3', '#FFB020', '#00C48C'];
    const top5 = sorted.slice(0, 5);

    const attention = [
      ...items.filter((i) => i.stock === 'out').map((i) => ({
        id: i.id, rose: true, title: `${i.name} — ${L('agotado', 'out of stock')}`,
        sub: L('86’d en tu listado. Los clientes ven “Agotado hoy”.', 'Customers see “Sold out today”.'),
        action: L('Reabastecer', 'Restock'),
      })),
      ...items.filter((i) => i.stock === 'low').map((i) => ({
        id: i.id, rose: false, title: `${i.name} — ${L('bajo stock', 'low stock')}`,
        sub: L('Marca en stock al reabastecer.', 'Mark in-stock once replenished.'),
        action: L('En stock', 'In stock'),
      })),
    ];

    const perfCard = (
      <div className={`${cardCls} p-4`}>
        <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Rendimiento del menú · 30 días', 'Menu performance · 30 days')}</div>
        <div className="mb-3 grid grid-cols-3 gap-2.5">
          {[
            [L('Platillos', 'Items'), String(items.length), `${visibleCount} ${L('visibles', 'visible')}`],
            [L('Precio prom.', 'Avg price'), items.length ? money(items.reduce((n, i) => n + i.price, 0) / items.length) : '—', ''],
            [L('Más amado', 'Most loved'), top5[0]?.name ?? '—', top5[0] ? `${top5[0].loves} ♥` : ''],
          ].map(([lab, val, delta]) => (
            <div key={lab} className="min-w-0 rounded-btn-lg bg-app p-2.5">
              <div className="text-[9px] font-bold text-muted-2">{lab}</div>
              <div className="mt-1 truncate text-[14px] font-extrabold leading-tight text-ink">{val}</div>
              {delta && <div className="mt-0.5 text-[9px] font-extrabold text-green-ink">{delta}</div>}
            </div>
          ))}
        </div>
        <div className={`mb-2 ${sectionLabel}`}>{L('Top 5 por ♥', 'Top 5 by ♥')}</div>
        {top5.map((i, idx) => (
          <div key={i.id} className="flex items-center gap-2.5 py-1.5">
            <span className="w-4 flex-none text-[11px] font-extrabold text-muted-2">{idx + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="mb-1 flex justify-between text-[11.5px] font-bold text-ink">
                <span className="truncate">{i.name}</span>
                <span className="flex-none text-muted-2">{i.loves} ♥ · {money(i.price)}</span>
              </span>
              <span className="block h-[5px] overflow-hidden rounded-full bg-lilac-2">
                <span className="block h-full rounded-full" style={{ width: `${Math.round((i.loves / maxLoves) * 100)}%`, background: barCs[idx] }} />
              </span>
            </span>
          </div>
        ))}
      </div>
    );

    const attnCard = attention.length > 0 && (
      <div className={`${cardCls} p-4`}>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-ink">
            <AlertTriangle size={14} stroke={2.2} className="text-amber-ink" />{L('Requiere atención', 'Needs attention')}
          </span>
          <span className="rounded-md bg-amber-bg px-2 py-0.5 text-[9.5px] font-extrabold text-amber-ink">{lowCount + outCount}</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {attention.map((a) => (
            <div key={a.title} className={`flex items-center gap-2.5 rounded-btn-lg border p-2.5 ${a.rose ? 'border-pink-bg bg-pink-bg/40' : 'border-amber-bg bg-amber-bg/40'}`}>
              <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-white ${a.rose ? 'text-pink-dark' : 'text-amber-ink'}`}>
                {a.rose ? <X size={13} stroke={2.8} /> : <AlertTriangle size={13} stroke={2.4} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[11.5px] font-extrabold ${a.rose ? 'text-pink-dark' : 'text-amber-ink'}`}>{a.title}</span>
                <span className="block text-[10.5px] font-medium leading-snug text-muted-2">{a.sub}</span>
              </span>
              <button
                onClick={() => { patchItem(a.id, { stock: 'in' }); flash(L('Platillo en stock', 'Item back in stock')); }}
                className="tap-y flex-none cursor-pointer self-center rounded-lg border border-line-strong bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-ink"
              >
                {a.action}
              </button>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          {/* menu MODE: display-only vs online orders (not every restaurant takes
              orders — some just showcase dishes + prices). Persisted in menu_config. */}
          <div className={`${cardCls} p-3.5`}>
            <div className="mb-2 flex items-center gap-2 text-[12.5px] font-extrabold text-ink">
              <ShoppingBag size={15} stroke={2.2} className="text-primary-dark" />{L('Modo del menú', 'Menu mode')}
            </div>
            <div className="flex rounded-full bg-lilac-2 p-0.5">
              <button
                onClick={() => { if (cfg.ordering) { saveCfg({ ...cfg, ordering: false }); flash(L('Menú en modo Solo mostrar', 'Menu set to Display only')); } }}
                className={`tap-y flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${!cfg.ordering ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`}
              >
                {L('Solo mostrar', 'Display only')}
              </button>
              <button
                onClick={() => { if (!cfg.ordering) { saveCfg({ ...cfg, ordering: true }); flash(L('Menú con Pedidos en línea', 'Menu set to Online orders')); } }}
                className={`tap-y flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${cfg.ordering ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`}
              >
                {L('Pedidos en línea', 'Online orders')}
              </button>
            </div>
            <p className="mt-2 text-[11px] font-medium leading-relaxed text-muted">
              {cfg.ordering
                ? L('Tu listado muestra el menú y los clientes pueden ordenar en línea (botones Pedir + carrito).', 'Your listing shows the menu and customers can order online (Order buttons + cart).')
                : L('Tu listado muestra el menú y los precios. Los clientes te llaman o visitan para ordenar — sin pedidos en línea.', 'Your listing shows the menu & prices. Customers call or visit to order — no online ordering.')}
            </p>
          </div>

          {/* listing link banner */}
          <div className="flex items-center gap-3 rounded-tile bg-lilac-2 p-3">
            <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-primary"><Link2 size={15} className="text-white" stroke={2.2} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-extrabold text-ink">{L('Este menú alimenta tu listado', 'This menu powers your listing')}</span>
              <span className="block text-[10.5px] font-medium leading-snug text-ink-3">{L('Cada cambio aparece en tu página pública.', 'Every edit appears on your public page.')}</span>
            </span>
          </div>

          {/* search */}
          <div className="flex items-center gap-2.5 rounded-field border border-line-strong bg-white px-3 py-2.5">
            <Search size={15} className="text-muted-2" stroke={2.2} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L('Buscar platillos, ingredientes…', 'Search items, ingredients…')} className="min-w-0 flex-1 border-none bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-muted-2" />
          </div>

          {/* category filter */}
          <ChipRow className="-mx-1 px-1 py-1">
            {catFilters.map(([id, label, n]) => (
              <button key={id} onClick={() => setCat(id)} className={chip(cat === id)}>
                {label}<span className={`ml-1.5 font-extrabold ${cat === id ? 'text-white/80' : 'text-muted-2'}`}>{n}</span>
              </button>
            ))}
          </ChipRow>

          {/* smart sets */}
          <ChipRow className="-mx-1 px-1">
            {smartSets.map(([Icon, label, n, c]) => (
              <span key={label} className="flex flex-none items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink-2">
                <Icon size={12} strokeWidth={2.2} className={c} />{label}<span className="font-extrabold text-ink">{n}</span>
              </span>
            ))}
          </ChipRow>

          <div className="flex items-center justify-between px-0.5">
            <span className="text-[13px] font-extrabold text-ink">
              {cat === 'all' ? L('Todos los platillos', 'All items') : catLabel(catOf(cat))} <span className="text-muted-2">{filtered.length}</span>
            </span>
            <span className="text-[11px] font-semibold text-muted-2">{lowCount}{L(' bajo · ', ' low · ')}{outCount} 86&apos;d</span>
          </div>

          {/* item cards */}
          <div className="grid gap-2.5 md:grid-cols-2">
            {filtered.length === 0 ? (
              <div className={`${cardCls} col-span-full p-9 text-center text-[13px] font-semibold text-muted`}>
                {items.length === 0
                  ? L('Aún no tienes platillos — agrega el primero.', 'No items yet — add your first one.')
                  : L('Ningún platillo coincide con tu búsqueda.', 'No items match your search.')}
              </div>
            ) : filtered.map((i) => {
              const c = catOf(i.cat); const sm = STOCK_META[i.stock];
              const ribbon = i.isNew || i.stock === 'low';
              return (
                <button
                  key={i.id}
                  onClick={() => startEdit(i)}
                  className="flex cursor-pointer gap-3 rounded-tile border border-line bg-white p-3 text-left"
                  style={{ opacity: i.visible ? 1 : 0.6 }}
                >
                  <span className="relative h-[62px] w-[62px] flex-none overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${c.tile})` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {i.imageUrl && <img src={imgUrl(i.imageUrl, ANCHO.tarjeta)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                    {ribbon && (
                      <span className={`absolute left-0 top-0 rounded-br-[7px] px-1.5 py-0.5 text-[8px] font-extrabold text-white ${i.isNew ? 'bg-primary' : 'bg-amber'}`}>
                        {i.isNew ? L('Nuevo', 'New') : L('Bajo', 'Low')}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[13.5px] font-extrabold text-ink">{i.name}</span>
                      <span className="flex-none text-[13.5px] font-extrabold text-ink">{money(i.price)}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[11px] font-medium leading-snug text-muted">{L(i.es, i.en)}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-[18px].5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9.5px] font-extrabold ${sm.badge}`}>
                        <span className={`h-[5px] w-[5px] rounded-full ${sm.dot}`} />{L(sm.es, sm.en)}
                      </span>
                      <span className="rounded-md bg-lilac-2 px-2 py-0.5 text-[9.5px] font-bold text-ink-2">{catLabel(c)}</span>
                      {i.popular && <span className="rounded-md bg-amber-bg px-2 py-0.5 text-[9.5px] font-extrabold text-amber-ink">🔥 {L('Popular', 'Popular')}</span>}
                      {i.diet.map((d) => <span key={d} className="rounded-md bg-green-bg px-1.5 py-0.5 text-[9px] font-extrabold text-green-ink">{d}</span>)}
                      {(i.tags ?? []).map((t) => <span key={t} className="rounded-md bg-lilac-2 px-1.5 py-0.5 text-[9px] font-extrabold text-ink-2">{t}</span>)}
                      {i.mods.length > 0 && <span className="rounded-md bg-lilac px-1.5 py-0.5 text-[9px] font-extrabold text-primary-dark">{i.mods.length} {L('opciones', 'options')}</span>}
                      {!i.visible && <span className="rounded-md bg-lilac-line px-2 py-0.5 text-[9.5px] font-extrabold text-muted-2">{L('Oculto', 'Hidden')}</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <button onClick={startAdd} className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[14px] font-extrabold text-white shadow-cta-sm">
            <Plus size={16} stroke={2.6} />{L('Agregar platillo', 'Add item')}
          </button>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-[74px]">
          {perfCard}
          {attnCard}
        </div>
      </div>
    );
  };

  // ============ CATEGORIES ============
  const renderCategories = () => (
    <div>
      <div className="mb-3 text-[11.5px] font-medium leading-relaxed text-muted">
        {cfg.categories.length}{L(' categorías · toca para editar · reordena con las flechas · activa/desactiva para mostrar', ' categories · tap to edit · reorder with the arrows · toggle to show')}
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {cfg.categories.map((c, i) => {
          const Icon = catIcon(c.icon);
          const n = countIn(c.id);
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-btn-lg border border-line bg-white p-3" style={{ opacity: c.visible ? 1 : 0.6 }}>
              <span className="flex flex-none flex-col">
                <button onClick={() => moveCategory(c.id, -1)} disabled={i === 0} aria-label={L('Subir', 'Move up')} className="cursor-pointer p-0.5 text-muted-2 disabled:opacity-25"><ChevronUp size={13} stroke={2.6} /></button>
                <button onClick={() => moveCategory(c.id, 1)} disabled={i === cfg.categories.length - 1} aria-label={L('Bajar', 'Move down')} className="cursor-pointer p-0.5 text-muted-2 disabled:opacity-25"><ChevronDown size={13} stroke={2.6} /></button>
              </span>
              <button onClick={() => setCatSheet({ open: true, initial: c })} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                <span className="relative flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${c.tile})` }}>
                  <Icon size={18} className="text-white" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-extrabold text-ink">{catLabel(c)}</span>
                    <Pencil size={11} stroke={2.4} className="flex-none text-muted-2" />
                    {!c.visible && <span className="flex-none rounded bg-lilac-line px-1.5 py-0.5 text-[8.5px] font-extrabold text-muted-2">{L('Oculto', 'Hidden')}</span>}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-[18px].5">
                    {c.schedEs && <span className="inline-flex items-center gap-1 rounded bg-lilac-2 px-1.5 py-0.5 text-[9px] font-bold text-ink-2">🕐 {L(c.schedEs, c.schedEn ?? c.schedEs)}</span>}
                    <span className="text-[10px] font-semibold text-muted-2">{n} {n === 1 ? L('platillo', 'item') : L('platillos', 'items')}</span>
                  </span>
                </span>
              </button>
              <Toggle on={c.visible} onClick={() => toggleCategory(c.id)} />
            </div>
          );
        })}
      </div>
      <button onClick={() => setCatSheet({ open: true, initial: null })} className={addBtn}>+ {L('Agregar categoría', 'Add category')}</button>
    </div>
  );

  // ============ MODIFIERS ============
  const renderMods = () => (
    <div>
      <div className="mb-3.5 flex items-center gap-3 rounded-tile bg-lilac-2 p-3">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-primary"><Zap size={15} className="text-white" stroke={2.2} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-extrabold text-ink">{L('Reutilizables en tus platillos', 'Reusable across items')}</span>
          <span className="block text-[10.5px] font-medium leading-snug text-ink-3">{L('Crea un grupo una vez, úsalo en cualquier platillo. Toca uno para editarlo.', 'Build a group once, use it on any item. Tap one to edit it.')}</span>
        </span>
      </div>
      {cfg.mods.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>
          {L('Aún no hay grupos — crea el primero (ej. Tamaño, Salsa, Extras).', 'No groups yet — create your first (e.g. Size, Salsa, Add-ons).')}
        </div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {cfg.mods.map((m) => {
            const used = usedBy(m.id);
            return (
              <button key={m.id} onClick={() => setModSheet({ open: true, initial: m })} className="cursor-pointer rounded-btn-lg border border-line bg-white p-3.5 text-left">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-extrabold text-ink">{L(m.es, m.en)}</span>
                  <Pencil size={11} stroke={2.4} className="flex-none text-muted-2" />
                  {m.required && <span className="flex-none rounded bg-lilac px-1.5 py-0.5 text-[8.5px] font-extrabold text-primary-dark">{L('Obligatorio', 'Required')}</span>}
                  <span className="ml-auto flex-none text-[10px] font-semibold text-muted-2">{m.single ? L('Elige uno', 'Choose one') : L('Elige varios', 'Choose multiple')} · {used} {used === 1 ? L('platillo', 'item') : L('platillos', 'items')}</span>
                </div>
                <div className="flex flex-wrap gap-x-1 gap-y-[18px].5">
                  {m.options.map((o) => (
                    <span key={o.es} className="rounded-lg border border-line bg-app px-2.5 py-1.5 text-[10.5px] font-bold text-ink-soft">
                      {L(o.es, o.en ?? o.es)} <span className={o.price ? 'text-ink' : 'text-muted-2'}>{o.price ? `+$${o.price}` : '+$0'}</span>
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <button onClick={() => setModSheet({ open: true, initial: null })} className={addBtn}>+ {L('Nuevo grupo', 'New group')}</button>
    </div>
  );

  // ============ SCHEDULES ============
  const renderSchedules = () => {
    const startH = 7, totalH = 16;
    const dayLabels = es ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return (
      <div>
        <div className="mb-3 text-[11.5px] font-medium leading-relaxed text-muted">{L('Define qué se muestra y cuándo a lo largo del día. Toca una franja para editarla.', 'Set what shows and when through the day. Tap a daypart to edit it.')}</div>
        {cfg.dayparts.length > 0 && (
          <div className={`mb-3.5 ${cardCls} p-3.5`}>
            <div className="mb-3 text-[12.5px] font-extrabold text-ink">{L('Horario semanal del menú', 'Weekly menu schedule')}</div>
            {dayLabels.map((d, di) => (
              <div key={di} className="mb-1.5 flex items-center gap-2.5">
                <span className="w-[26px] flex-none text-[10.5px] font-bold text-ink-2">{d}</span>
                <span className="relative h-[18px] flex-1 overflow-hidden rounded-md bg-app">
                  {cfg.dayparts.map((p, pi) => (p.days[di] && p.on ? (
                    <span key={p.id} className="absolute h-[7px] rounded-[3px] opacity-90" style={{ top: pi % 2 === 0 ? 2 : 9, left: `${Math.max(0, ((p.start - startH) / totalH) * 100)}%`, width: `${Math.min(100, ((p.end - p.start) / totalH) * 100)}%`, background: p.color }} />
                  ) : null))}
                </span>
              </div>
            ))}
            <div className="mt-2.5 flex flex-wrap gap-3 border-t border-hair pt-2.5">
              {cfg.dayparts.filter((p) => p.on).slice(0, 4).map((p) => (
                <span key={p.id} className="flex items-center gap-1.5 text-[9.5px] font-bold text-ink-2">
                  <span className="h-2 w-2 rounded-[3px]" style={{ background: p.color }} />{L(p.es, p.en).split(' · ')[0]}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mb-2.5 px-0.5 text-[12px] font-extrabold text-ink">{L('Franjas del día', 'Dayparts')}</div>
        {cfg.dayparts.length === 0 ? (
          <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>
            {L('Aún no hay franjas — crea “Desayunos”, “Comida”, “Cena”…', 'No dayparts yet — create “Breakfast”, “Lunch”, “Dinner”…')}
          </div>
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2">
            {cfg.dayparts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-tile border border-line bg-white p-3" style={{ opacity: p.on ? 1 : 0.6 }}>
                <button onClick={() => setDpSheet({ open: true, initial: p })} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px]" style={{ background: p.bg }}><Clock size={16} style={{ color: p.color }} stroke={2.2} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-extrabold text-ink">{L(p.es, p.en)}</span>
                      <Pencil size={11} stroke={2.4} className="flex-none text-muted-2" />
                    </span>
                    <span className="block text-[10.5px] font-medium text-muted-2">{hourLabel(p.start)}–{hourLabel(p.end)} · {p.days.filter(Boolean).length === 7 ? L('todos los días', 'every day') : `${p.days.filter(Boolean).length} ${L('días', 'days')}`}</span>
                  </span>
                </button>
                <Toggle on={p.on} onClick={() => toggleDaypart(p.id)} />
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setDpSheet({ open: true, initial: null })} className={addBtn}>+ {L('Nueva franja', 'New daypart')}</button>
      </div>
    );
  };

  // ============ PROMOTIONS ============
  const renderPromos = () => {
    const active = cfg.promos.filter((p) => p.status === 'active').length;
    const stats: [string, string, string?][] = [
      [L('Activas', 'Active'), String(active)],
      [L('Pausadas', 'Paused'), String(cfg.promos.filter((p) => p.status === 'paused').length)],
      [L('Programadas', 'Scheduled'), String(cfg.promos.filter((p) => p.status === 'scheduled').length)],
    ];
    const statusMeta = (s: Promo['status']) =>
      s === 'active' ? { lab: L('Activa', 'Active'), cls: 'bg-green-bg text-green-ink' }
        : s === 'paused' ? { lab: L('Pausada', 'Paused'), cls: 'bg-lilac-line text-muted-2' }
          : { lab: L('Programada', 'Scheduled'), cls: 'bg-amber-bg text-amber-ink' };
    const typeMeta = (t: PromoType) => PROMO_TYPES.find((x) => x.type === t) ?? PROMO_TYPES[0];
    const promoTile = (t: PromoType) =>
      t === 'percent' ? '#FAD9BD 0 8px,#FAD9BD 8px 16px' : t === 'combo' ? '#E6FAF3 0 8px,#CDE9C9 8px 16px' : t === 'bogo' ? '#FFEBDF 0 8px,#FED6C2 8px 16px' : '#FED2DF 0 8px,#FED2DF 8px 16px';

    return (
      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3.5 grid grid-cols-3 gap-2.5">
            {stats.map(([lab, val]) => (
              <div key={lab} className={`${cardCls} p-3`}>
                <div className="text-[9px] font-bold text-muted-2">{lab}</div>
                <div className="mt-0.5 text-[19px] font-extrabold text-ink">{val}</div>
              </div>
            ))}
          </div>
          <div className={`mb-2.5 ${sectionLabel}`}>{L('Tus promociones · toca para editar', 'Your promotions · tap to edit')}</div>
          {cfg.promos.length === 0 ? (
            <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>
              {L('Aún no hay promociones — crea la primera con los tipos de al lado.', 'No promotions yet — create your first with the types beside.')}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {cfg.promos.map((p) => {
                const st = statusMeta(p.status); const tm = typeMeta(p.type);
                return (
                  <div key={p.id} className="overflow-hidden rounded-tile border border-line bg-white" style={{ opacity: p.status === 'paused' ? 0.7 : 1 }}>
                    <button onClick={() => setPromoSheet({ open: true, initial: p, createType: p.type })} className="block w-full cursor-pointer text-left">
                      <div className="relative h-16" style={{ background: `repeating-linear-gradient(135deg,${promoTile(p.type)})` }}>
                        <span className="absolute left-2.5 top-2.5 rounded-md bg-white/90 px-2 py-0.5 text-[9px] font-extrabold" style={{ color: tm.c }}>{L(tm.es, tm.en)}</span>
                        <span className={`absolute right-2.5 top-2.5 rounded-md px-2 py-0.5 text-[9px] font-extrabold ${st.cls}`}>{st.lab}</span>
                      </div>
                      <div className="p-3 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13.5px] font-extrabold text-ink">{L(p.es, p.en)}</span>
                          <Pencil size={11} stroke={2.4} className="flex-none text-muted-2" />
                        </div>
                        <div className="mt-1 text-[11px] font-medium leading-snug text-ink-3">
                          {L(p.descEs, p.descEn) || (p.type === 'percent' && p.value ? `${p.value}% off` : p.type === 'combo' && p.value ? `Combo ${money(p.value)}` : p.type === 'happy' && p.timeStart != null ? `${hourLabel(p.timeStart)}–${hourLabel(p.timeEnd ?? p.timeStart)}` : '')}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
                      <span className="text-[9.5px] font-semibold text-muted-2">
                        {p.status === 'scheduled' && p.startDate ? `${L('Inicia', 'Starts')} ${p.startDate}` : p.days && !p.days.every(Boolean) ? `${p.days.filter(Boolean).length} ${p.days.filter(Boolean).length === 1 ? L('día/sem', 'day/wk') : L('días/sem', 'days/wk')}` : L('Todos los días', 'Every day')}
                      </span>
                      <button
                        onClick={() => upsertPromo({ ...p, status: p.status === 'active' ? 'paused' : 'active', startDate: undefined })}
                        className={`tap-y cursor-pointer rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold ${p.status === 'active' ? 'bg-lilac-2 text-ink-2' : 'bg-primary text-white shadow-cta-sm'}`}
                      >
                        {p.status === 'active' ? L('Pausar', 'Pause') : L('Activar', 'Activate')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="xl:sticky xl:top-[74px]">
          <div className={`${cardCls} p-4`}>
            <div className={`mb-2.5 ${sectionLabel}`}>{L('Crear promoción', 'Create a promotion')}</div>
            <div className="flex flex-col gap-2.5">
              {PROMO_TYPES.map((t) => (
                <button key={t.type} onClick={() => setPromoSheet({ open: true, initial: null, createType: t.type })} className="flex cursor-pointer items-center gap-3 rounded-btn-lg border border-line bg-white p-2.5 text-left">
                  <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px]" style={{ background: t.bg }}><t.Icon size={16} style={{ color: t.c }} strokeWidth={2.2} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-extrabold text-ink">{L(t.es, t.en)}</span>
                    <span className="block text-[9.5px] font-medium leading-snug text-muted-2">{L(t.subEs, t.subEn)}</span>
                  </span>
                  <Plus size={14} stroke={2.6} className="flex-none text-primary-dark" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ ALLERGENS (real matrix — tap a cell to cycle + persist) ======
  const renderAllergens = () => {
    const cols = es ? ALLERGENS_ES : ALLERGENS_EN;
    const cycle = (it: Item, ci: number) => {
      const na = [...it.allergens];
      na[ci] = na[ci] === 0 ? 2 : na[ci] === 2 ? 1 : 0; // none → contains → may → none
      patchItem(it.id, { allergens: na });
    };
    const cell = (v: number) =>
      v === 2 ? <span className="flex h-5 w-5 items-center justify-center rounded-md bg-pink-bg text-[11px] font-extrabold text-pink-dark">✓</span>
        : v === 1 ? <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-bg text-[12px] font-extrabold text-amber-ink">~</span>
          : <span className="h-1.5 w-1.5 rounded-full bg-lilac-line" />;
    return (
      <div>
        <div className="mb-3.5 flex items-center gap-3 rounded-tile bg-lilac-2 p-3">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-primary"><ShieldCheck size={15} className="text-white" stroke={2.2} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-extrabold text-ink">{L('Los alérgenos se muestran en tu menú público', 'Allergens appear on your public menu')}</span>
            <span className="block text-[10.5px] font-medium leading-snug text-ink-3">{L('Toca una celda para marcar: contiene → puede contener → libre.', 'Tap a cell to mark: contains → may contain → free.')}</span>
          </span>
        </div>
        <div className="mb-3 flex gap-4 px-0.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink-2"><span className="flex h-[18px] w-[18px] items-center justify-center rounded-md bg-pink-bg text-[10px] font-extrabold text-pink-dark">✓</span>{L('Contiene', 'Contains')}</span>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink-2"><span className="flex h-[18px] w-[18px] items-center justify-center rounded-md bg-amber-bg text-[11px] font-extrabold text-amber-ink">~</span>{L('Puede contener', 'May contain')}</span>
        </div>
        {items.length === 0 ? (
          <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Agrega platillos para marcar sus alérgenos.', 'Add items to mark their allergens.')}</div>
        ) : (
          <div className={`min-w-0 overflow-x-auto ${cardCls}`}>
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[1.6fr_repeat(7,1fr)] border-b border-hair bg-app px-3 py-2.5">
                <span className={sectionLabel}>{L('Platillo', 'Item')}</span>
                {cols.map((c) => <span key={c} className="text-center text-[8.5px] font-extrabold uppercase text-muted-2">{c}</span>)}
              </div>
              {items.map((r, ri) => (
                <div key={r.id} className={`grid grid-cols-[1.6fr_repeat(7,1fr)] items-center px-3 py-2 ${ri < items.length - 1 ? 'border-b border-hair' : ''}`}>
                  <div className="min-w-0 pr-2">
                    <div className="truncate text-[12px] font-bold text-ink">{r.name}</div>
                    <div className="truncate text-[9.5px] font-medium text-muted-2">{catLabel(catOf(r.cat))}</div>
                  </div>
                  {r.allergens.map((v, ci2) => (
                    <button key={ci2} onClick={() => cycle(r, ci2)} aria-label={`${r.name} ${cols[ci2]}`} className="flex min-h-[34px] cursor-pointer items-center justify-center">
                      {cell(v)}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============ STOCK (86) ============
  const renderStock = () => {
    const stock86 = items.filter((i) => i.stock === 'out');
    const stockLow = items.filter((i) => i.stock === 'low');
    const setStock = (id: number, s: Stock) => { patchItem(id, { stock: s }); flash(s === 'in' ? L('Platillo reabastecido', 'Item restocked') : L('Platillo 86’d', 'Item 86’d')); };
    const rules: { key: keyof MenuConfig['automation']; es: string; en: string; sEs: string; sEn: string }[] = [
      { key: 'auto86', es: 'Auto-86 al llegar a cero', en: 'Auto-86 at zero', sEs: 'Oculta del menú automáticamente.', sEn: 'Hide from menu automatically.' },
      { key: 'notifyLow', es: 'Avisar al personal en bajo stock', en: 'Notify staff at low stock', sEs: 'Alerta a la cocina bajo el umbral.', sEn: 'Alert the kitchen below threshold.' },
      { key: 'resetDaily', es: 'Reiniciar conteo diario a las 5 AM', en: 'Reset counts daily at 5 AM', sEs: 'Los límites se recargan cada mañana.', sEn: 'Daily limits refill each morning.' },
      { key: 'backorders', es: 'Permitir pedidos por adelantado', en: 'Allow back-orders', sEs: 'Pedir agotados para después.', sEn: 'Order out-of-stock for later.' },
    ];
    const inStock = items.filter((i) => i.stock === 'in').length;
    return (
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-3 gap-2.5">
            <div className={`${cardCls} p-3`}><div className="text-[9px] font-bold text-muted-2">{L('En stock', 'In stock')}</div><div className="mt-0.5 text-[19px] font-extrabold text-ink">{inStock}</div><div className="text-[9px] font-extrabold text-green-ink">✓ {L('Disponible', 'Available')}</div></div>
            <div className="rounded-card-sm border border-amber-bg bg-amber-bg/40 p-3"><div className="text-[9px] font-bold text-amber-ink">{L('Bajo', 'Low')}</div><div className="mt-0.5 text-[19px] font-extrabold text-ink">{lowCount}</div><div className="text-[9px] font-extrabold text-amber-ink">⚠ {L('Reabastecer', 'Restock')}</div></div>
            <div className="rounded-card-sm border border-pink-bg bg-pink-bg/40 p-3"><div className="text-[9px] font-bold text-pink-dark">86&apos;d</div><div className="mt-0.5 text-[19px] font-extrabold text-ink">{outCount}</div><div className="text-[9px] font-extrabold text-pink-dark">✕ {L('Oculto', 'Hidden')}</div></div>
          </div>

          {/* 86'd list */}
          <div className="overflow-hidden rounded-tile border border-pink-bg bg-white">
            <div className="flex items-center gap-1.5 bg-pink-bg/50 px-3.5 py-2.5">
              <X size={14} className="text-pink-dark" stroke={2.6} />
              <span className="text-[12px] font-extrabold text-pink-dark">{L('86’d ahora · oculto del menú', "Currently 86'd · hidden")}</span>
            </div>
            {stock86.length === 0 ? (
              <div className="px-3.5 py-5 text-center text-[12px] font-semibold text-muted">{L('Nada 86’d ahora mismo.', 'Nothing 86’d right now.')}</div>
            ) : stock86.map((s) => {
              const c = catOf(s.cat);
              return (
                <div key={s.id} className="flex items-center gap-3 border-t border-hair px-3.5 py-2.5">
                  <span className="h-10 w-10 flex-none rounded-[10px]" style={{ background: `repeating-linear-gradient(135deg,${c.tile})` }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-extrabold text-ink">{s.name}</span>
                    <span className="block text-[10px] font-medium text-pink-dark">{L('Oculto del menú público', 'Hidden from the public menu')}</span>
                  </span>
                  <button onClick={() => setStock(s.id, 'in')} className="tap-y flex-none cursor-pointer self-center rounded-[9px] bg-primary px-3 py-2 text-[10px] font-extrabold text-white">{L('Reabastecer', 'Restock')}</button>
                </div>
              );
            })}
          </div>

          {/* in-stock items you can 86 */}
          <div>
            <div className="mb-2 px-0.5 text-[12px] font-extrabold text-ink">{L('Disponibles · toca para 86', 'Available · tap to 86')}</div>
            <div className="overflow-hidden rounded-tile border border-line bg-white">
              {items.filter((i) => i.stock !== 'out').length === 0 ? (
                <div className="px-3.5 py-5 text-center text-[12px] font-semibold text-muted">{L('Sin platillos disponibles.', 'No available items.')}</div>
              ) : items.filter((i) => i.stock !== 'out').map((s, i, a) => {
                const c = catOf(s.cat);
                return (
                  <div key={s.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}>
                    <span className="h-9 w-9 flex-none rounded-[10px]" style={{ background: `repeating-linear-gradient(135deg,${c.tile})` }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-extrabold text-ink">{s.name}</span>
                      <span className={`block text-[10px] font-semibold ${s.stock === 'low' ? 'text-amber-ink' : 'text-muted-2'}`}>{s.stock === 'low' ? L('Bajo stock', 'Low stock') : L('En stock', 'In stock')}</span>
                    </span>
                    {s.stock === 'low' && (
                      <button onClick={() => setStock(s.id, 'in')} className="tap-y flex-none cursor-pointer rounded-[9px] border border-line-strong bg-white px-3 py-2 text-[10px] font-extrabold text-ink">{L('En stock', 'In stock')}</button>
                    )}
                    <button onClick={() => setStock(s.id, s.stock === 'low' ? 'out' : 'low')} className="tap-y flex-none cursor-pointer rounded-[9px] border border-amber-bg bg-white px-3 py-2 text-[10px] font-extrabold text-amber-ink">{s.stock === 'low' ? '86' : L('Bajo', 'Low')}</button>
                    {s.stock !== 'low' && (
                      <button onClick={() => setStock(s.id, 'out')} className="tap-y flex-none cursor-pointer rounded-[9px] border border-pink-bg bg-white px-3 py-2 text-[10px] font-extrabold text-pink-dark">86</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* low stock */}
          <div>
            <div className="mb-2 px-0.5 text-[12px] font-extrabold text-ink">{L('Bajo stock', 'Low stock')}</div>
            <div className="overflow-hidden rounded-tile border border-line bg-white">
              {stockLow.length === 0 ? (
                <div className="px-3.5 py-5 text-center text-[12px] font-semibold text-muted">{L('Nada en bajo stock.', 'Nothing low right now.')}</div>
              ) : stockLow.map((s, i, a) => {
                const c = catOf(s.cat);
                return (
                  <div key={s.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}>
                    <span className="h-10 w-10 flex-none rounded-[10px]" style={{ background: `repeating-linear-gradient(135deg,${c.tile})` }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-extrabold text-ink">{s.name}</span>
                      <span className="block text-[10px] font-semibold text-amber-ink">{s.dailyLimit ? `${L('Límite diario', 'Daily limit')} ${s.dailyLimit}` : L('Marcado bajo por el equipo', 'Marked low by the team')}</span>
                    </span>
                    <button onClick={() => setStock(s.id, 'in')} className="tap-y flex-none cursor-pointer rounded-[9px] bg-primary px-3 py-2 text-[10px] font-extrabold text-white">{L('En stock', 'In stock')}</button>
                  </div>
                );
              })}
            </div>
          </div>
          {/* automation (persisted in menu_config) */}
          <div>
            <div className="mb-2 px-0.5 text-[12px] font-extrabold text-ink">{L('Automatización', 'Automation')}</div>
            <div className="rounded-tile border border-line bg-white px-3.5">
              {rules.map((r, i, a) => (
                <div key={r.key} className={`flex items-center gap-3 py-3 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-bold text-ink">{L(r.es, r.en)}</span>
                    <span className="block text-[10px] font-medium leading-snug text-muted-2">{L(r.sEs, r.sEn)}</span>
                  </span>
                  <Toggle on={cfg.automation[r.key]} onClick={() => setAutomation(r.key)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ WIZARD ============
  const draftCat = catOf(draft.cat);
  const chanDefs: [string, string, LucideIcon][] = [
    ['dinein', L('Mostrador', 'Dine-in'), Utensils],
    ['pickup', L('Recoger', 'Pickup'), ShoppingBag],
    ['delivery', L('Entrega', 'Delivery'), Truck],
    ['catering', 'Catering', Gift],
  ];
  const dietDefs = [L('Vegetariano', 'Vegetarian'), L('Vegano', 'Vegan'), L('Sin gluten', 'Gluten-free'), L('Sin lácteos', 'Dairy-free'), 'Halal', L('Picante', 'Spicy')];
  const algNames = es ? ALLERGENS_ES : ALLERGENS_EN;
  const dayLabels = es ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const ready = !!draft.name && !!draft.price;

  const wizStepDefs = [
    L('Detalles', 'Details'), L('Precio', 'Pricing'), L('Modif.', 'Mods'),
    L('Dieta', 'Dietary'), L('Stock', 'Stock'), L('Revisar', 'Review'),
  ];
  const wizTitle = [
    L('Detalles del platillo', 'Item details'), L('Precio y canales', 'Pricing & channels'),
    L('Opciones y modificadores', 'Options & modifiers'), L('Dieta y alérgenos', 'Dietary & allergens'),
    L('Stock y disponibilidad', 'Stock & availability'), L('Revisar y publicar', 'Review & publish'),
  ][wizStep];

  // Shared field mapping from the wizard draft (create + edit both use it).
  const draftFields = () => ({
    name: draft.name.trim() || L('Nuevo platillo', 'New item'),
    cat: draft.cat,
    price: Number(draft.price) || 0,
    compareAt: Number(draft.compareAt) || undefined,
    es: draft.descEs || draft.descEn,
    en: draft.descEn || draft.descEs,
    diet: draft.diet,
    allergens: draft.allergens,
    mods: cfg.mods.filter((m) => draft.mods[m.id]).map((m) => m.id),
    imageUrl: draft.photoUrl || undefined,
    stock: draft.stock,
    popular: !!draft.flags.popular,
    isNew: !!draft.flags.isNew,
    dailyLimit: draft.dailyLimit || undefined,
    tags: draft.tags,
    extra: { channels: draft.channels, sched: draft.sched, days: draft.days, rules: draft.rules, featured: !!draft.flags.featured },
  });

  // Create a brand-new item from the wizard draft (adds to the list + persists).
  const addFromDraft = () => {
    const it: Item = {
      id: nextId(), ...draftFields(), loves: 0,
      visible: draft.publishMode === 'draft' ? false : draft.visible,
    };
    setItems((xs) => [it, ...xs]);
    persistNew(it);
    clearDraft(draftKey);
  };

  // Save the wizard draft back onto the item being edited (keeps dbId + loves).
  const saveFromDraft = () => {
    if (editingId == null) return;
    setItems((xs) => {
      const next = xs.map((i) => (i.id === editingId ? { ...i, ...draftFields(), visible: draft.visible } : i));
      persistPatch(next.find((i) => i.id === editingId));
      return next;
    });
  };

  // From the edit wizard: duplicate the item (with current draft edits) as new,
  // or delete the one being edited. Both return to the list.
  const duplicateFromDraft = () => {
    const copy: Item = {
      id: nextId(), ...draftFields(),
      name: `${draft.name.trim() || L('Nuevo platillo', 'New item')} ${L('(copia)', '(copy)')}`,
      loves: 0, isNew: false, popular: false, visible: draft.visible,
    };
    setItems((xs) => [copy, ...xs]);
    persistNew(copy);
    setView('module'); setEditingId(null);
    flash(L('Platillo duplicado', 'Item duplicated'));
  };
  const deleteEditing = () => {
    if (editingId == null) return;
    const target = items.find((i) => i.id === editingId);
    setItems((xs) => xs.filter((i) => i.id !== editingId));
    if (persistable && target?.dbId) deleteBizItem(target.dbId);
    setView('module'); setEditingId(null);
    flash(L('Platillo eliminado', 'Item deleted'));
  };

  const wizNext = () => {
    if (wizStep >= wizStepDefs.length - 1) {
      if (editingId != null) { saveFromDraft(); setView('module'); flash(L('Cambios guardados', 'Changes saved')); }
      else { addFromDraft(); setView('success'); }
      return;
    }
    const n = wizStep + 1; setWizStep(n); setWizMax((m) => Math.max(m, n));
  };
  const wizBack = () => { if (wizStep === 0) { setView('module'); setEditingId(null); return; } setWizStep((s) => s - 1); };
  const nextGated =
    wizStep === 0 ? !!draft.name.trim() :
      wizStep === 1 ? !!draft.price && chanDefs.some((c) => draft.channels[c[0]]) :
        true;

  const previewCard = (
    <div className="overflow-hidden rounded-tile border border-line bg-white">
      <div className="relative h-[104px]" style={{ background: `repeating-linear-gradient(135deg,${draftCat.tile})` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {draft.photoUrl && <img src={imgUrl(draft.photoUrl, ANCHO.tarjeta)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          {draft.flags.isNew && <span className="rounded-md bg-lilac px-2 py-0.5 text-[9px] font-extrabold text-primary-dark">{L('Nuevo', 'New')}</span>}
          {draft.flags.popular && <span className="rounded-md bg-amber-bg px-2 py-0.5 text-[9px] font-extrabold text-amber-ink">{L('Popular', 'Popular')}</span>}
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2.5">
          <span className={`text-[15px] font-extrabold ${draft.name ? 'text-ink' : 'text-muted-2'}`}>{draft.name || L('Nombre del platillo', 'Item name')}</span>
          <span className="flex-none text-[15px] font-extrabold text-ink">{draft.price ? '$' + draft.price : '$0.00'}</span>
        </div>
        <div className="mt-1 text-[11.5px] font-medium leading-relaxed text-ink-3">{(es ? draft.descEs : draft.descEn) || L('La descripción aparece aquí…', 'Description appears here…')}</div>
      </div>
    </div>
  );

  const renderWizardStep = () => {
    if (wizStep === 0) return (
      <div className="flex flex-col gap-3.5">
        <div><div className={fieldLabel}>{L('Nombre del platillo', 'Item name')} *</div><input value={draft.name} onChange={(e) => upDraft({ name: e.target.value })} placeholder={L('Ej. Margherita al horno', 'e.g. Wood-fired Margherita')} className={inputCls} /></div>
        <div><div className={fieldLabel}>{L('Descripción', 'Description')} <span className="font-semibold text-muted">· {es ? 'ES' : 'EN'}</span></div><textarea value={es ? draft.descEs : draft.descEn} onChange={(e) => upDraft(es ? { descEs: e.target.value } : { descEn: e.target.value })} placeholder={L('Ingredientes clave, qué lo hace especial…', 'Key ingredients, what makes it special…')} rows={3} className={`${inputCls} resize-none`} /></div>
        <div>
          <div className={fieldLabel}>{L('Categoría', 'Category')} *</div>
          <ChipRow className="-mx-1 px-1">
            {cfg.categories.filter((c) => c.visible || c.id === draft.cat).map((c) => (
              <button key={c.id} onClick={() => upDraft({ cat: c.id })} className={chip(draft.cat === c.id)}>{catLabel(c)}</button>
            ))}
            <button onClick={() => { setCatFromWiz(true); setCatSheet({ open: true, initial: null }); }} className="tap-y flex-none cursor-pointer rounded-full border-[1.5px] border-dashed border-lilac-line px-3.5 py-2 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar', 'Add')}</button>
          </ChipRow>
        </div>
        <div>
          <div className={fieldLabel}>{L('Etiquetas', 'Flags')}</div>
          <div className="flex flex-wrap gap-x-2 gap-y-[18px]">
            {([['isNew', L('Nuevo', 'New')], ['popular', L('Popular', 'Popular')], ['featured', L('Destacado', 'Featured')]] as [string, string][]).map(([k, lab]) => (
              <button key={k} onClick={() => upDraft({ flags: { ...draft.flags, [k]: !draft.flags[k] } })} className={chip(!!draft.flags[k])}>{lab}</button>
            ))}
            {cfg.tags.map((t) => { const on = draft.tags.includes(t); return <button key={t} onClick={() => upDraft({ tags: on ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] })} className={chip(on)}>{t}</button>; })}
            <button onClick={() => setTagSheet(true)} className="tap-y cursor-pointer rounded-full border-[1.5px] border-dashed border-lilac-line px-3.5 py-2 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar', 'Add')}</button>
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Foto', 'Photo')}</div>
          {draft.photoUrl ? (
            <div className="relative h-[150px] overflow-hidden rounded-tile border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl(draft.photoUrl, ANCHO.tarjeta)} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => wizFileRef.current?.click()} disabled={photoBusy} className="absolute bottom-2 right-2 cursor-pointer rounded-[9px] bg-white/90 px-2.5 py-1.5 text-[11px] font-extrabold text-ink shadow-float">
                {photoBusy ? L('Subiendo…', 'Uploading…') : L('Cambiar', 'Change')}
              </button>
              <button type="button" onClick={() => upDraft({ photoUrl: '' })} aria-label={L('Quitar foto', 'Remove photo')} className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-pink-dark shadow-float">
                <Trash2 size={14} stroke={2.2} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => wizFileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pickPhoto(e.dataTransfer.files?.[0], (url) => upDraft({ photoUrl: url })); }}
              disabled={photoBusy}
              className="relative flex h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-tile border-[1.5px] border-dashed border-lilac-line bg-app disabled:opacity-60"
            >
              {photoBusy ? (
                <>
                  <Loader2 size={20} className="animate-spin text-primary" stroke={2.2} />
                  <span className="text-[12px] font-bold text-ink-soft">{L('Comprimiendo y subiendo…', 'Compressing & uploading…')}</span>
                </>
              ) : (
                <>
                  <Upload size={20} className="text-primary" stroke={2} />
                  <span className="text-[12px] font-bold text-ink-soft">{L('Arrastra o toca para subir', 'Drag or tap to upload')}</span>
                  <span className="text-[10px] font-medium text-muted-2">{L('JPG o PNG · 4:3 ideal · se comprime sola', 'JPG or PNG · 4:3 best · auto-compressed')}</span>
                </>
              )}
            </button>
          )}
          <input ref={wizFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; pickPhoto(f, (url) => upDraft({ photoUrl: url })); }} />
        </div>
      </div>
    );

    if (wizStep === 1) return (
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Precio', 'Price')} *</div><div className="flex items-center rounded-field border-[1.5px] border-lilac-line px-3 focus-within:border-primary"><span className="text-[13px] font-bold text-muted-2">$</span><input value={draft.price} onChange={(e) => upDraft({ price: e.target.value })} placeholder="0.00" inputMode="decimal" className="min-w-0 flex-1 border-none bg-transparent px-2 py-2.5 text-[13px] font-semibold text-ink outline-none" /></div></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Precio anterior', 'Compare-at')}</div><div className="flex items-center rounded-field border-[1.5px] border-lilac-line px-3 focus-within:border-primary"><span className="text-[13px] font-bold text-muted-2">$</span><input value={draft.compareAt} onChange={(e) => upDraft({ compareAt: e.target.value })} placeholder="—" inputMode="decimal" className="min-w-0 flex-1 border-none bg-transparent px-2 py-2.5 text-[13px] font-semibold text-ink outline-none" /></div></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Se vende en', 'Sold in')}</div>
          <div className="grid grid-cols-2 gap-2">
            {chanDefs.map(([k, lab, Icon]) => {
              const on = draft.channels[k];
              return (
                <button key={k} onClick={() => upDraft({ channels: { ...draft.channels, [k]: !on } })} className={`tap-y flex items-center gap-2 rounded-field border-[1.5px] px-3 py-2.5 ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                  <span className={`flex h-4 w-4 flex-none items-center justify-center rounded ${on ? 'bg-primary' : 'bg-lilac-line'}`}>{on && <Check size={10} className="text-white" stroke={3.4} />}</span>
                  <Icon size={15} strokeWidth={2} className={on ? 'text-primary-dark' : 'text-muted-2'} />
                  <span className="text-[12px] font-bold text-ink">{lab}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Horario', 'Schedule')}</div>
          <ChipRow className="-mx-1 px-1">
            {[
              ['all-day', L('Todo el día', 'All day')] as [string, string],
              ...cfg.dayparts.map((p) => [p.id, L(p.es, p.en).split(' · ')[0]] as [string, string]),
            ].map(([k, lab]) => (
              <button key={k} onClick={() => upDraft({ sched: k })} className={chip(draft.sched === k)}>{lab}</button>
            ))}
          </ChipRow>
        </div>
        <div>
          <div className={fieldLabel}>{L('Días disponibles', 'Days available')}</div>
          <div className="flex gap-1.5">
            {dayLabels.map((d, i) => (
              <button key={i} onClick={() => { const nd = [...draft.days]; nd[i] = nd[i] ? 0 : 1; upDraft({ days: nd }); }} className={`h-[34px] w-[34px] flex-none cursor-pointer rounded-[9px] text-[11px] font-extrabold ${draft.days[i] ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`}>{d}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-field bg-green-bg px-3 py-2.5">
          <Info size={15} className="flex-none text-green-ink" stroke={2} />
          <div className="text-[10.5px] font-medium leading-snug text-green-ink">
            {cfg.ordering
              ? L('Los pedidos por Entrega incluyen 12% de comisión.', 'Delivery orders include a 12% partner fee.')
              : L('Tu menú está en modo Solo mostrar — estos canales son informativos.', 'Your menu is in Display-only mode — these channels are informational.')}
          </div>
        </div>
      </div>
    );

    if (wizStep === 2) return (
      <div className="flex flex-col gap-2.5">
        <div className="text-[11px] font-medium leading-relaxed text-muted">{L('Adjunta grupos reutilizables: tamaños, extras, opciones. Opcional.', 'Attach reusable groups: sizes, add-ons, choices. Optional.')}</div>
        {cfg.mods.length === 0 && (
          <div className="rounded-field border-[1.5px] border-dashed border-lilac-line bg-app px-4 py-5 text-center text-[12px] font-semibold text-muted">
            {L('Aún no tienes grupos de opciones.', "You don't have option groups yet.")}
          </div>
        )}
        {cfg.mods.map((m) => {
          const on = !!draft.mods[m.id];
          return (
            <button key={m.id} onClick={() => upDraft({ mods: { ...draft.mods, [m.id]: !on } })} className={`flex w-full items-center gap-3 rounded-btn-lg border-[1.5px] p-3 ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
              <span className={`flex h-4 w-4 flex-none items-center justify-center rounded ${on ? 'bg-primary' : 'bg-lilac-line'}`}>{on && <Check size={10} className="text-white" stroke={3.4} />}</span>
              <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-lilac"><Zap size={15} className="text-primary-dark" stroke={2.2} /></span>
              <span className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-extrabold text-ink">{L(m.es, m.en)}</span>
                  {m.required && <span className="rounded bg-lilac px-1.5 py-px text-[8px] font-extrabold text-primary-dark">{L('Obligatorio', 'Required')}</span>}
                </span>
                <span className="mt-0.5 block text-[10px] font-medium text-muted-2">
                  {m.single ? L('Elige uno', 'Choose one') : L('Elige varios', 'Choose multiple')} · {m.options.length} {L('opciones', 'options')}
                </span>
              </span>
            </button>
          );
        })}
        <button onClick={() => setModSheet({ open: true, initial: null })} className="mt-1 w-full cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-app py-3 text-[12px] font-extrabold text-primary-dark">+ {L('Nuevo grupo', 'New group')}</button>
      </div>
    );

    if (wizStep === 3) return (
      <div className="flex flex-col gap-3.5">
        <div>
          <div className={fieldLabel}>{L('Etiquetas dietéticas', 'Dietary tags')}</div>
          <div className="flex flex-wrap gap-x-2 gap-y-[18px]">
            {dietDefs.map((d) => {
              const has = draft.diet.includes(d);
              return <button key={d} onClick={() => upDraft({ diet: has ? draft.diet.filter((x) => x !== d) : [...draft.diet, d] })} className={chip(has)}>{d}</button>;
            })}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Alérgenos · toca para ciclar', 'Allergens · tap to cycle')}</div>
          <div className="grid grid-cols-2 gap-2">
            {algNames.map((a, i) => {
              const v = draft.allergens[i];
              const st = v === 2 ? L('Contiene', 'Contains') : v === 1 ? L('Puede contener', 'May contain') : L('Libre de', 'Free of');
              const stC = v === 2 ? 'text-pink-dark' : v === 1 ? 'text-amber-ink' : 'text-muted-2';
              const swCls = v === 2 ? 'bg-pink-bg text-pink-dark' : v === 1 ? 'bg-amber-bg text-amber-ink' : 'bg-lilac-2 text-muted-2';
              const border = v === 2 ? 'border-pink-bg' : v === 1 ? 'border-amber-bg' : 'border-lilac-line';
              return (
                <button key={a} onClick={() => { const na = [...draft.allergens]; na[i] = na[i] === 0 ? 2 : na[i] === 2 ? 1 : 0; upDraft({ allergens: na }); }} className={`tap-y flex items-center gap-2.5 rounded-field border-[1.5px] bg-white px-3 py-2.5 ${border}`}>
                  <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-md text-[12px] font-extrabold ${swCls}`}>{v === 2 ? '✓' : v === 1 ? '~' : '·'}</span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[11.5px] font-extrabold text-ink">{a}</span>
                    <span className={`block text-[9.5px] font-semibold ${stC}`}>{st}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );

    if (wizStep === 4) return (
      <div className="flex flex-col gap-3.5">
        <div>
          <div className={fieldLabel}>{L('Disponibilidad', 'Availability')}</div>
          <div className="flex gap-1.5">
            {([['in', L('En stock', 'In stock')], ['low', L('Bajo', 'Low')], ['out', '86']] as [Stock, string][]).map(([k, lab]) => (
              <button key={k} onClick={() => upDraft({ stock: k })} className={`tap-y min-w-0 flex-1 cursor-pointer truncate rounded-[9px] px-2 py-2.5 text-[11.5px] font-extrabold ${draft.stock === k ? (k === 'out' ? 'bg-pink-dark text-white' : k === 'low' ? 'bg-amber-ink text-white' : 'bg-primary text-white') : 'bg-lilac-2 text-ink-2'}`}>{lab}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Límite diario', 'Daily limit')}</div><input value={draft.dailyLimit} onChange={(e) => upDraft({ dailyLimit: e.target.value.replace(/[^0-9]/g, '') })} placeholder={L('Ilimitado', 'Unlimited')} inputMode="numeric" className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Al agotarse', 'When out')}</div><div className="rounded-field border-[1.5px] border-lilac-line px-3 py-2.5 text-[12.5px] font-semibold text-ink">{L('Auto-pausar en 0', 'Auto-pause at 0')}</div></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Automatización', 'Automation')}</div>
          <div className="flex flex-col gap-2.5">
            {([[L('Auto-86 al llegar a cero', 'Auto-86 at zero'), L('Oculta del menú automáticamente.', 'Hide from menu automatically.')], [L('Reiniciar conteo a las 5 AM', 'Reset count at 5 AM'), L('Recarga el límite cada mañana.', 'Refill limit each morning.')], [L('Avisar a cocina en bajo stock', 'Alert kitchen at low stock'), L('Notifica antes de agotarse.', 'Notify before it sells out.')]] as [string, string][]).map(([title, sub], i) => {
              const on = draft.rules[i] ?? false;
              return (
                <div key={i} className="flex items-center gap-3 rounded-field border border-line bg-app p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-bold text-ink">{title}</span>
                    <span className="block text-[10px] font-medium text-muted-2">{sub}</span>
                  </span>
                  <Toggle on={on} onClick={() => upDraft({ rules: { ...draft.rules, [i]: !on } })} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-field border border-line bg-app p-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-bold text-ink">{L('Visible al publicar', 'Visible at publish')}</span>
            <span className="block text-[10px] font-medium leading-snug text-muted-2">{L('Apágalo para publicar oculto y revelar luego.', 'Turn off to publish hidden, reveal later.')}</span>
          </span>
          <Toggle on={draft.visible} onClick={() => upDraft({ visible: !draft.visible })} />
        </div>
      </div>
    );

    // step 5 — review
    const chansSel = chanDefs.filter((c) => draft.channels[c[0]]).map((c) => c[1]);
    const modsSel = cfg.mods.filter((m) => draft.mods[m.id]).map((m) => L(m.es, m.en));
    const algC = draft.allergens.filter((v) => v === 2).length;
    const algM = draft.allergens.filter((v) => v === 1).length;
    const editing = editingId != null;
    const reviewRows: [string, string, boolean, number][] = [
      [L('Nombre', 'Name'), draft.name || '—', !!draft.name, 0],
      [L('Categoría', 'Category'), catLabel(draftCat), true, 0],
      [L('Precio', 'Price'), draft.price ? '$' + draft.price + (draft.compareAt ? `  (${L('antes', 'was')} $${draft.compareAt})` : '') : '—', !!draft.price, 1],
      [L('Canales', 'Channels'), chansSel.length ? chansSel.join(' · ') : L('Ninguno', 'None'), chansSel.length > 0, 1],
      [L('Modificadores', 'Modifiers'), modsSel.length ? modsSel.join(', ') : L('Ninguno', 'None'), true, 2],
      [L('Dieta', 'Dietary'), draft.diet.length ? draft.diet.join(', ') : L('Ninguna', 'None'), true, 3],
      [L('Alérgenos', 'Allergens'), (algC ? algC + L(' contiene', ' contains') : '') + (algC && algM ? ' · ' : '') + (algM ? algM + L(' puede', ' may') : '') || L('Ninguno', 'None marked'), true, 3],
      ['Stock', L(STOCK_META[draft.stock].es, STOCK_META[draft.stock].en) + ' · ' + (draft.dailyLimit ? L('Límite ', 'Limit ') + draft.dailyLimit : L('Ilimitado', 'Unlimited')) + ' · ' + (draft.visible ? L('Visible', 'Visible') : L('Oculto', 'Hidden')), true, 4],
    ];
    return (
      <div className="flex flex-col gap-3.5">
        <div className={`flex items-center gap-3 rounded-btn-lg border p-3 ${ready ? 'border-green-bg bg-green-bg/50' : 'border-amber-bg bg-amber-bg/50'}`}>
          <span className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-white ${ready ? 'text-green-ink' : 'text-amber-ink'}`}>{ready ? <Check size={16} stroke={2.8} /> : <AlertTriangle size={15} stroke={2.4} />}</span>
          <div className="min-w-0 flex-1">
            <div className={`text-[12px] font-extrabold ${ready ? 'text-green-ink' : 'text-amber-ink'}`}>{ready ? (editing ? L('Listo para guardar', 'Ready to save') : L('Listo para publicar', 'Ready to publish')) : L('Faltan datos esenciales', 'A few essentials are missing')}</div>
            <div className="text-[10.5px] font-medium leading-snug text-ink-3">{ready ? (editing ? L('Los cambios se publican al instante.', 'Changes go live instantly.') : L('Todo en orden. Publicar lo activa al instante.', 'All set. Publishing makes it live instantly.')) : L('Agrega nombre y precio antes de continuar.', 'Add a name and price before continuing.')}</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-btn-lg border border-line">
          {reviewRows.map(([k, v, ok, step], i) => (
            <div key={k} className={`flex items-center gap-2.5 px-3 py-2.5 ${i < reviewRows.length - 1 ? 'border-b border-hair' : ''}`}>
              <span className="w-[74px] flex-none text-[10.5px] font-semibold text-muted-2">{k}</span>
              <span className={`min-w-0 flex-1 text-[11.5px] font-bold ${ok ? 'text-ink' : 'text-muted-2'}`}>{v}</span>
              <button onClick={() => setWizStep(step)} className="flex-none cursor-pointer text-[10.5px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
            </div>
          ))}
        </div>
        {editing ? (
          // Editing an existing item → manage it (duplicate / delete) instead of
          // choosing a publish mode.
          <div>
            <div className={fieldLabel}>{L('Administrar platillo', 'Manage item')}</div>
            <div className="flex gap-2.5">
              <button onClick={duplicateFromDraft} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3 text-[12.5px] font-extrabold text-ink">
                <Copy size={14} stroke={2.4} />{L('Duplicar', 'Duplicate')}
              </button>
              <button onClick={() => setConfirmDel(true)} className="tap flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-pink-bg bg-white py-3 text-[12.5px] font-extrabold text-pink-dark">
                <Trash2 size={14} stroke={2.4} />{L('Eliminar', 'Delete')}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className={fieldLabel}>{L('Opciones de publicación', 'Publish options')}</div>
            <div className="flex flex-col gap-2">
              {([['now', L('Publicar ahora', 'Publish now'), L('Aparece en tu menú al instante.', 'Goes live immediately.'), Zap], ['schedule', L('Programar', 'Schedule'), L('Elige fecha y hora.', 'Pick a date & time.'), Calendar], ['draft', L('Guardar borrador', 'Save as draft'), L('Oculto hasta que estés listo.', 'Hidden until ready.'), Copy]] as [string, string, string, LucideIcon][]).map(([k, lab, sub, Icon]) => {
                const on = draft.publishMode === k;
                return (
                  <button key={k} onClick={() => upDraft({ publishMode: k })} className={`flex w-full items-center gap-3 rounded-btn-lg border-[1.5px] p-3 ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                    <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-lilac"><Icon size={15} className="text-primary-dark" strokeWidth={2} /></span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-[12px] font-extrabold text-ink">{lab}</span>
                      <span className="block text-[10px] font-medium text-muted-2">{sub}</span>
                    </span>
                    <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[1.5px] ${on ? 'border-primary' : 'border-lilac-line'}`}>{on && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const wizardPage = (
    <ModulePage
      title={editingId != null ? L('Editar platillo', 'Edit item') : L('Agregar platillo', 'Add menu item')}
      subtitle={`${catLabel(draftCat)} · ${L('Paso', 'Step')} ${wizStep + 1}/${wizStepDefs.length}`}
      onBack={() => { setView('module'); setEditingId(null); }}
      backLabel={editingId != null ? L('Cerrar', 'Close') : L('Cancelar', 'Cancel')}
      maxW={940}
      footer={
        <div className="flex items-center gap-3">
          <button onClick={wizBack} className="flex-none cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3.5 text-[12.5px] font-extrabold text-ink">
            {wizStep === 0 ? (editingId != null ? L('Cerrar', 'Close') : L('Cancelar', 'Cancel')) : L('Atrás', 'Back')}
          </button>
          <button
            onClick={wizNext}
            disabled={!nextGated}
            className={`flex-1 rounded-btn-lg py-3.5 text-[13.5px] font-extrabold text-white ${nextGated ? 'cursor-pointer bg-primary shadow-cta-sm' : 'cursor-not-allowed bg-lilac-line'}`}
          >
            {wizStep >= wizStepDefs.length - 1 ? (editingId != null ? L('Guardar cambios', 'Save changes') : L('Publicar platillo', 'Publish item')) : L('Continuar', 'Continue')}
          </button>
        </div>
      }
    >
      {/* stepper */}
      <div className="mb-4">
        <ChipRow className="-mx-1 px-1">
          {wizStepDefs.map((label, i) => {
            const active = wizStep === i; const done = i < wizStep || (i <= wizMax && i !== wizStep);
            return (
              <button key={label} onClick={() => { if (i <= wizMax) setWizStep(i); }} className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${active ? 'bg-primary text-white' : done ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted-2'}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white ${active ? 'bg-white/25' : done ? 'bg-primary' : 'bg-muted-faint'}`}>{done ? '✓' : i + 1}</span>
                {label}
              </button>
            );
          })}
        </ChipRow>
      </div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
        <div className="order-2 xl:order-1">
          <div className={`${cardCls} p-4`}>
            <div className="mb-3.5 text-[13.5px] font-extrabold text-ink">{wizTitle}</div>
            {renderWizardStep()}
          </div>
        </div>
        <div className="order-1 xl:order-2 xl:sticky xl:top-0">
          <div className={`mb-2 ${sectionLabel}`}>{L('Vista previa en vivo', 'Live preview')}</div>
          {previewCard}
        </div>
      </div>
    </ModulePage>
  );

  // ============ SUCCESS ============
  const successPage = (() => {
    const chansSel = chanDefs.filter((c) => draft.channels[c[0]]).length;
    return (
      <ModulePage title={L('¡Publicado!', 'Published!')} onBack={() => { setView('module'); setSubtab('items'); }}>
      <div className="mx-auto flex max-w-[420px] flex-col items-center pb-4 pt-6 text-center">
        <div className="mb-3.5 flex h-16 w-16 items-center justify-center rounded-panel bg-green-bg text-green-ink"><Check size={32} stroke={2.6} /></div>
        <div className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{(draft.name || L('Nuevo platillo', 'New item'))} {L('está activo', 'is live')}</div>
        <div className="mt-2 max-w-[300px] text-[13px] font-medium leading-relaxed text-muted">
          {L(`Ya está en tu menú de ${catLabel(draftCat)} en ${chansSel} canales. Los cambios se publican al instante.`, `It's now on your menu across ${chansSel} channels. Changes go live instantly.`)}
        </div>
        <div className="mt-5 w-full overflow-hidden rounded-tile border border-line bg-white text-left">
          <div className="relative h-[110px]" style={{ background: `repeating-linear-gradient(135deg,${draftCat.tile})` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {draft.photoUrl && <img src={imgUrl(draft.photoUrl, ANCHO.tarjeta)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          </div>
          <div className="flex items-center justify-between p-3.5">
            <div className="min-w-0">
              <div className="text-[14px] font-extrabold text-ink">{draft.name || L('Nuevo platillo', 'New item')}</div>
              <div className="mt-0.5 text-[11.5px] font-medium text-muted-2">{catLabel(draftCat)} · {draft.price ? '$' + draft.price : '$0.00'}</div>
            </div>
            <span className="flex-none rounded-lg bg-green-bg px-2.5 py-1 text-[10.5px] font-extrabold text-green-ink">{L('Activo', 'Live')}</span>
          </div>
        </div>
        <div className="mt-5 flex w-full flex-col gap-2.5">
          <button onClick={startAdd} className="w-full cursor-pointer rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta-sm">+ {L('Agregar otro platillo', 'Add another item')}</button>
          <button onClick={() => { setView('module'); setSubtab('items'); }} className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3.5 text-[13.5px] font-extrabold text-ink">{L('Volver al menú', 'Back to menu')}</button>
        </div>
      </div>
      </ModulePage>
    );
  })();

  // Structure editor sheets (shared across views so the wizard can open them).
  const editorSheets = (
    <>
      <CategoryEditor
        open={catSheet.open}
        onClose={() => { setCatSheet((s) => ({ ...s, open: false })); setCatFromWiz(false); }}
        L={L}
        initial={catSheet.initial}
        itemCount={catSheet.initial ? countIn(catSheet.initial.id) : 0}
        onSave={upsertCategory}
        onDelete={deleteCategory}
      />
      <ModGroupEditor
        open={modSheet.open}
        onClose={() => setModSheet((s) => ({ ...s, open: false }))}
        L={L}
        initial={modSheet.initial}
        usedCount={modSheet.initial ? usedBy(modSheet.initial.id) : 0}
        onSave={upsertMod}
        onDelete={deleteMod}
        onDuplicate={upsertMod}
      />
      <DaypartEditor
        open={dpSheet.open}
        onClose={() => setDpSheet((s) => ({ ...s, open: false }))}
        L={L}
        es={es}
        initial={dpSheet.initial}
        onSave={upsertDaypart}
        onDelete={deleteDaypart}
      />
      <PromoEditor
        open={promoSheet.open}
        onClose={() => setPromoSheet((s) => ({ ...s, open: false }))}
        L={L}
        es={es}
        initial={promoSheet.initial}
        createType={promoSheet.createType}
        onSave={upsertPromo}
        onDelete={deletePromo}
      />
    </>
  );

  // Delete-item confirmation (shared with the wizard review "Eliminar").
  const deleteConfirm = (
    <ConfirmDialog
      open={confirmDel}
      onClose={() => setConfirmDel(false)}
      onConfirm={() => { setConfirmDel(false); deleteEditing(); }}
      title={L('¿Eliminar platillo?', 'Delete item?')}
      message={L(`“${draft.name || L('Este platillo', 'This item')}” se quitará de tu menú y tu listado público. Esta acción no se puede deshacer.`, `“${draft.name || 'This item'}” will be removed from your menu and public listing. This can’t be undone.`)}
      confirmLabel={L('Eliminar', 'Delete')}
      cancelLabel={L('Cancelar', 'Cancel')}
    />
  );

  // ============ RENDER ============
  // Add/edit both use the SAME full-page wizard (no cramped popups).
  if (view === 'wizard') return <>{wizardPage}{editorSheets}<QuickTagSheet open={tagSheet} onClose={() => setTagSheet(false)} L={L} onCreate={addTag} existing={['Nuevo', 'Popular', 'Destacado', ...cfg.tags]} />{deleteConfirm}<Toast msg={toast} /></>;
  if (view === 'success') return <>{successPage}<Toast msg={toast} /></>;

  return (
    <div className="relative pb-8">
      {/* Local delivery is configured in the shared "Entregas y envíos" module
          (same zones/drivers a shop uses) — a menu just turns delivery on. */}
      <button onClick={() => go('fulfillment')} className="mb-3 flex w-full items-center gap-3 rounded-card-sm border border-line bg-white p-3 text-left">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac text-primary-dark"><Truck size={17} stroke={2} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-extrabold text-ink">{L('Entrega local y envíos', 'Local delivery & shipping')}</span>
          <span className="block text-[10.5px] font-semibold leading-snug text-muted-2">{L('Zonas, repartidores y apps de reparto para tus pedidos', 'Zones, drivers & delivery apps for your orders')}</span>
        </span>
        <span className="flex-none text-[13px] font-extrabold text-muted-2">›</span>
      </button>
      <SectionTabs
        className="mb-4"
        tabs={subtabDefs as SectionTab<typeof subtab>[]}
        value={subtab}
        onChange={setSubtab}
      />
      {subtab === 'items' && renderItems()}
      {subtab === 'categories' && renderCategories()}
      {subtab === 'mods' && renderMods()}
      {subtab === 'schedules' && renderSchedules()}
      {subtab === 'promos' && renderPromos()}
      {subtab === 'allergens' && renderAllergens()}
      {subtab === 'stock' && renderStock()}
      {editorSheets}
      <Toast msg={toast} />
    </div>
  );
}
