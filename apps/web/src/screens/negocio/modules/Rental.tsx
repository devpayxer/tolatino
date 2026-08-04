'use client';

// Renta / Rental module (business dashboard) — fully functional, mirroring the
// Servicios module. Rental items live in business_items (kind='rental'); the
// structure (categories, reusable priced add-ons, rental mode) lives in
// businesses.rental_config (migration 0050). Two top-level modes:
//  • Artículos — catalog (grouped by config categories, each item editable via
//    the shared 5-step wizard: create/edit/duplicate/delete-confirmed, photo,
//    add-ons, rates/deposit, policies), plus Categorías + Add-ons sub-tabs (real
//    CRUD), a Precios overview, and a "Modo del listado" toggle (Solo mostrar vs
//    Aceptar rentas). Tapping a card opens the item detail (rent-out / return /
//    edit).
//  • Rentas — operations: incoming customer rental requests (business_rentals),
//    calendar, deposits and damage.
// Display-only mode hides the Rentar button on the public listing. Fully
// explorable in demo (local sample); a signed-in owner persists to Supabase.

import { useEffect, useRef, useState } from 'react';
import { Icon as LucideIcon } from '@tabler/icons-react';
import { IconAlertTriangle as AlertTriangle, IconPackages as Boxes, IconCalendar as CalendarDays, IconCheck as Check, IconCircleCheck as CheckCircle2, IconChevronDown as ChevronDown, IconChevronLeft as ChevronLeft, IconChevronUp as ChevronUp, IconCopy as Copy, IconCurrencyDollar as DollarSign, IconLoader2 as Loader2, IconLock as Lock, IconMinus as Minus, IconPackage as Package, IconPencil as Pencil, IconPlus as Plus, IconShield as Shield, IconBuildingStore as Store, IconTrash as Trash2, IconUpload as Upload, IconBolt as Zap } from '@tabler/icons-react';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';
import { escribir } from '@/lib/escribir';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { ChipRow } from '@/components/ChipRow';
import { SectionTabs, type SectionTab } from '@/components/SectionTabs';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { QuickTagSheet } from '@/components/QuickTagSheet';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useUrlTab } from '@/lib/urlView';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { rentalDeposit } from '@/lib/stripe';
import { formatPhone } from '@/lib/phone';
import { uploadImage } from '@/lib/image';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draftStore';
import { deleteBizItem, insertBizItem, listBizItems, updateBizItem, type BizItemRow, type NewBizItem } from '@/lib/bizItems';
import {
  DEFAULT_RENTAL_POLICIES, defaultRentalConfig, demoRentalConfig, normalizeRentalConfig,
  type RentalAddon, type RentalCategory, type RentalConfig, type RentalPolicy,
} from '@/lib/rentalConfig';
import { RentalAddonEditor, RentalCategoryEditor, RentalPolicyEditor, rentCatIcon } from '@/screens/negocio/modules/RentalEditors';

type Period = 'hour' | 'day' | 'week';
type Condition = 'perfect' | 'minor' | 'major';

const FALLBACK_CAT: RentalCategory = { id: '_', es: 'Artículos', en: 'Items', icon: 'boxes', tile: '#EAE2F8 0 8px,#DCCEF2 8px 16px', visible: true };

// An incoming customer rental ORDER (business_rental_orders, 0097) — the other
// side of the consumer's rental cart. Carries its line items for the expand.
type RentalReq = {
  id: string; customer_name: string | null; item_name: string; items: { name: string; qty: number }[];
  start_at: string; end_at: string | null; total: number | null; deposit: number | null; status: string;
  paid: boolean; // fee already charged online (0099) — only the deposit is due at pickup
  depositStatus: string; // none|held|released|captured|failed (0101)
  depositCaptured: number;
};
const REQ_STATUS: Record<string, { es: string; en: string; cls: string }> = {
  pending:   { es: 'Pendiente',  en: 'Pending',   cls: 'bg-amber-bg text-amber-ink' },
  confirmed: { es: 'Confirmada', en: 'Confirmed', cls: 'bg-green-bg text-green-dark' },
  out:       { es: 'En uso',     en: 'Out',       cls: 'bg-lilac text-primary-dark' },
  returned:  { es: 'Devuelto',   en: 'Returned',  cls: 'bg-lilac-2 text-ink-2' },
  cancelled: { es: 'Cancelado',  en: 'Cancelled', cls: 'bg-lilac-2 text-ink-2' },
};

type Item = {
  id: number; dbId?: string; es: string; en: string; descEs: string; descEn: string;
  cat: string; tile: string; booked: number; stock: number; out: number;
  unitEs: string; unitEn: string; dep: number; hour: number | null; day: number; week: number;
  availEs: string; availEn: string; addons: string[]; tags: string[];
  policies: string[]; imageUrl?: string;
};

// Default policy ids pre-selected on a new item (the config policies flagged default).
const DEFAULT_POLICY_IDS = DEFAULT_RENTAL_POLICIES.filter((p) => p.default).map((p) => p.id);
// Back-compat: an older item stored attrs.waivers as a bool[4] index-aligned to
// the 4 default policies; map true indices → policy ids.
const waiversToPolicies = (w: unknown): string[] =>
  Array.isArray(w) ? DEFAULT_RENTAL_POLICIES.filter((_, i) => (w as boolean[])[i]).map((p) => p.id) : [...DEFAULT_POLICY_IDS];

// Map a business_items row (kind='rental') ↔ the module's bilingual Item.
function rowToRental(r: BizItemRow, idx: number): Item {
  const a = (r.attrs ?? {}) as Record<string, unknown>;
  return {
    id: idx + 1,
    dbId: r.id,
    es: r.name,
    en: String(a.nameEn ?? r.name),
    descEs: r.description ?? '',
    descEn: String(a.descEn ?? r.description ?? ''),
    cat: r.section ?? FALLBACK_CAT.id,
    tile: String(a.tile ?? ''),
    booked: Number(a.booked ?? 0),
    stock: Number(a.stock ?? 0),
    out: Number(a.out ?? 0),
    unitEs: String(a.unitEs ?? r.unit ?? ''),
    unitEn: String(a.unitEn ?? ''),
    dep: Number(a.dep ?? 0),
    hour: a.hour != null ? Number(a.hour) : null,
    day: Number(a.day ?? r.price ?? 0),
    week: Number(a.week ?? 0),
    availEs: String(a.availEs ?? ''),
    availEn: String(a.availEn ?? ''),
    addons: Array.isArray(a.addons) ? (a.addons as string[]) : [],
    tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
    policies: Array.isArray(a.policies) ? (a.policies as string[]) : waiversToPolicies(a.waivers),
    imageUrl: r.image_url ?? undefined,
  };
}
function rentalToRow(it: Item, businessId: string, sort: number): NewBizItem {
  return {
    business_id: businessId,
    kind: 'rental',
    name: it.es,
    description: it.descEs || null,
    price: it.day,
    unit: it.unitEs,
    section: it.cat,
    available: true,
    sort,
    image_url: it.imageUrl ?? null,
    attrs: {
      nameEn: it.en, descEn: it.descEn, unitEn: it.unitEn, tile: it.tile, booked: it.booked,
      stock: it.stock, out: it.out, dep: it.dep, hour: it.hour, day: it.day, week: it.week,
      availEs: it.availEs, availEn: it.availEn, addons: it.addons, tags: it.tags, policies: it.policies,
    },
  };
}

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';
const fieldCls =
  'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted-faint focus:border-primary';
const fieldLabel = 'mb-1.5 text-[11px] font-extrabold text-ink-soft';
const addBtn = 'mt-3.5 w-full cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-app py-3 text-[12.5px] font-extrabold text-primary-dark';
const stripe = (stops: string) => `repeating-linear-gradient(135deg,${stops})`;
const money = (n: number) => '$' + n.toLocaleString();
const chip = (on: boolean) =>
  `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12.5px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;

const RENT_TAGS = ['Más rentado', 'Para eventos', 'Nuevo', 'Popular'];
const tagLabel = (t: string, L: (es: string, en: string) => string) =>
  ({ 'Más rentado': L('Más rentado', 'Most rented'), 'Para eventos': L('Para eventos', 'For events'), Nuevo: L('Nuevo', 'New'), Popular: 'Popular' } as Record<string, string>)[t] ?? t;

const AVAILS: [string, string][] = [['Siempre', 'Always'], ['Entre semana', 'Weekdays'], ['Fines de semana', 'Weekends'], ['48h aviso', '48h notice']];

// ---------- draft ----------
type Draft = {
  name: string; nameEn: string; descEs: string; descEn: string; cat: string; stock: string;
  unitEs: string; unitEn: string; hour: string; day: string; week: string; dep: string;
  addons: string[]; tags: string[]; avail: string; policies: string[]; photoUrl: string;
};
const newDraft = (cat: string, policies: string[]): Draft => ({
  name: '', nameEn: '', descEs: '', descEn: '', cat, stock: '1', unitEs: '', unitEn: '',
  hour: '', day: '', week: '', dep: '', addons: [], tags: [], avail: 'Siempre', policies, photoUrl: '',
});

// =====================================================================
export function RentalModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  void tab;
  const { L, es, isFree, isPremium } = ctx;
  const admin = useBizAdmin();
  const { user } = useAuth();
  const real = admin.active;
  const persistable = !admin.demo && !!real;

  // ── config (categories / add-ons / rental mode) ────────────────────────────
  const [cfg, setCfg] = useState<RentalConfig>(demoRentalConfig);
  useEffect(() => {
    setCfg(admin.demo ? demoRentalConfig() : real?.rental_config ? normalizeRentalConfig(real.rental_config) : defaultRentalConfig());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);
  const saveCfg = (next: RentalConfig) => { setCfg(next); if (persistable) admin.update({ rental_config: next }); };
  const catOf = (id: string): RentalCategory => cfg.categories.find((c) => c.id === id) ?? FALLBACK_CAT;
  const catLabelOf = (id: string) => { const c = catOf(id); return L(c.es, c.en); };
  const tileOf = (it: Item) => catOf(it.cat).tile || it.tile || FALLBACK_CAT.tile;
  const addonOf = (id: string) => cfg.addons.find((a) => a.id === id);

  // ── items (business_items kind='rental') ───────────────────────────────────
  const demoSeed = (): Item[] => {
    const c = demoRentalConfig().categories;
    const t = (id: string) => c.find((x) => x.id === id)?.tile ?? FALLBACK_CAT.tile;
    return [
      { id: 1, es: 'Salón de eventos', en: 'Event hall', descEs: 'Quinces, bodas y fiestas · hasta 120', descEn: 'Quinces, weddings & parties · up to 120', cat: 'space', tile: t('space'), booked: 6, stock: 1, out: 1, unitEs: 'espacio', unitEn: 'space', dep: 150, hour: 60, day: 350, week: 1400, availEs: 'Siempre', availEn: 'Always', addons: ['delivery', 'setup'], tags: ['Para eventos'], policies: [...DEFAULT_POLICY_IDS] },
      { id: 2, es: 'Mesa larga · 8 lugares', en: 'Long table · 8 seats', descEs: 'Mesa de banquete con sillas', descEn: 'Banquet table with chairs', cat: 'furniture', tile: t('furniture'), booked: 2, stock: 4, out: 0, unitEs: 'mesa', unitEn: 'table', dep: 40, hour: null, day: 45, week: 180, availEs: 'Siempre', availEn: 'Always', addons: ['delivery'], tags: [], policies: [...DEFAULT_POLICY_IDS] },
      { id: 3, es: 'Vajilla de fiesta · 100', en: 'Party tableware · 100', descEs: 'Platos, copas y cubiertos completos', descEn: 'Full plates, glasses & cutlery', cat: 'tableware', tile: t('tableware'), booked: 1, stock: 2, out: 0, unitEs: 'juego', unitEn: 'set', dep: 200, hour: null, day: 120, week: 480, availEs: '48h aviso', availEn: '48h notice', addons: ['delivery', 'pickup'], tags: ['Más rentado'], policies: [...DEFAULT_POLICY_IDS] },
      { id: 4, es: 'Bocina y micrófono', en: 'Speaker & microphone', descEs: 'Sonido profesional para tu evento', descEn: 'Pro sound for your event', cat: 'equipo', tile: t('equipo'), booked: 3, stock: 3, out: 1, unitEs: 'equipo', unitEn: 'kit', dep: 80, hour: 25, day: 90, week: 360, availEs: 'Entre semana', availEn: 'Weekdays', addons: ['setup', 'insurance'], tags: [], policies: [...DEFAULT_POLICY_IDS] },
    ];
  };
  const [items, setItems] = useState<Item[]>(demoSeed);
  useEffect(() => {
    if (!persistable || !real) { setItems(demoSeed()); return; }
    let cancelled = false;
    (async () => {
      const rows = await listBizItems(real.id, 'rental');
      if (!cancelled) setItems(rows.map(rowToRental));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  const nextId = () => (items.length ? Math.max(...items.map((s) => s.id)) : 0) + 1;
  const persistNew = async (it: Item) => {
    if (!persistable || !real) return;
    const dbId = await insertBizItem(rentalToRow(it, real.id, items.length));
    if (dbId) setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, dbId } : x)));
  };
  const persistPatch = (it: Item | undefined) => {
    if (persistable && it?.dbId) updateBizItem(it.dbId, rentalToRow(it, real!.id, 0));
  };
  const countIn = (catId: string) => items.filter((s) => s.cat === catId).length;
  const addonUsedBy = (addonId: string) => items.filter((s) => s.addons.includes(addonId)).length;

  // ── incoming customer rental ORDERS (business_rental_orders, 0097) ─────────
  const [reqRows, setReqRows] = useState<RentalReq[] | null>(null);
  const [falloRentas, setFalloRentas] = useState(false);
  useEffect(() => {
    if (!persistable || !real || !supabase) { setReqRows(null); return; }
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase!
        .from('business_rental_orders')
        .select('id,customer_name,start_at,end_at,fee_total,deposit_total,status,paid,deposit_status,deposit_captured,created_at,business_rentals(item_name,qty)')
        .eq('business_id', real.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      // Un fallo NO es «no hay solicitudes». Se marca; y NO se deja `null`, porque
      // `reqRows ?? reqSeed` caería en los datos de EJEMPLO — enseñar rentas
      // inventadas como si fueran suyas sería peor que enseñar la lista vacía.
      setFalloRentas(!!error);
      if (error || !Array.isArray(data)) { setReqRows((prev) => prev ?? []); return; }
      const rows: RentalReq[] = (data as Record<string, unknown>[]).map((o) => {
        const lines = Array.isArray(o.business_rentals) ? (o.business_rentals as { item_name: string; qty: number }[]) : [];
        return {
          id: String(o.id), customer_name: (o.customer_name as string) ?? null,
          item_name: lines[0]?.item_name ?? 'Renta', items: lines.map((l) => ({ name: l.item_name, qty: l.qty })),
          start_at: String(o.start_at), end_at: (o.end_at as string) ?? null,
          total: (o.fee_total as number) ?? null, deposit: (o.deposit_total as number) ?? null, status: String(o.status),
          paid: o.paid === true,
          depositStatus: String(o.deposit_status ?? 'none'), depositCaptured: Number(o.deposit_captured ?? 0),
        };
      });
      setReqRows(rows);
    };
    void load();
    // live: new orders + status changes land immediately
    const ch = supabase!.channel(`rentops-${real.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_rental_orders', filter: `business_id=eq.${real.id}` }, () => void load())
      .subscribe();
    return () => { cancelled = true; supabase!.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);
  const setReqStatus = async (id: string, status: string) => {
    const antes = reqRows?.find((r) => r.id === id)?.status;
    setReqRows((rows) => (rows ? rows.map((r) => (r.id === id ? { ...r, status } : r)) : rows));
    if (persistable && supabase) {
      const err = await escribir(supabase.from('business_rental_orders').update({ status }).eq('id', id), L('es', 'en') === 'en');
      if (err) {
        setReqRows((rows) => (rows ? rows.map((r) => (r.id === id && antes ? { ...r, status: antes } : r)) : rows));
        flash(err);
        return;
      }
    }
    flash(L('Renta actualizada', 'Rental updated'));
  };
  // Deposit hold (0101): release on return, or capture part of it for damage.
  const [damageFor, setDamageFor] = useState<RentalReq | null>(null);
  const [damageAmt, setDamageAmt] = useState('');
  const [depBusy, setDepBusy] = useState(false);
  const patchDeposit = (id: string, depositStatus: string, depositCaptured: number) =>
    setReqRows((rows) => (rows ? rows.map((r) => (r.id === id ? { ...r, depositStatus, depositCaptured } : r)) : rows));
  // Return the item and, if a real hold is on the card, release it (Turo-style).
  const returnAndRelease = async (r: RentalReq) => {
    if (r.depositStatus === 'held') {
      if (admin.demo) { patchDeposit(r.id, 'released', 0); }
      else {
        setDepBusy(true);
        const { error } = await rentalDeposit(r.id, 'release');
        setDepBusy(false);
        if (error) { flash(L('No se pudo liberar el depósito', 'Could not release the deposit')); return; }
        patchDeposit(r.id, 'released', 0);
      }
      flash(L('Depósito liberado', 'Deposit released'));
    }
    await setReqStatus(r.id, 'returned');
  };
  const submitDamage = async () => {
    if (!damageFor) return;
    const amt = Math.max(0, Math.min(Number(damageFor.deposit ?? 0), Number(damageAmt) || 0));
    if (amt <= 0) { flash(L('Escribe un monto válido', 'Enter a valid amount')); return; }
    if (admin.demo) { patchDeposit(damageFor.id, 'captured', amt); }
    else {
      setDepBusy(true);
      const { error } = await rentalDeposit(damageFor.id, 'capture', amt);
      setDepBusy(false);
      if (error) { flash(L('No se pudo cobrar el daño', 'Could not charge for damage')); return; }
      patchDeposit(damageFor.id, 'captured', amt);
    }
    await setReqStatus(damageFor.id, 'returned');
    setDamageFor(null); setDamageAmt('');
    flash(L('Daño cobrado del depósito', 'Damage charged to the deposit'));
  };

  // ── ui state ────────────────────────────────────────────────────────────────
  // Primary split (Artículos / Operación) mirrored to ?sub= (refresh-safe).
  const [mode, setMode] = useUrlTab<'items' | 'ops'>('sub', 'items', (v) => ['items', 'ops'].includes(v));
  const [itemSub, setItemSub] = useState<'catalog' | 'cats' | 'addons' | 'policies' | 'pricing'>('catalog');
  const [histOpen, setHistOpen] = useState(false); // ops · show returned/cancelled history
  const [openId, setOpenId] = useState<number | null>(null);
  const [flow, setFlow] = useState<null | 'rentout' | 'return'>(null);
  const [view, setView] = useState<'module' | 'wizard' | 'success'>('module');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [wizStep, setWizStep] = useState(0);
  const [wizMax, setWizMax] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => newDraft('general', [...DEFAULT_POLICY_IDS]));
  const [confirmDel, setConfirmDel] = useState(false);
  const [toast, setToast] = useState('');
  const [catSheet, setCatSheet] = useState<{ open: boolean; initial: RentalCategory | null }>({ open: false, initial: null });
  const [addonSheet, setAddonSheet] = useState<{ open: boolean; initial: RentalAddon | null }>({ open: false, initial: null });
  const [policySheet, setPolicySheet] = useState<{ open: boolean; initial: RentalPolicy | null }>({ open: false, initial: null });
  const [catFromWiz, setCatFromWiz] = useState(false);
  const [policyFromWiz, setPolicyFromWiz] = useState(false);
  const [tagSheet, setTagSheet] = useState(false);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };
  const upD = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const selected = items.find((i) => i.id === openId) ?? null;

  // ── draft recovery ──────────────────────────────────────────────────────────
  const draftKey = 'tl:draft:rental:' + (real?.id ?? 'demo');
  useEffect(() => {
    if (view === 'wizard' && editingId == null) saveDraft(draftKey, draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, view, editingId]);

  // ── photo upload ────────────────────────────────────────────────────────────
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
  const upsertCategory = (c: RentalCategory) => {
    const exists = cfg.categories.some((x) => x.id === c.id);
    saveCfg({ ...cfg, categories: exists ? cfg.categories.map((x) => (x.id === c.id ? c : x)) : [...cfg.categories, c] });
    if (!exists && catFromWiz) upD({ cat: c.id });
    setCatFromWiz(false);
    flash(exists ? L('Categoría guardada', 'Category saved') : L('Categoría creada', 'Category created'));
  };
  const addTag = (label: string) => {
    if (!cfg.tags.includes(label)) saveCfg({ ...cfg, tags: [...cfg.tags, label] });
    if (!draft.tags.includes(label)) upD({ tags: [...draft.tags, label] });
  };
  const deleteCategory = (id: string) => { saveCfg({ ...cfg, categories: cfg.categories.filter((x) => x.id !== id) }); flash(L('Categoría eliminada', 'Category deleted')); };
  const moveCategory = (id: string, dir: -1 | 1) => {
    const i = cfg.categories.findIndex((x) => x.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= cfg.categories.length) return;
    const next = [...cfg.categories]; [next[i], next[j]] = [next[j], next[i]]; saveCfg({ ...cfg, categories: next });
  };
  const toggleCategory = (id: string) => saveCfg({ ...cfg, categories: cfg.categories.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)) });
  const upsertAddon = (a: RentalAddon) => {
    const exists = cfg.addons.some((x) => x.id === a.id);
    saveCfg({ ...cfg, addons: exists ? cfg.addons.map((x) => (x.id === a.id ? a : x)) : [...cfg.addons, a] });
    flash(exists ? L('Extra guardado', 'Add-on saved') : L('Extra creado', 'Add-on created'));
  };
  const deleteAddon = (id: string) => {
    saveCfg({ ...cfg, addons: cfg.addons.filter((x) => x.id !== id) });
    setItems((l) => l.map((s) => (s.addons.includes(id) ? { ...s, addons: s.addons.filter((x) => x !== id) } : s)));
    flash(L('Extra eliminado', 'Add-on deleted'));
  };
  const policyUsedBy = (id: string) => items.filter((s) => s.policies.includes(id)).length;
  const upsertPolicy = (p: RentalPolicy) => {
    const exists = cfg.policies.some((x) => x.id === p.id);
    saveCfg({ ...cfg, policies: exists ? cfg.policies.map((x) => (x.id === p.id ? p : x)) : [...cfg.policies, p] });
    if (!exists && policyFromWiz) upD({ policies: [...draft.policies, p.id] });
    setPolicyFromWiz(false);
    flash(exists ? L('Política guardada', 'Policy saved') : L('Política creada', 'Policy created'));
  };
  const deletePolicy = (id: string) => {
    saveCfg({ ...cfg, policies: cfg.policies.filter((x) => x.id !== id) });
    setItems((l) => l.map((s) => (s.policies.includes(id) ? { ...s, policies: s.policies.filter((x) => x !== id) } : s)));
    flash(L('Política eliminada', 'Policy deleted'));
  };

  // ── wizard: draft ⇄ item ────────────────────────────────────────────────────
  const wizSteps: [string, string][] = [
    [L('Detalles', 'Details'), L('Detalles del artículo', 'Item details')],
    [L('Tarifas', 'Rates'), L('Tarifas y depósito', 'Rates & deposit')],
    [L('Extras', 'Add-ons'), L('Extras y add-ons', 'Extras & add-ons')],
    [L('Políticas', 'Policies'), L('Políticas y disponibilidad', 'Policies & availability')],
    [L('Revisar', 'Review'), L('Revisar y publicar', 'Review & publish')],
  ];
  const draftReady = !!draft.name.trim() && !!draft.day.trim();
  const availOf = (it: Item) => it.stock - it.out;
  const statusOf = (it: Item) => {
    const a = availOf(it);
    return a <= 0
      ? { cls: 'bg-pink-bg text-pink-dark', dot: '#D6336C', label: L('Reservado', 'Booked') }
      : a <= 1
        ? { cls: 'bg-amber-bg text-amber-ink', dot: '#9A6A12', label: L('Limitado', 'Limited') }
        : { cls: 'bg-green-bg text-green-dark', dot: '#1F8A4C', label: L('Disponible', 'Available') };
  };

  const startAdd = () => {
    setEditingId(null);
    const fresh = newDraft(cfg.categories.find((c) => c.visible)?.id ?? 'general', cfg.policies.filter((p) => p.default).map((p) => p.id));
    const saved = loadDraft<Draft>(draftKey);
    if (saved && (saved.name?.trim() || saved.descEs || saved.descEn || saved.day || saved.photoUrl)) {
      setDraft({ ...fresh, ...saved });
      flash(L('Borrador recuperado', 'Draft restored'));
    } else setDraft(fresh);
    setWizStep(0); setWizMax(0); setOpenId(null); setFlow(null); setView('wizard');
  };
  const startEdit = (s: Item) => {
    setEditingId(s.id);
    setDraft({
      name: s.es, nameEn: s.en, descEs: s.descEs, descEn: s.descEn, cat: s.cat, stock: String(s.stock || 1),
      unitEs: s.unitEs, unitEn: s.unitEn, hour: s.hour != null ? String(s.hour) : '', day: String(s.day || ''),
      week: s.week ? String(s.week) : '', dep: s.dep ? String(s.dep) : '', addons: [...s.addons], tags: [...s.tags],
      avail: s.availEs || 'Siempre', policies: [...s.policies], photoUrl: s.imageUrl ?? '',
    });
    setWizStep(0); setWizMax(wizSteps.length - 1); setOpenId(null); setFlow(null); setView('wizard');
  };
  const draftFields = (): Omit<Item, 'id'> => {
    const availPair = AVAILS.find(([e]) => e === draft.avail) ?? AVAILS[0];
    return {
      es: draft.name.trim() || L('Nuevo artículo', 'New item'), en: draft.nameEn.trim() || draft.name.trim() || L('Nuevo artículo', 'New item'),
      descEs: draft.descEs, descEn: draft.descEn || draft.descEs, cat: draft.cat, tile: catOf(draft.cat).tile,
      booked: 0, stock: Number(draft.stock) || 1, out: 0, unitEs: draft.unitEs.trim() || 'unidad', unitEn: draft.unitEn.trim() || draft.unitEs.trim() || 'unit',
      dep: Number(draft.dep) || 0, hour: draft.hour ? Number(draft.hour) : null, day: Number(draft.day) || 0, week: Number(draft.week) || 0,
      availEs: availPair[0], availEn: availPair[1], addons: draft.addons, tags: draft.tags, policies: draft.policies, imageUrl: draft.photoUrl || undefined,
    };
  };
  const addFromDraft = () => { const s: Item = { id: nextId(), ...draftFields() }; setItems((l) => [s, ...l]); persistNew(s); clearDraft(draftKey); };
  const saveFromDraft = () => {
    if (editingId == null) return;
    setItems((l) => { const next = l.map((s) => (s.id === editingId ? { ...s, ...draftFields() } : s)); persistPatch(next.find((s) => s.id === editingId)); return next; });
  };
  const duplicateFromDraft = () => {
    const s: Item = { id: nextId(), ...draftFields(), es: `${draft.name.trim() || L('Nuevo artículo', 'New item')} ${L('(copia)', '(copy)')}` };
    setItems((l) => [s, ...l]); persistNew(s); setView('module'); setEditingId(null); flash(L('Artículo duplicado', 'Item duplicated'));
  };
  const deleteEditing = () => {
    if (editingId == null) return;
    const target = items.find((s) => s.id === editingId);
    setItems((l) => l.filter((s) => s.id !== editingId));
    if (persistable && target?.dbId) deleteBizItem(target.dbId);
    setView('module'); setEditingId(null); flash(L('Artículo eliminado', 'Item deleted'));
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
  const nextGated = wizStep === 0 ? !!draft.name.trim() : wizStep === 1 ? !!draft.day.trim() : true;

  function editorSheets() {
    return (
      <>
        <RentalCategoryEditor open={catSheet.open} onClose={() => { setCatSheet((s) => ({ ...s, open: false })); setCatFromWiz(false); }} L={L} initial={catSheet.initial} itemCount={catSheet.initial ? countIn(catSheet.initial.id) : 0} onSave={upsertCategory} onDelete={deleteCategory} />
        <RentalAddonEditor open={addonSheet.open} onClose={() => setAddonSheet((s) => ({ ...s, open: false }))} L={L} initial={addonSheet.initial} usedCount={addonSheet.initial ? addonUsedBy(addonSheet.initial.id) : 0} onSave={upsertAddon} onDelete={deleteAddon} />
        <RentalPolicyEditor open={policySheet.open} onClose={() => { setPolicySheet((s) => ({ ...s, open: false })); setPolicyFromWiz(false); }} L={L} initial={policySheet.initial} onSave={upsertPolicy} onDelete={deletePolicy} />
      </>
    );
  }

  // ============================ FREE GATE ============================
  if (isFree) {
    return (
      <div className="pb-8">
        <div className={`${cardCls} flex flex-col items-center gap-3 p-8 text-center`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-btn-lg bg-lilac-2"><Lock size={22} stroke={2.2} className="text-primary-dark" /></span>
          <div className="text-[15px] font-extrabold text-ink">{L('La renta es parte del kit verificado', 'Rentals are part of the verified toolkit')}</div>
          <div className="max-w-[420px] text-[12.5px] font-semibold leading-relaxed text-muted">
            {L('Publica artículos para rentar por hora, día o semana — con depósitos, calendario y control de daños. Verifica tu negocio para activarlo.', 'List items to rent by hour, day or week — with deposits, a calendar and damage tracking. Verify your business to turn it on.')}
          </div>
          <button onClick={() => ctx.go('billing')} className="mt-1 cursor-pointer rounded-btn bg-primary px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm">{L('Iniciar verificación', 'Start verification')}</button>
        </div>
      </div>
    );
  }

  // ============================ SUCCESS ============================
  if (view === 'success') {
    const dc = catOf(draft.cat);
    return (
      <>
        <ModulePage title={L('¡Publicado!', 'Published!')} onBack={() => { setView('module'); setMode('items'); setItemSub('catalog'); }}>
          <div className="mx-auto flex max-w-[440px] flex-col items-center pb-4 pt-4 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-[18px] bg-green-bg text-green"><CheckCircle2 size={34} stroke={2.4} /></span>
            <div className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{(draft.name || L('Nuevo artículo', 'New item')) + ' ' + L('está disponible', 'is live')}</div>
            <div className="mt-2 max-w-[300px] text-[13px] font-medium leading-relaxed text-muted">{L('Ya aparece en la pestaña de Renta de tu listado público.', "It now appears on your public listing's Rentals tab.")}</div>
            <div className={`mt-5 w-full overflow-hidden text-left ${cardCls}`}>
              <div className="relative h-[104px]" style={{ background: stripe(dc.tile) }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {draft.photoUrl && <img src={draft.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              </div>
              <div className="flex items-center justify-between p-3.5">
                <div className="min-w-0">
                  <div className="text-[14px] font-extrabold text-ink">{draft.name || L('Nuevo artículo', 'New item')}</div>
                  <div className="mt-0.5 text-[11.5px] font-medium text-muted-2">{L(dc.es, dc.en)} · {draft.day ? `${money(Number(draft.day))}/${L('día', 'day')}` : '$0'}</div>
                </div>
                <span className="flex-none rounded-lg bg-green-bg px-2.5 py-1.5 text-[10.5px] font-extrabold text-green-dark">{L('Disponible', 'Available')}</span>
              </div>
            </div>
            <div className="mt-5 flex w-full flex-col gap-2.5">
              <button onClick={startAdd} className="flex items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta"><Plus size={16} stroke={2.6} />{L('Agregar otro artículo', 'Add another item')}</button>
              <button onClick={() => { setView('module'); setMode('items'); setItemSub('catalog'); }} className="rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3.5 text-[13.5px] font-extrabold text-ink">{L('Volver a artículos', 'Back to items')}</button>
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
            <div className={`text-[14px] font-extrabold ${draft.name ? 'text-ink' : 'text-muted-faint'}`}>{draft.name || L('Nombre del artículo', 'Item name')}</div>
            <div className="mt-0.5 text-[10.5px] font-medium text-muted-2">{L(dc.es, dc.en)}</div>
          </div>
          <span className="whitespace-nowrap text-[14px] font-extrabold text-ink">{draft.day ? `${money(Number(draft.day))}/${L('día', 'day')}` : '$0'}</span>
        </div>
      </div>
    );

    return (
      <>
        <ModulePage
          title={editingId != null ? L('Editar artículo', 'Edit item') : L('Nuevo artículo', 'New item')}
          subtitle={`${L(dc.es, dc.en)} · ${L('Paso', 'Step')} ${wizStep + 1}/${wizSteps.length}`}
          onBack={() => { setView('module'); setEditingId(null); }}
          backLabel={editingId != null ? L('Cerrar', 'Close') : L('Cancelar', 'Cancel')}
          maxW={940}
          footer={
            <div className="flex items-center gap-3">
              <button onClick={wizBack} className="flex-none cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3.5 text-[12.5px] font-extrabold text-ink">{wizStep === 0 ? (editingId != null ? L('Cerrar', 'Close') : L('Cancelar', 'Cancel')) : L('Atrás', 'Back')}</button>
              <button onClick={wizNext} disabled={!nextGated} className={`flex-1 rounded-btn-lg py-3.5 text-[13.5px] font-extrabold text-white ${nextGated ? 'cursor-pointer bg-primary shadow-cta-sm' : 'cursor-not-allowed bg-lilac-line'}`}>{wizStep >= wizSteps.length - 1 ? (editingId != null ? L('Guardar cambios', 'Save changes') : L('Publicar artículo', 'Publish item')) : L('Continuar', 'Continue')}</button>
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
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex-1"><div className={fieldLabel}>{L('Nombre (español)', 'Name (Spanish)')} *</div><input value={draft.name} onChange={(e) => upD({ name: e.target.value })} placeholder={L('Ej. Mesa larga', 'e.g. Long table')} className={fieldCls} /></div>
                    <div className="flex-1"><div className={fieldLabel}>{L('Nombre (inglés)', 'Name (English)')}</div><input value={draft.nameEn} onChange={(e) => upD({ nameEn: e.target.value })} placeholder={L('Opcional', 'Optional')} className={fieldCls} /></div>
                  </div>
                  <div><div className={fieldLabel}>{L('Descripción', 'Description')} <span className="font-semibold text-muted">· {es ? 'ES' : 'EN'}</span></div><textarea value={es ? draft.descEs : draft.descEn} onChange={(e) => upD(es ? { descEs: e.target.value } : { descEn: e.target.value })} rows={2} placeholder={L('Qué incluye, capacidad, para qué sirve…', 'What it includes, capacity, what it is for…')} className={`${fieldCls} resize-none leading-relaxed`} /></div>
                  <div>
                    <div className={fieldLabel}>{L('Categoría', 'Category')} *</div>
                    <ChipRow className="-mx-1 px-1">
                      {cfg.categories.filter((c) => c.visible || c.id === draft.cat).map((c) => <button key={c.id} onClick={() => upD({ cat: c.id })} className={chip(draft.cat === c.id)}>{L(c.es, c.en)}</button>)}
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
                        <button type="button" onClick={() => upD({ photoUrl: '' })} aria-label={L('Quitar foto', 'Remove photo')} className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-pink-dark shadow-card"><Trash2 size={14} stroke={2.2} /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickPhoto(e.dataTransfer.files?.[0]); }} disabled={photoBusy} className="relative flex h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-tile border-[1.5px] border-dashed border-lilac-line bg-app disabled:opacity-60">
                        {photoBusy ? (<><Loader2 size={20} className="animate-spin text-primary" stroke={2.2} /><span className="text-[12px] font-bold text-ink-soft">{L('Comprimiendo y subiendo…', 'Compressing & uploading…')}</span></>)
                          : (<><Upload size={20} className="text-primary" stroke={2} /><span className="text-[12px] font-bold text-ink-soft">{L('Arrastra o toca para subir', 'Drag or tap to upload')}</span><span className="text-[10px] font-medium text-muted-2">{L('JPG o PNG · se comprime sola', 'JPG or PNG · auto-compressed')}</span></>)}
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; pickPhoto(f); }} />
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex-1"><div className={fieldLabel}>{L('Cuántos (stock)', 'How many (stock)')}</div><input value={draft.stock} onChange={(e) => upD({ stock: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="1" className={fieldCls} /></div>
                    <div className="flex-1"><div className={fieldLabel}>{L('Unidad', 'Unit')}</div><input value={es ? draft.unitEs : draft.unitEn} onChange={(e) => upD(es ? { unitEs: e.target.value } : { unitEn: e.target.value })} placeholder={L('mesa, juego…', 'table, set…')} className={fieldCls} /></div>
                  </div>
                  <div>
                    <div className={fieldLabel}>{L('Etiquetas', 'Tags')}</div>
                    <div className="flex flex-wrap gap-2">
                      {[...RENT_TAGS, ...cfg.tags].map((t) => { const on = draft.tags.includes(t); return <button key={t} onClick={() => upD({ tags: on ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] })} className={chip(on)}>{RENT_TAGS.includes(t) ? tagLabel(t, L) : t}</button>; })}
                      <button onClick={() => setTagSheet(true)} className="cursor-pointer rounded-full border-[1.5px] border-dashed border-lilac-line px-3.5 py-2 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar', 'Add')}</button>
                    </div>
                  </div>
                </div>
              )}

              {wizStep === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="text-[11px] font-medium leading-snug text-muted">{L('Define al menos la tarifa diaria. Hora y semana son opcionales.', 'Set at least the daily rate. Hour and week are optional.')}</div>
                  <div className="flex gap-3">
                    <div className="flex-1"><div className={fieldLabel}>{L('Hora', 'Hour')}</div><MoneyInput value={draft.hour} onChange={(v) => upD({ hour: v })} placeholder="—" /></div>
                    <div className="flex-1"><div className={fieldLabel}>{L('Día', 'Day')} *</div><MoneyInput value={draft.day} onChange={(v) => upD({ day: v })} placeholder="0" /></div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1"><div className={fieldLabel}>{L('Semana', 'Week')}</div><MoneyInput value={draft.week} onChange={(v) => upD({ week: v })} placeholder="—" /></div>
                    <div className="flex-1"><div className={fieldLabel}>{L('Depósito', 'Deposit')}</div><MoneyInput value={draft.dep} onChange={(v) => upD({ dep: v })} placeholder="0" /></div>
                  </div>
                </div>
              )}

              {wizStep === 2 && (
                <div className="flex flex-col gap-2.5">
                  <div className="text-[11px] font-medium leading-relaxed text-muted">{L('Extras reutilizables que el cliente agrega al rentar (entrega, montaje, seguro…). Opcional.', 'Reusable extras the customer adds when renting (delivery, setup, insurance…). Optional.')}</div>
                  {cfg.addons.length === 0 && (
                    <div className="rounded-field border-[1.5px] border-dashed border-lilac-line bg-app px-4 py-5 text-center text-[12px] font-semibold text-muted">{L('Aún no tienes extras.', "You don't have add-ons yet.")}</div>
                  )}
                  {cfg.addons.map((a) => {
                    const on = draft.addons.includes(a.id);
                    return (
                      <button key={a.id} onClick={() => upD({ addons: on ? draft.addons.filter((x) => x !== a.id) : [...draft.addons, a.id] })} className={`flex w-full items-center gap-3 rounded-btn-lg border-[1.5px] p-3 ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                        <span className={`flex h-4 w-4 flex-none items-center justify-center rounded ${on ? 'bg-primary' : 'bg-lilac-line'}`}>{on && <Check size={10} className="text-white" stroke={3.4} />}</span>
                        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-lilac"><Zap size={15} className="text-primary-dark" stroke={2.2} /></span>
                        <span className="min-w-0 flex-1 text-left"><span className="block text-[12.5px] font-extrabold text-ink">{L(a.es, a.en ?? a.es)}</span></span>
                        <span className="flex-none text-[12px] font-extrabold text-ink">{a.price ? `+$${a.price}` : L('Gratis', 'Free')}</span>
                      </button>
                    );
                  })}
                  <button onClick={() => setAddonSheet({ open: true, initial: null })} className="mt-1 w-full cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-app py-3 text-[12px] font-extrabold text-primary-dark">+ {L('Nuevo extra', 'New add-on')}</button>
                </div>
              )}

              {wizStep === 3 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <div className={fieldLabel}>{L('Disponibilidad', 'Availability')}</div>
                    <ChipRow className="-mx-1 px-1">{AVAILS.map(([e, en]) => <button key={e} onClick={() => upD({ avail: e })} className={chip(draft.avail === e)}>{L(e, en)}</button>)}</ChipRow>
                  </div>
                  <div>
                    <div className={fieldLabel}>{L('Políticas', 'Policies')}</div>
                    <div className="mb-2 text-[10.5px] font-medium leading-snug text-muted">{L('Elige las que aplican a este artículo. Gestiónalas en la pestaña Políticas.', 'Pick the ones that apply to this item. Manage them in the Policies tab.')}</div>
                    <div className="flex flex-col gap-2">
                      {cfg.policies.map((p) => {
                        const on = draft.policies.includes(p.id);
                        const toggle = () => upD({ policies: on ? draft.policies.filter((x) => x !== p.id) : [...draft.policies, p.id] });
                        return (
                          <div key={p.id} className="flex items-center gap-3 rounded-field border border-hair bg-app p-3">
                            <button type="button" onClick={toggle} className="min-w-0 flex-1 cursor-pointer text-left"><span className="block text-[12px] font-bold text-ink">{L(p.es, p.en)}</span>{(p.subEs || p.subEn) && <span className="block text-[10px] font-medium text-muted-2">{L(p.subEs ?? '', p.subEn ?? p.subEs ?? '')}</span>}</button>
                            <Toggle on={on} onClick={toggle} />
                          </div>
                        );
                      })}
                      <button onClick={() => { setPolicyFromWiz(true); setPolicySheet({ open: true, initial: null }); }} className="w-full cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-app py-3 text-[12px] font-extrabold text-primary-dark">+ {L('Nueva política', 'New policy')}</button>
                    </div>
                  </div>
                </div>
              )}

              {wizStep === 4 && (() => {
                const editing = editingId != null;
                const addonNames = draft.addons.map((id) => addonOf(id)).filter(Boolean).map((a) => L(a!.es, a!.en ?? a!.es));
                const rateStr = [draft.hour ? `${money(Number(draft.hour))}/h` : null, draft.day ? `${money(Number(draft.day))}/${L('día', 'day')}` : null, draft.week ? `${money(Number(draft.week))}/${L('sem', 'wk')}` : null].filter(Boolean).join(' · ') || '—';
                const rows: [string, string, boolean, number][] = [
                  [L('Nombre', 'Name'), draft.name || '—', !!draft.name, 0],
                  [L('Categoría', 'Category'), L(dc.es, dc.en), true, 0],
                  [L('Tarifas', 'Rates'), rateStr, !!draft.day, 1],
                  [L('Depósito', 'Deposit'), draft.dep ? money(Number(draft.dep)) : L('Sin depósito', 'No deposit'), true, 1],
                  [L('Extras', 'Add-ons'), addonNames.length ? addonNames.join(', ') : L('Ninguno', 'None'), true, 2],
                  [L('Disponibilidad', 'Availability'), L(draft.avail, AVAILS.find(([e]) => e === draft.avail)?.[1] ?? draft.avail), true, 3],
                ];
                return (
                  <div className="flex flex-col gap-4">
                    <div className={`flex items-center gap-3 rounded-btn-lg border p-3.5 ${draftReady ? 'border-[#A7E3C0] bg-green-bg' : 'border-[#FDE68A] bg-amber-bg'}`}>
                      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-white text-[15px] font-extrabold ${draftReady ? 'text-green-dark' : 'text-amber-ink'}`}>{draftReady ? '✓' : '⚠'}</span>
                      <div className="min-w-0">
                        <div className={`text-[12px] font-extrabold ${draftReady ? 'text-green-dark' : 'text-amber-ink'}`}>{draftReady ? (editing ? L('Listo para guardar', 'Ready to save') : L('Listo para publicar', 'Ready to publish')) : L('Faltan datos', 'A few essentials missing')}</div>
                        <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-ink-3">{draftReady ? L('Aparecerá disponible para rentar.', "It'll appear available to rent.") : L('Agrega nombre y tarifa diaria antes de continuar.', 'Add a name and daily rate before continuing.')}</div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-btn-lg border border-hair">
                      {rows.map((r, i, a) => (
                        <div key={r[0]} className={`flex items-center gap-3 px-3.5 py-3 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}>
                          <span className="w-24 flex-none text-[10.5px] font-semibold text-muted-2">{r[0]}</span>
                          <span className={`min-w-0 flex-1 truncate text-[11.5px] font-bold ${r[2] ? 'text-ink' : 'text-muted-faint'}`}>{r[1]}</span>
                          <button onClick={() => setWizStep(r[3])} className="flex-none cursor-pointer text-[10.5px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
                        </div>
                      ))}
                    </div>
                    {editing && (
                      <div>
                        <div className={fieldLabel}>{L('Administrar artículo', 'Manage item')}</div>
                        <div className="flex gap-2.5">
                          <button onClick={duplicateFromDraft} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3 text-[12.5px] font-extrabold text-ink"><Copy size={14} stroke={2.4} />{L('Duplicar', 'Duplicate')}</button>
                          <button onClick={() => setConfirmDel(true)} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-pink-bg bg-white py-3 text-[12.5px] font-extrabold text-pink-dark"><Trash2 size={14} stroke={2.4} />{L('Eliminar', 'Delete')}</button>
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
        <QuickTagSheet open={tagSheet} onClose={() => setTagSheet(false)} L={L} onCreate={addTag} existing={[...RENT_TAGS, ...cfg.tags]} />
        <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={() => { setConfirmDel(false); deleteEditing(); }} title={L('¿Eliminar artículo?', 'Delete item?')} message={L(`“${draft.name || L('Este artículo', 'This item')}” se quitará de tu listado. Esta acción no se puede deshacer.`, `“${draft.name || 'This item'}” will be removed from your listing. This can’t be undone.`)} confirmLabel={L('Eliminar', 'Delete')} cancelLabel={L('Cancelar', 'Cancel')} />
        <Toast msg={toast} />
      </>
    );
  }

  // ============================ DRILL-IN: DETAIL / RENT-OUT / RETURN ============================
  if (selected && flow === null) {
    return (
      <>
        <ItemDetail item={selected} ctx={ctx} catName={catLabelOf(selected.cat)} tile={tileOf(selected)} statusOf={statusOf} availOf={availOf}
          policyList={cfg.policies.filter((p) => selected.policies.includes(p.id))} walkIn={!persistable}
          onClose={() => setOpenId(null)} onEdit={() => startEdit(selected)} onRentOut={() => setFlow('rentout')} onReturn={() => setFlow('return')} />
        <Toast msg={toast} />
      </>
    );
  }
  if (selected && flow === 'rentout') {
    return (
      <>
        <RentOutFlow item={selected} ctx={ctx} tile={tileOf(selected)} onBackToDetail={() => setFlow(null)} onDone={() => { setFlow(null); setOpenId(null); flash(L('Rentado · depósito cobrado', 'Rented · deposit charged')); }} />
        <Toast msg={toast} />
      </>
    );
  }
  if (selected && flow === 'return') {
    return (
      <>
        <ReturnFlow item={selected} ctx={ctx} tile={tileOf(selected)} onClose={() => setFlow(null)} onDone={() => { setFlow(null); setOpenId(null); flash(L('Depósito devuelto', 'Deposit refunded')); }} />
        <Toast msg={toast} />
      </>
    );
  }

  // ============================ MODULE ============================
  const modeBtn = (on: boolean) => `flex flex-1 items-center justify-center gap-2 rounded-btn py-2.5 text-[12.5px] font-extrabold ${on ? 'bg-ink text-white' : 'bg-lilac-2 text-ink-2'}`;

  const kpis = [
    { Icon: Boxes, c: '#6D4DF6', bg: '#EFEBFF', label: L('Artículos', 'Items'), value: String(items.length) },
    { Icon: CalendarDays, c: '#D6336C', bg: '#FDE7EF', label: L('Unidades libres', 'Units free'), value: String(items.reduce((a, it) => a + availOf(it), 0)) },
    { Icon: Package, c: '#2A5C8A', bg: '#E4ECFB', label: L('Rentadas', 'Units out'), value: String(items.reduce((a, it) => a + it.out, 0)) },
    { Icon: DollarSign, c: '#1F8A4C', bg: '#E3F5EA', label: L('Rentas/mes', 'Rentals/mo'), value: String(items.reduce((a, it) => a + it.booked, 0)) },
  ];

  const groups = cfg.categories.filter((c) => c.visible).map((c) => ({ cat: c, list: items.filter((s) => s.cat === c.id) }))
    .concat([{ cat: FALLBACK_CAT, list: items.filter((s) => !cfg.categories.some((c) => c.id === s.cat)) }])
    .filter((g) => g.list.length);

  // ---- items · catalog ----
  const catalog = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${cardCls} p-3.5`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: k.bg }}><k.Icon size={15} strokeWidth={2.2} style={{ color: k.c }} /></span>
            <div className="mt-2 text-[11px] font-bold text-muted">{k.label}</div>
            <div className="mt-0.5 text-[19px] font-extrabold text-ink">{k.value}</div>
          </div>
        ))}
      </div>

      {/* MODE: display-only vs online rentals */}
      <div className={`${cardCls} p-3.5`}>
        <div className="mb-2 flex items-center gap-2 text-[12.5px] font-extrabold text-ink"><CalendarDays size={15} stroke={2.2} className="text-primary-dark" />{L('Modo del listado', 'Listing mode')}</div>
        <div className="flex rounded-full bg-lilac-2 p-0.5">
          <button onClick={() => { if (cfg.renting) { saveCfg({ ...cfg, renting: false }); flash(L('Renta en modo Solo mostrar', 'Rentals set to Display only')); } }} className={`flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${!cfg.renting ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`}>{L('Solo mostrar', 'Display only')}</button>
          <button onClick={() => { if (!cfg.renting) { saveCfg({ ...cfg, renting: true }); flash(L('Renta en línea activada', 'Online rentals enabled')); } }} className={`flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${cfg.renting ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`}>{L('Aceptar rentas', 'Accept rentals')}</button>
        </div>
        <p className="mt-2 text-[11px] font-medium leading-relaxed text-muted">
          {cfg.renting
            ? L('Tu listado muestra tus artículos y los clientes pueden rentar en línea (botón Rentar).', 'Your listing shows items and customers can rent online (Rentar button).')
            : L('Tu listado muestra tus artículos y tarifas. Los clientes te llaman o visitan para rentar — sin renta en línea.', 'Your listing shows items & rates. Customers call or visit to rent — no online renting.')}
        </p>
      </div>

      {/* APPROVAL MODE — auto-confirm vs manual approval (like Servicios) */}
      {cfg.renting && (
        <div className={`${cardCls} p-3.5`}>
          <div className="mb-2 flex items-center gap-2 text-[12.5px] font-extrabold text-ink"><CheckCircle2 size={15} stroke={2.2} className="text-primary-dark" />{L('Confirmación de rentas', 'Rental confirmation')}</div>
          <div className="flex rounded-full bg-lilac-2 p-0.5">
            <button onClick={() => { if (cfg.autoConfirm) { saveCfg({ ...cfg, autoConfirm: false }); flash(L('Las rentas requieren tu aprobación', 'Rentals now need your approval')); } }} className={`flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${!cfg.autoConfirm ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`}>{L('Requiere aprobación', 'Needs approval')}</button>
            <button onClick={() => { if (!cfg.autoConfirm) { saveCfg({ ...cfg, autoConfirm: true }); flash(L('Las rentas se confirman automáticamente', 'Rentals now confirm automatically')); } }} className={`flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${cfg.autoConfirm ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`}>{L('Automática', 'Automatic')}</button>
          </div>
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-muted">
            {cfg.autoConfirm
              ? L('La renta queda confirmada al instante cuando el cliente la pide.', 'The rental is confirmed instantly when the customer requests it.')
              : L('Cada renta llega como «Pendiente». Tú la confirmas o rechazas — el cliente recibe aviso.', 'Each rental arrives as “Pending”. You confirm or decline — the customer is notified.')}
          </p>
          {/* Payment is a BUSINESS-level fact derived from Stripe Connect (canonical
              rule) — never a per-item flag. The refundable deposit is ALWAYS at pickup. */}
          <p className="mt-1.5 text-[10.5px] font-semibold leading-relaxed text-muted-2">
            {real?.connect_charges_enabled
              ? L('Tienes Stripe conectado: tus clientes pagan la renta en línea al solicitarla. El depósito reembolsable se cobra al entregar.', 'Stripe is connected: customers pay the rental online when they request it. The refundable deposit is collected at handout.')
              : L('El pago y el depósito reembolsable se cobran al recoger. Conecta Stripe (Ajustes → Pagos) para cobrar la renta en línea.', 'Payment and the refundable deposit are collected at pickup. Connect Stripe (Settings → Payments) to charge rentals online.')}
          </p>
        </div>
      )}

      {groups.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Aún no tienes artículos — agrega el primero.', 'No items yet — add your first one.')}</div>
      ) : groups.map((g) => (
        <div key={g.cat.id}>
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-white" style={{ background: stripe(g.cat.tile) }}>{(() => { const Icon = rentCatIcon(g.cat.icon); return <Icon size={16} strokeWidth={2.2} />; })()}</span>
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-ink">{L(g.cat.es, g.cat.en)}</div>
              <div className="text-[10px] font-semibold text-muted-2">{g.list.length} {g.list.length === 1 ? L('artículo', 'item') : L('artículos', 'items')}</div>
            </div>
          </div>
          <div className="grid gap-2.5 md:grid-cols-2">
            {g.list.map((it) => {
              const s = statusOf(it);
              return (
                <button key={it.id} onClick={() => { setOpenId(it.id); setFlow(null); }} className={`${cardCls} cursor-pointer p-3 text-left`}>
                  <div className="flex gap-3">
                    <span className="relative h-[60px] w-[60px] flex-none overflow-hidden rounded-tile" style={{ background: stripe(tileOf(it)) }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {it.imageUrl && <img src={it.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[13.5px] font-extrabold text-ink">{L(it.es, it.en)}</span><Pencil size={11} stroke={2.4} className="flex-none text-muted-faint" /></span>
                        <span className="whitespace-nowrap text-[13.5px] font-extrabold text-ink">{money(it.day)}/{L('día', 'day')}</span>
                      </span>
                      <span className="mt-0.5 block text-[10.5px] font-semibold text-muted-2">{L(it.availEs, it.availEn)} · {availOf(it)}/{it.stock} {L(it.unitEs, it.unitEn)}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9.5px] font-extrabold ${s.cls}`}><span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />{s.label}</span>
                        {it.dep > 0 && <span className="rounded-md bg-lilac px-1.5 py-0.5 text-[9px] font-extrabold text-primary-dark">{L('Depósito', 'Deposit')} {money(it.dep)}</span>}
                        {it.addons.length > 0 && <span className="rounded-md bg-lilac-2 px-1.5 py-0.5 text-[9px] font-extrabold text-ink-2">{it.addons.length} {L('extras', 'add-ons')}</span>}
                        {it.tags.map((t) => <span key={t} className="rounded-md bg-amber-bg px-1.5 py-0.5 text-[9px] font-extrabold text-amber-ink">{tagLabel(t, L)}</span>)}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button onClick={startAdd} className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[14px] font-extrabold text-white shadow-cta-sm"><Plus size={16} stroke={2.6} />{L('Nuevo artículo', 'New item')}</button>
    </div>
  );

  // ---- items · categories ----
  const categoriesTab = (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3 text-[11.5px] font-medium leading-relaxed text-ink-3">{cfg.categories.length}{L(' categorías · toca para editar · reordena con las flechas · activa/desactiva para mostrar', ' categories · tap to edit · reorder with the arrows · toggle to show')}</div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {cfg.categories.map((c, i) => {
          const Icon = rentCatIcon(c.icon); const n = countIn(c.id);
          return (
            <div key={c.id} className={`flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 shadow-card ${c.visible ? '' : 'opacity-60'}`}>
              <span className="flex flex-none flex-col">
                <button onClick={() => moveCategory(c.id, -1)} disabled={i === 0} aria-label={L('Subir', 'Up')} className="cursor-pointer p-0.5 text-muted-2 disabled:opacity-25"><ChevronUp size={13} stroke={2.6} /></button>
                <button onClick={() => moveCategory(c.id, 1)} disabled={i === cfg.categories.length - 1} aria-label={L('Bajar', 'Down')} className="cursor-pointer p-0.5 text-muted-2 disabled:opacity-25"><ChevronDown size={13} stroke={2.6} /></button>
              </span>
              <button onClick={() => setCatSheet({ open: true, initial: c })} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[11px] text-white" style={{ background: stripe(c.tile) }}><Icon size={18} strokeWidth={2.2} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-ink">{L(c.es, c.en)}</span><Pencil size={11} stroke={2.4} className="flex-none text-muted-faint" />{!c.visible && <span className="rounded bg-lilac-2 px-1.5 py-px text-[8.5px] font-extrabold text-muted-2">{L('Oculto', 'Hidden')}</span>}</div>
                  <div className="mt-0.5 text-[10px] font-semibold text-muted-2">{n} {n === 1 ? L('artículo', 'item') : L('artículos', 'items')}</div>
                </div>
              </button>
              <Toggle on={c.visible} onClick={() => toggleCategory(c.id)} />
            </div>
          );
        })}
      </div>
      <button onClick={() => setCatSheet({ open: true, initial: null })} className={addBtn}>+ {L('Nueva categoría', 'New category')}</button>
    </div>
  );

  // ---- items · add-ons ----
  const addonsTab = (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3.5 flex items-center gap-3 rounded-tile bg-lilac-2 p-3">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-primary"><Zap size={15} className="text-white" stroke={2.2} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[12px] font-extrabold text-ink">{L('Extras reutilizables', 'Reusable extras')}</span><span className="block text-[10.5px] font-medium leading-snug text-ink-3">{L('Crea un extra una vez (entrega, montaje…), úsalo en cualquier artículo.', 'Build an add-on once (delivery, setup…), use it on any item.')}</span></span>
      </div>
      {cfg.addons.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Aún no hay extras — crea el primero (ej. Entrega, Montaje).', 'No add-ons yet — create your first (e.g. Delivery, Setup).')}</div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {cfg.addons.map((a) => {
            const used = addonUsedBy(a.id);
            return (
              <button key={a.id} onClick={() => setAddonSheet({ open: true, initial: a })} className="flex cursor-pointer items-center gap-3 rounded-card-sm border border-hair bg-white p-3 text-left shadow-card">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-lilac"><Zap size={16} className="text-primary-dark" stroke={2.2} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-ink">{L(a.es, a.en ?? a.es)}</span><Pencil size={11} stroke={2.4} className="flex-none text-muted-faint" /></span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-muted-2">{used} {used === 1 ? L('artículo', 'item') : L('artículos', 'items')}</span>
                </span>
                <span className="flex-none text-[13px] font-extrabold text-ink">{a.price ? `+$${a.price}` : L('Gratis', 'Free')}</span>
              </button>
            );
          })}
        </div>
      )}
      <button onClick={() => setAddonSheet({ open: true, initial: null })} className={addBtn}>+ {L('Nuevo extra', 'New add-on')}</button>
    </div>
  );

  // ---- items · policies ----
  const policiesTab = (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3.5 flex items-center gap-3 rounded-tile bg-lilac-2 p-3">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-primary"><Shield size={15} className="text-white" stroke={2.2} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[12px] font-extrabold text-ink">{L('Políticas y exenciones', 'Policies & waivers')}</span><span className="block text-[10.5px] font-medium leading-snug text-ink-3">{L('Crea los términos de renta (exención, depósito, cargos…) y elige cuáles aplican a cada artículo.', 'Create rental terms (waiver, deposit, fees…) and choose which apply to each item.')}</span></span>
      </div>
      {cfg.policies.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Aún no hay políticas — crea la primera (ej. Exención de responsabilidad).', 'No policies yet — create your first (e.g. Liability waiver).')}</div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {cfg.policies.map((p) => {
            const used = policyUsedBy(p.id);
            return (
              <button key={p.id} onClick={() => setPolicySheet({ open: true, initial: p })} className="flex cursor-pointer items-center gap-3 rounded-card-sm border border-hair bg-white p-3 text-left shadow-card">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-lilac"><Shield size={16} className="text-primary-dark" stroke={2.2} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-ink">{L(p.es, p.en)}</span><Pencil size={11} stroke={2.4} className="flex-none text-muted-faint" />{p.default && <span className="rounded bg-green-bg px-1.5 py-px text-[8.5px] font-extrabold text-green-dark">{L('Por defecto', 'Default')}</span>}</span>
                  <span className="mt-0.5 block truncate text-[10px] font-semibold text-muted-2">{(p.subEs || p.subEn) ? L(p.subEs ?? '', p.subEn ?? p.subEs ?? '') : `${used} ${used === 1 ? L('artículo', 'item') : L('artículos', 'items')}`}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <button onClick={() => setPolicySheet({ open: true, initial: null })} className={addBtn}>+ {L('Nueva política', 'New policy')}</button>
    </div>
  );

  // ---- items · pricing ----
  const pricingPane = (
    <div className="flex flex-col gap-3">
      <div className="text-[11.5px] font-medium leading-relaxed text-muted">{L('Tarifas por hora, día y semana, más depósito por artículo.', 'Hourly, daily and weekly rates, plus deposit per item.')}</div>
      {items.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Aún no tienes artículos.', 'No items yet.')}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <div key={it.id} className={`${cardCls} p-3`}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="h-9 w-9 flex-none rounded-[10px]" style={{ background: stripe(tileOf(it)) }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-extrabold text-ink">{L(it.es, it.en)}</span>
                  <span className="block text-[9.5px] font-semibold text-muted-2">{L('Depósito', 'Deposit')} {money(it.dep)}</span>
                </span>
              </div>
              <div className="flex gap-1.5">
                {[{ l: L('Hora', 'Hour'), v: it.hour, on: it.hour != null }, { l: L('Día', 'Day'), v: it.day, on: true }, { l: L('Semana', 'Week'), v: it.week, on: it.week > 0 }].map((r) => (
                  <div key={r.l} className={`flex-1 rounded-[9px] py-2 text-center ${r.on ? 'bg-app' : 'bg-lilac-3'}`}>
                    <div className="text-[8.5px] font-semibold text-muted-2">{r.l}</div>
                    <div className={`mt-0.5 text-[12px] font-extrabold ${r.on ? 'text-ink' : 'text-muted-faint'}`}>{r.v != null && r.on ? money(r.v) : '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ---- ops · one clear operations screen (below) ----
  const reqSeed: RentalReq[] = [
    { id: 's1', customer_name: 'Mariana Vélez', item_name: L('Vajilla de fiesta · 100', 'Party tableware · 100'), items: [{ name: L('Vajilla de fiesta · 100', 'Party tableware · 100'), qty: 1 }, { name: L('Mesa larga', 'Long table'), qty: 4 }], start_at: '2026-07-12T15:00:00Z', end_at: '2026-07-13T15:00:00Z', total: 320, deposit: 200, status: 'pending', paid: false, depositStatus: 'none', depositCaptured: 0 },
    { id: 's2', customer_name: 'Coffee Mfg.', item_name: L('Bocina y micrófono', 'Speaker & microphone'), items: [{ name: L('Bocina y micrófono', 'Speaker & microphone'), qty: 1 }], start_at: '2026-07-17T18:00:00Z', end_at: '2026-07-17T23:00:00Z', total: 170, deposit: 80, status: 'confirmed', paid: true, depositStatus: 'held', depositCaptured: 0 },
    { id: 's3', customer_name: 'Park Studios', item_name: L('Carpa 10×20', 'Tent 10×20'), items: [{ name: L('Carpa 10×20', 'Tent 10×20'), qty: 1 }, { name: L('Silla plegable', 'Folding chair'), qty: 40 }], start_at: '2026-07-05T14:00:00Z', end_at: '2026-07-06T14:00:00Z', total: 260, deposit: 200, status: 'out', paid: true, depositStatus: 'held', depositCaptured: 0 },
    { id: 's4', customer_name: 'Luis R.', item_name: L('Mesa redonda', 'Round table'), items: [{ name: L('Mesa redonda', 'Round table'), qty: 8 }], start_at: '2026-06-28T14:00:00Z', end_at: '2026-06-29T14:00:00Z', total: 72, deposit: 40, status: 'returned', paid: true, depositStatus: 'released', depositCaptured: 0 },
  ];
  const reqList = reqRows ?? reqSeed;
  const fmtReqDate = (iso: string) => new Date(iso).toLocaleDateString(es ? 'es-US' : 'en-US', { day: 'numeric', month: 'short' });
  // ── OPERACIÓN · one real screen: how-it-works + pipeline grouped by what YOU
  // need to do next. (Replaced the old Calendario/Depósitos/Daños sub-tabs, which
  // showed FAKE data — a fake calendar, fabricated "$430 held" deposits and made-up
  // damage reports — that made the flow impossible to understand. Real deposit +
  // damage tooling returns for real with the Stripe deposit hold, Fase 3.)
  const orderCard = (r: RentalReq) => {
    const st = REQ_STATUS[r.status] ?? REQ_STATUS.pending;
    return (
      <div key={r.id} className={`${cardCls} p-3.5`}>
        <div className="flex items-start gap-2.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-extrabold text-ink">{r.customer_name || L('Cliente', 'Customer')}</span>
            <span className="mt-0.5 block text-[11px] font-semibold text-muted-2">
              {r.items.length > 0 ? r.items.map((it) => `${it.qty}× ${it.name}`).join(' · ') : r.item_name}
            </span>
          </span>
          <span className="flex flex-none flex-col items-end gap-1">
            <span className={`rounded-md px-2 py-1 text-[9px] font-extrabold ${st.cls}`}>{L(st.es, st.en)}</span>
            {r.paid && <span className="rounded-md bg-green-bg px-2 py-1 text-[9px] font-extrabold text-green-dark">{L('Pagada', 'Paid')}</span>}
          </span>
        </div>
        <div className="mt-2.5 flex items-center gap-2 border-t border-hair pt-2.5 text-[10.5px] font-semibold text-muted-2">
          <span className="min-w-0 truncate">{r.items.length || 1} {(r.items.length || 1) === 1 ? L('artículo', 'item') : L('artículos', 'items')} · {fmtReqDate(r.start_at)}{r.end_at ? ` – ${fmtReqDate(r.end_at)}` : ''}</span>
          <span className="ml-auto flex-none text-[12px] font-extrabold text-ink">{r.total != null ? money(Number(r.total)) : '—'}</span>
        </div>
        {r.deposit != null && Number(r.deposit) > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] font-semibold text-muted-2">
            <span>{L('Depósito', 'Deposit')} {money(Number(r.deposit))}</span>
            {/* Real hold state (0101) vs cash-at-pickup */}
            {r.depositStatus === 'held' && <span className="rounded bg-amber-bg px-1.5 py-0.5 font-extrabold text-amber-ink">{L('Retenido en tarjeta', 'Held on card')}</span>}
            {r.depositStatus === 'released' && <span className="rounded bg-green-bg px-1.5 py-0.5 font-extrabold text-green-dark">{L('Liberado', 'Released')}</span>}
            {r.depositStatus === 'captured' && <span className="rounded bg-pink-bg px-1.5 py-0.5 font-extrabold text-pink-dark">{L(`Cobrado ${money(r.depositCaptured)}`, `Charged ${money(r.depositCaptured)}`)}</span>}
            {r.depositStatus === 'failed' && <span className="rounded bg-lilac-2 px-1.5 py-0.5 font-extrabold text-ink-2">{L('Cobra en efectivo al recoger', 'Collect cash at pickup')}</span>}
            {r.depositStatus === 'none' && r.paid && <span>· {L('cóbralo al entregar', 'collect at handout')}</span>}
          </div>
        )}
        {(r.status === 'pending' || r.status === 'confirmed' || r.status === 'out') && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {r.status === 'pending' && (<button onClick={() => setReqStatus(r.id, 'confirmed')} className="flex-1 cursor-pointer rounded-field bg-primary py-2 text-[11px] font-extrabold text-white shadow-cta-sm">{L('Confirmar', 'Confirm')}</button>)}
            {r.status === 'confirmed' && (<button onClick={() => setReqStatus(r.id, 'out')} className="flex-1 cursor-pointer rounded-field bg-primary py-2 text-[11px] font-extrabold text-white shadow-cta-sm">{r.depositStatus === 'held' ? L('Entregar', 'Hand out') : L('Entregar · toma el depósito', 'Hand out · take deposit')}</button>)}
            {r.status === 'out' && (
              <>
                <button disabled={depBusy} onClick={() => returnAndRelease(r)} className="flex-1 cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white py-2 text-[11px] font-extrabold text-ink disabled:opacity-50">{r.depositStatus === 'held' ? L('Devuelto · liberar depósito', 'Returned · release deposit') : L('Devuelto · regresa el depósito', 'Returned · refund deposit')}</button>
                {r.depositStatus === 'held' && (<button disabled={depBusy} onClick={() => { setDamageFor(r); setDamageAmt(''); }} className="flex-none cursor-pointer rounded-field bg-pink-bg px-3 py-2 text-[11px] font-extrabold text-pink-dark disabled:opacity-50">{L('Daño', 'Damage')}</button>)}
              </>
            )}
            {r.status === 'pending' && (<button onClick={() => setReqStatus(r.id, 'cancelled')} className="flex-none cursor-pointer rounded-field bg-lilac-2 px-3 py-2 text-[11px] font-extrabold text-ink-2">{L('Rechazar', 'Decline')}</button>)}
          </div>
        )}
      </div>
    );
  };
  const opsSteps: { n: string; es: string; en: string; subEs: string; subEn: string }[] = [
    { n: '1', es: 'Llega la solicitud', en: 'Request arrives', subEs: 'Pendiente (o pagada en línea)', subEn: 'Pending (or paid online)' },
    { n: '2', es: 'Confirmas', en: 'You confirm', subEs: 'Reservas el equipo', subEn: 'You reserve the gear' },
    { n: '3', es: 'Entregas', en: 'You hand out', subEs: 'Tomas el depósito', subEn: 'Take the deposit' },
    { n: '4', es: 'Te lo devuelven', en: 'They return it', subEs: 'Regresas el depósito', subEn: 'Refund the deposit' },
  ];
  const opsPending = reqList.filter((r) => r.status === 'pending');
  const opsConfirmed = reqList.filter((r) => r.status === 'confirmed');
  const opsInUse = reqList.filter((r) => r.status === 'out');
  const opsHistory = reqList.filter((r) => r.status === 'returned' || r.status === 'cancelled');
  const opsGroup = (title: string, sub: string, rows: RentalReq[], dot: string) => rows.length === 0 ? null : (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`h-2 w-2 flex-none rounded-full ${dot}`} />
        <span className="text-[12.5px] font-extrabold text-ink">{title}</span>
        <span className="rounded-md bg-lilac-2 px-1.5 py-0.5 text-[10px] font-extrabold text-ink-2">{rows.length}</span>
        <span className="text-[10.5px] font-semibold text-muted-2">{sub}</span>
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">{rows.map(orderCard)}</div>
    </div>
  );
  const opsPane = (
    <div className="flex flex-col gap-5">
      {/* how a rental works — the flow, obvious at a glance */}
      <div className={`${cardCls} p-3.5`}>
        <div className="mb-2.5 text-[12px] font-extrabold text-ink">{L('Cómo funciona una renta', 'How a rental works')}</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {opsSteps.map((s) => (
            <div key={s.n} className="flex items-start gap-2 rounded-field bg-app p-2.5">
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary text-[10px] font-extrabold text-white">{s.n}</span>
              <span className="min-w-0">
                <span className="block text-[11px] font-extrabold leading-tight text-ink">{L(s.es, s.en)}</span>
                <span className="mt-0.5 block text-[9.5px] font-semibold leading-tight text-muted-2">{L(s.subEs, s.subEn)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* real counts */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`${cardCls} p-3`}><div className="text-[10px] font-bold text-muted">{L('Por confirmar', 'To confirm')}</div><div className="mt-0.5 text-[19px] font-extrabold text-ink">{opsPending.length}</div></div>
        <div className={`${cardCls} p-3`}><div className="text-[10px] font-bold text-muted">{L('Por entregar', 'To hand out')}</div><div className="mt-0.5 text-[19px] font-extrabold text-ink">{opsConfirmed.length}</div></div>
        <div className={`${cardCls} p-3`}><div className="text-[10px] font-bold text-muted">{L('En uso', 'Out now')}</div><div className="mt-0.5 text-[19px] font-extrabold text-ink">{opsInUse.length}</div></div>
      </div>
      {/* the pipeline, grouped by what YOU need to do next */}
      {opsPending.length + opsConfirmed.length + opsInUse.length + opsHistory.length === 0 ? (
        <div className={`${cardCls} p-8 text-center text-[12.5px] font-semibold text-muted`}>{falloRentas
          ? L('No pudimos cargar tus rentas. Revisa tu conexión y vuelve a entrar.', "We couldn't load your rentals. Check your connection and come back.")
          : L('Sin rentas por ahora. Cuando un cliente rente, aparece aquí para manejarla paso a paso.', 'No rentals yet. When a customer rents, it shows here to manage step by step.')}</div>
      ) : (
        <div className="flex flex-col gap-5">
          {opsGroup(L('Acción necesaria', 'Needs action'), L('Confírmala o recházala', 'Confirm or decline'), opsPending, 'bg-amber')}
          {opsGroup(L('Por entregar', 'To hand out'), L('Confirmadas — entrégalas y toma el depósito', 'Confirmed — hand out & take the deposit'), opsConfirmed, 'bg-primary')}
          {opsGroup(L('En uso', 'Out now'), L('Con el cliente — márcalas devueltas al regresar', 'With the customer — mark returned on return'), opsInUse, 'bg-green')}
          {opsHistory.length > 0 && (
            <div>
              <button onClick={() => setHistOpen((v) => !v)} className="flex cursor-pointer items-center gap-2 text-[12px] font-extrabold text-muted-2">
                {histOpen ? <ChevronUp size={14} stroke={2.4} /> : <ChevronDown size={14} stroke={2.4} />}
                {L('Historial', 'History')} <span className="rounded-md bg-lilac-2 px-1.5 py-0.5 text-[10px] font-extrabold text-ink-2">{opsHistory.length}</span>
              </button>
              {histOpen && <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">{opsHistory.map(orderCard)}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const opsUpcoming = reqList.filter((r) => r.status === 'pending' || r.status === 'confirmed').length;

  return (
    <div className="relative pb-8">
      <div className="mb-3 flex gap-2">
        <button onClick={() => setMode('items')} className={modeBtn(mode === 'items')}><Boxes size={14} stroke={2} />{L('Artículos', 'Items')}</button>
        <button onClick={() => setMode('ops')} className={modeBtn(mode === 'ops')}><CalendarDays size={14} stroke={2} />{L('Rentas', 'Rentals')}{opsUpcoming > 0 && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-extrabold text-white">{opsUpcoming}</span>}</button>
      </div>

      {mode === 'items' && (
        <SectionTabs
          className="mb-4"
          tabs={[
            ['catalog', L('Catálogo', 'Catalog')],
            ['cats', L('Categorías', 'Categories'), cfg.categories.length],
            ['addons', L('Extras', 'Add-ons'), cfg.addons.length],
            ['policies', L('Políticas', 'Policies'), cfg.policies.length],
            ['pricing', L('Precios', 'Pricing')],
          ] as SectionTab<typeof itemSub>[]}
          value={itemSub}
          onChange={setItemSub}
        />
      )}

      {mode === 'items'
        ? (itemSub === 'catalog' ? catalog : itemSub === 'cats' ? categoriesTab : itemSub === 'addons' ? addonsTab : itemSub === 'policies' ? policiesTab : pricingPane)
        : opsPane}

      {!isPremium && mode === 'items' && itemSub === 'catalog' && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card-sm p-4 text-white shadow-band" style={{ background: 'linear-gradient(140deg,#1E1B2E,#3A2E6E)' }}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-[rgba(244,183,64,.2)] text-[18px]">✦</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-extrabold">{L('Renta con seguro y verificación de ID', 'Rentals with insurance & ID checks')}</span>
            <span className="mt-0.5 block text-[11.5px] font-semibold leading-snug text-[rgba(255,255,255,.7)]">{L('Cobros de depósito automáticos y verificación del cliente con Premium.', 'Automatic deposit holds and renter verification with Premium.')}</span>
          </span>
          <button onClick={() => ctx.go('billing')} className="flex-none cursor-pointer rounded-btn bg-amber px-4 py-2.5 text-[12px] font-extrabold text-ink">{L('Mejorar', 'Upgrade')}</button>
        </div>
      )}

      {editorSheets()}

      {/* Damage claim: capture part (or all) of the real deposit hold (0101). */}
      {damageFor && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => { if (!depBusy) setDamageFor(null); }}>
          <div className="w-full max-w-[400px] rounded-t-card-lg bg-white p-5 shadow-modal sm:rounded-card-lg" onClick={(e) => e.stopPropagation()}>
            <div className="text-[15px] font-extrabold text-ink">{L('Cobrar daño del depósito', 'Charge damage to the deposit')}</div>
            <div className="mt-1 text-[12px] font-medium leading-relaxed text-muted">{L(`Se cobra de la garantía retenida (${money(Number(damageFor.deposit ?? 0))}). El resto se libera solo.`, `Charged from the held deposit (${money(Number(damageFor.deposit ?? 0))}). The rest is released automatically.`)}</div>
            <div className="mt-3 flex items-center gap-2 rounded-field border-[1.5px] border-lilac-line px-3 py-2.5">
              <DollarSign size={16} className="flex-none text-muted-2" />
              <input autoFocus inputMode="decimal" value={damageAmt} onChange={(e) => setDamageAmt(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" className="w-full bg-transparent text-[15px] font-extrabold text-ink outline-none" />
              <button onClick={() => setDamageAmt(String(Number(damageFor.deposit ?? 0)))} className="flex-none cursor-pointer rounded-btn bg-lilac-2 px-2.5 py-1 text-[10.5px] font-extrabold text-primary-dark">{L('Todo', 'All')}</button>
            </div>
            <div className="mt-4 flex gap-2">
              <button disabled={depBusy} onClick={() => setDamageFor(null)} className="flex-1 cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3 text-[13px] font-extrabold text-ink disabled:opacity-50">{L('Cancelar', 'Cancel')}</button>
              <button disabled={depBusy} onClick={submitDamage} className="flex-1 cursor-pointer rounded-btn-lg bg-pink py-3 text-[13px] font-extrabold text-white shadow-cta-sm disabled:opacity-50">{depBusy ? L('Cobrando…', 'Charging…') : L('Cobrar daño', 'Charge damage')}</button>
            </div>
          </div>
        </div>
      )}
      <Toast msg={toast} />
    </div>
  );
}

// ---------- Item detail page ----------
function ItemDetail({
  item, ctx, catName, tile, statusOf, availOf, policyList, walkIn, onClose, onEdit, onRentOut, onReturn,
}: {
  item: Item; ctx: PanelCtx; catName: string; tile: string;
  statusOf: (it: Item) => { cls: string; dot: string; label: string };
  availOf: (it: Item) => number;
  policyList: RentalPolicy[];
  // walkIn: showcase/demo only. A real business rents through customer requests
  // (ops panel), so we never show a theatrical "Rentar/Devolver" that charges nothing.
  walkIn: boolean;
  onClose: () => void; onEdit: () => void; onRentOut: () => void; onReturn: () => void;
}) {
  const { L } = ctx;
  const s = statusOf(item);
  const rates = [{ l: L('Hora', 'Hour'), v: item.hour }, { l: L('Día', 'Day'), v: item.day }, { l: L('Semana', 'Week'), v: item.week }];
  return (
    <ModulePage
      title={L(item.es, item.en)}
      subtitle={`${catName} · ${L(item.availEs, item.availEn)}`}
      onBack={onClose}
      action={<span className={`rounded-md px-2 py-1 text-[9px] font-extrabold ${s.cls}`}>{s.label}</span>}
      footer={
        walkIn ? (
          <div className="flex gap-2.5">
            <button onClick={onEdit} className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-btn bg-lilac-2" aria-label={L('Editar', 'Edit')}><Pencil size={16} stroke={2} className="text-primary-dark" /></button>
            <button onClick={onRentOut} className="flex-1 cursor-pointer rounded-btn bg-primary py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm">{L('Rentar', 'Rent out')}</button>
          </div>
        ) : (
          <button onClick={onEdit} className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-btn bg-primary py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm"><Pencil size={15} stroke={2.2} />{L('Editar artículo', 'Edit item')}</button>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-card-sm border border-hair">
          <div className="relative h-[110px]" style={{ background: stripe(tile) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item.imageUrl && <img src={item.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <span className={`absolute right-2.5 top-2.5 rounded-md px-2 py-1 text-[9px] font-extrabold ${s.cls}`}>{s.label}</span>
          </div>
          <div className="p-3.5">
            {item.descEs && <div className="mb-2.5 text-[12px] font-medium leading-relaxed text-ink-3">{L(item.descEs, item.descEn)}</div>}
            <div className="text-[11px] font-semibold text-muted-2">{catName} · {L(item.availEs, item.availEn)}</div>
            <div className="mt-2.5 flex gap-1.5">
              {rates.map((r) => (
                <div key={r.l} className="flex-1 rounded-[10px] bg-app py-2.5 text-center">
                  <div className="text-[14px] font-extrabold text-ink">{r.v != null && r.v > 0 ? money(r.v) : '—'}</div>
                  <div className="mt-0.5 text-[8.5px] font-semibold text-muted-2">{r.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-[12px] font-extrabold text-ink">{L('Unidades', 'Units')} · {item.stock}</div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: Math.max(1, item.stock) }, (_, i) => {
              const out = i < item.out; const unit = L(item.unitEs, item.unitEn);
              return (
                <div key={i} className={`${cardCls} flex items-center gap-3 p-2.5`}>
                  <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-[11px] font-extrabold ${out ? 'bg-pink-bg text-pink-dark' : 'bg-green-bg text-green-dark'}`}>#{i + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[12px] font-extrabold capitalize text-ink">{unit} {i + 1}</span><span className="block text-[10px] font-medium text-muted-2">{out ? L('Rentado', 'Rented') : L('Disponible ahora', 'Available now')}</span></span>
                  {out
                    ? (walkIn
                        ? (<button onClick={onReturn} className="flex-none cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-1.5 text-[10.5px] font-extrabold text-ink">{L('Devolver', 'Return')}</button>)
                        : (<span className="flex-none rounded-md bg-pink-bg px-2 py-1 text-[9px] font-extrabold text-pink-dark">{L('Rentado', 'Rented')}</span>))
                    : (<span className="flex-none rounded-md bg-green-bg px-2 py-1 text-[9px] font-extrabold text-green-dark">{L('Libre', 'Free')}</span>)}
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 text-[10.5px] font-semibold text-muted-2">{availOf(item)}/{item.stock} {L('disponibles', 'available')}</div>
        </div>

        {policyList.length > 0 && (
          <div>
            <div className="mb-2 text-[12px] font-extrabold text-ink">{L('Exención y políticas', 'Waiver & policies')}</div>
            <div className={`${cardCls} px-3.5`}>
              {policyList.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 border-b border-hair py-3 last:border-0">
                  <span className="min-w-0"><span className="block text-[12px] font-semibold text-ink">{L(p.es, p.en)}</span>{(p.subEs || p.subEn) && <span className="block text-[10px] font-medium text-muted-2">{L(p.subEs ?? '', p.subEn ?? p.subEs ?? '')}</span>}</span>
                  <span className="flex-none rounded-md bg-green-bg px-2 py-1 text-[9px] font-extrabold text-green-dark">{L('Activo', 'On')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModulePage>
  );
}

// ---------- Rent-out 3-step flow ----------
function RentOutFlow({ item, ctx, tile, onBackToDetail, onDone }: {
  item: Item; ctx: PanelCtx; tile: string; onBackToDetail: () => void; onDone: () => void;
}) {
  const { L } = ctx;
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [waiver, setWaiver] = useState(true);
  const [period, setPeriod] = useState<Period>('day');
  const [qty, setQty] = useState(1);
  const [start, setStart] = useState('');

  const rate = (period === 'hour' ? item.hour : period === 'week' ? item.week : item.day) ?? item.day;
  const fee = rate * qty;
  const total = fee + item.dep;
  const periodLabel = { hour: L('Hora', 'Hour'), day: L('Día', 'Day'), week: L('Semana', 'Week') }[period];
  const steps = [L('Cliente', 'Renter'), L('Periodo', 'Period'), L('Confirmar', 'Confirm')];
  const canNext = step === 0 ? name.trim().length > 0 : true;

  if (done) return (<SuccessSheet ctx={ctx} title={L('¡Rentado!', 'Rented!')} sub={L('Se cobró el depósito y el artículo quedó marcado como rentado.', 'Deposit charged and the item is marked as rented.')} onClose={onDone} />);

  const next = () => { if (step >= 2) { setDone(true); return; } setStep((s) => s + 1); };
  const back = () => { if (step === 0) { onBackToDetail(); return; } setStep((s) => s - 1); };

  return (
    <ModulePage
      title={L('Rentar artículo', 'Rent out')}
      subtitle={`${L('Paso', 'Step')} ${step + 1}/3`}
      onBack={back}
      backLabel={step === 0 ? L('Cancelar', 'Cancel') : L('Atrás', 'Back')}
      footer={
        <div className="flex items-center gap-3">
          <button onClick={back} aria-label={L('Atrás', 'Back')} className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-btn bg-lilac-2"><ChevronLeft size={18} stroke={2.4} className="text-ink" /></button>
          <span className="flex-1 text-center text-[11px] font-semibold text-muted-2">{`${L('Paso', 'Step')} ${step + 1} ${L('de 3', 'of 3')}`}</span>
          <button onClick={next} disabled={!canNext} className={`flex-1 rounded-btn py-3 text-[13px] font-extrabold text-white ${!canNext ? 'cursor-not-allowed bg-lilac-line' : 'cursor-pointer bg-primary shadow-cta-sm'}`}>{step >= 2 ? L('Cobrar y rentar', 'Charge & rent') : L('Continuar', 'Continue')}</button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <StepBar steps={steps} step={step} onGo={(i) => i <= step && setStep(i)} />
        <ItemStrip item={item} ctx={ctx} tile={tile} right={`${money(item.day)}/${L('día', 'day')} · ${L('Depósito', 'Deposit')} ${money(item.dep)}`} />
        <div className={`${cardCls} flex flex-col gap-3.5 p-4`}>
          <div className="text-[13.5px] font-extrabold text-ink">{[L('Datos del cliente', 'Renter details'), L('Periodo y cantidad', 'Period & quantity'), L('Confirmar renta', 'Confirm rental')][step]}</div>
          {step === 0 && (
            <>
              <Field label={`${L('Nombre del cliente', 'Renter name')} *`}><input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('Ej. Mariana Vélez', 'e.g. Mariana Velez')} className={fieldCls} /></Field>
              <Field label={L('Teléfono', 'Phone')}><input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(415) 555-0148" className={fieldCls} inputMode="tel" autoComplete="tel" /></Field>
              <div className="flex items-center gap-3 rounded-field border border-hair bg-app p-3"><Shield size={17} stroke={2} className="flex-none text-primary-dark" /><span className="flex-1 text-[11px] font-semibold leading-snug text-ink-soft">{L('Exención de responsabilidad firmada', 'Liability waiver signed')}</span><Toggle on={waiver} onClick={() => setWaiver((v) => !v)} /></div>
            </>
          )}
          {step === 1 && (
            <>
              <Field label={L('Periodo de renta', 'Rental period')}>
                <div className="flex gap-1.5">{(['hour', 'day', 'week'] as Period[]).map((p) => (<button key={p} onClick={() => setPeriod(p)} className={`flex-1 rounded-[9px] py-2 text-[11.5px] font-extrabold ${period === p ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'}`}>{{ hour: L('Hora', 'Hour'), day: L('Día', 'Day'), week: L('Semana', 'Week') }[p]}</button>))}</div>
              </Field>
              <div className="flex gap-3">
                <Field label={L('Cantidad', 'Quantity')} className="flex-1">
                  <div className="flex items-center overflow-hidden rounded-field border-[1.5px] border-lilac-line">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-[42px] w-10 items-center justify-center bg-app text-ink-2"><Minus size={15} stroke={2.6} /></button>
                    <span className="flex-1 text-center text-[14px] font-extrabold text-ink">{qty}</span>
                    <button onClick={() => setQty((q) => Math.min(Math.max(1, item.stock), q + 1))} className="flex h-[42px] w-10 items-center justify-center bg-app text-ink-2"><Plus size={15} stroke={2.6} /></button>
                  </div>
                </Field>
                <Field label={L('Fecha inicio', 'Start date')} className="flex-1"><input value={start} onChange={(e) => setStart(e.target.value)} placeholder="12 Jul" className={fieldCls} /></Field>
              </div>
              <div className="rounded-field bg-lilac-2 p-3.5">
                <Line l={L('Tarifa de renta', 'Rental fee')} v={money(fee)} />
                <Line l={L('Depósito', 'Deposit')} v={money(item.dep)} />
                <div className="mt-2 flex items-center justify-between border-t border-lilac-line pt-2"><span className="text-[12px] font-extrabold text-ink">{L('Total a cobrar', 'Total due')}</span><span className="text-[15px] font-extrabold text-primary-dark">{money(total)}</span></div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 rounded-field border border-green/40 bg-green-bg p-3"><span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-white text-green-dark"><Check size={16} stroke={3} /></span><span className="flex-1"><span className="block text-[12px] font-extrabold text-green-dark">{L('Listo para rentar', 'Ready to rent')}</span><span className="block text-[10.5px] font-semibold leading-snug text-green-dark/80">{L('Se cobra el depósito y se marca como rentado.', 'Deposit is charged and item marked rented.')}</span></span></div>
              <div className="overflow-hidden rounded-field border border-hair">
                {([[L('Cliente', 'Renter'), name || '—'], [L('Artículo', 'Item'), L(item.es, item.en)], [L('Periodo', 'Period'), `${qty} × ${periodLabel}`], [L('Total', 'Total'), money(total)]] as [string, string][]).map(([k, v], i, a) => (
                  <div key={k} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}><span className="w-[80px] flex-none text-[10.5px] font-semibold text-muted-2">{k}</span><span className="min-w-0 flex-1 text-[11.5px] font-extrabold text-ink">{v}</span></div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </ModulePage>
  );
}

// ---------- Return / condition-check flow ----------
function ReturnFlow({ item, ctx, tile, onClose, onDone }: { item: Item; ctx: PanelCtx; tile: string; onClose: () => void; onDone: () => void }) {
  const { L } = ctx;
  const [condition, setCondition] = useState<Condition>('perfect');
  const [done, setDone] = useState(false);
  const deduction = condition === 'minor' ? 45 : condition === 'major' ? item.dep : 0;
  const refund = Math.max(0, item.dep - deduction);
  const conds: { key: Condition; label: string; sub: string; icon: string; iconCls: string }[] = [
    { key: 'perfect', label: L('Perfecto', 'Perfect'), sub: L('Sin daños · reembolso completo', 'No damage · full refund'), icon: '✓', iconCls: 'bg-green-bg text-green-dark' },
    { key: 'minor', label: L('Daño menor', 'Minor damage'), sub: L('Deduce parte del depósito', 'Deduct part of deposit'), icon: '~', iconCls: 'bg-amber-bg text-amber-ink' },
    { key: 'major', label: L('Daño mayor', 'Major damage'), sub: L('Deduce o retén el depósito', 'Deduct or hold deposit'), icon: '!', iconCls: 'bg-pink-bg text-pink-dark' },
  ];
  if (done) return (<SuccessSheet ctx={ctx} title={L('Devolución registrada', 'Return recorded')} sub={`${L('Reembolso al cliente', 'Refund to renter')}: ${money(refund)}`} onClose={onDone} />);
  return (
    <ModulePage title={L('Devolución', 'Return')} onBack={onClose} footer={<button onClick={() => setDone(true)} className="w-full cursor-pointer rounded-btn bg-primary py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm">{L('Registrar y reembolsar', 'Record & refund')}</button>}>
      <div className="flex flex-col gap-4">
        <ItemStrip item={item} ctx={ctx} tile={tile} right={`${L('Devuelto por', 'Returned by')} James T.`} />
        <div className={`${cardCls} p-4`}>
          <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Revisión de condición', 'Condition check')}</div>
          <div className="flex flex-col gap-2">
            {conds.map((c) => {
              const on = condition === c.key;
              return (
                <button key={c.key} onClick={() => setCondition(c.key)} className={`flex items-center gap-3 rounded-field border-[1.5px] p-3 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                  <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[1.5px] ${on ? 'border-primary' : 'border-muted-faint'}`}>{on && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                  <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[14px] font-extrabold ${c.iconCls}`}>{c.icon}</span>
                  <span className="flex-1"><span className="block text-[12px] font-extrabold text-ink">{c.label}</span><span className="block text-[10px] font-medium text-muted-2">{c.sub}</span></span>
                </button>
              );
            })}
          </div>
        </div>
        <div className={`${cardCls} p-4`}>
          <Line l={L('Depósito retenido', 'Deposit held')} v={money(item.dep)} />
          {deduction > 0 && (<div className="mt-1.5 flex items-center justify-between"><span className="text-[11px] font-semibold text-pink-dark">{L('Deducción por daño', 'Damage deduction')}</span><span className="text-[12px] font-bold text-pink-dark">−{money(deduction)}</span></div>)}
          <div className="mt-2 flex items-center justify-between border-t border-hair pt-2.5"><span className="text-[12px] font-extrabold text-ink">{L('Reembolso al cliente', 'Refund to renter')}</span><span className="text-[16px] font-extrabold text-green">{money(refund)}</span></div>
        </div>
      </div>
    </ModulePage>
  );
}

// ---------- shared bits ----------
function SuccessSheet({ ctx, title, sub, onClose }: { ctx: PanelCtx; title: string; sub: string; onClose: () => void }) {
  const { L } = ctx;
  return (
    <ModulePage title={title} onBack={onClose} footer={<button onClick={onClose} className="w-full cursor-pointer rounded-btn bg-primary py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm">{L('Listo', 'Done')}</button>}>
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-bg text-green-dark"><Check size={28} stroke={3} /></span>
        <div className="text-[16px] font-extrabold text-ink">{title}</div>
        <div className="max-w-[320px] text-[12.5px] font-semibold leading-relaxed text-muted">{sub}</div>
      </div>
    </ModulePage>
  );
}

function StepBar({ steps, step, onGo }: { steps: string[]; step: number; onGo: (i: number) => void }) {
  return (
    <div className="no-scrollbar flex gap-2 min-w-0 overflow-x-auto">
      {steps.map((label, i) => {
        const active = i === step, done = i < step;
        return (
          <button key={label} onClick={() => onGo(i)} className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${active ? 'bg-primary text-white' : done ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted-2'}`}>
            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white ${active ? 'bg-white/25' : done ? 'bg-primary' : 'bg-muted-faint'}`}>{done ? '✓' : i + 1}</span>{label}
          </button>
        );
      })}
    </div>
  );
}

function ItemStrip({ item, ctx, tile, right }: { item: Item; ctx: PanelCtx; tile: string; right: string }) {
  const { L } = ctx;
  return (
    <div className={`${cardCls} flex items-center gap-3 p-3`}>
      <span className="relative h-11 w-11 flex-none overflow-hidden rounded-[11px]" style={{ background: stripe(tile) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {item.imageUrl && <img src={item.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      </span>
      <span className="min-w-0 flex-1"><span className="block text-[13px] font-extrabold text-ink">{L(item.es, item.en)}</span><span className="block truncate text-[10px] font-medium text-muted-2">{right}</span></span>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (<label className={`block ${className}`}><span className="mb-1.5 block text-[11px] font-extrabold text-ink-soft">{label}</span>{children}</label>);
}

function MoneyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center rounded-field border-[1.5px] border-lilac-line px-3 focus-within:border-primary">
      <span className="text-[12px] font-bold text-muted-2">$</span>
      <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder={placeholder} className="w-full bg-transparent px-1.5 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted-faint" />
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative h-[25px] w-[42px] flex-none rounded-full transition-colors ${on ? 'bg-primary' : 'bg-lilac-line'}`} aria-pressed={on}>
      <span className={`absolute top-[3px] h-[19px] w-[19px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.18)] transition-all ${on ? 'left-[20px]' : 'left-[3px]'}`} />
    </button>
  );
}

function Line({ l, v }: { l: string; v: string }) {
  return (<div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-ink-2">{l}</span><span className="text-[12px] font-bold text-ink">{v}</span></div>);
}
