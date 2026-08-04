'use client';

// Servicios / Reservas module (business dashboard) — fully functional, mirroring
// the Food module. Services live in business_items (kind='service'); the structure
// (categories, reusable add-ons, booking mode) lives in businesses.service_config
// (migration 0046). Two top-level modes:
//  • Servicios — catalog (grouped by config categories, each service editable via
//    the shared 5-step wizard: create/edit/duplicate/delete-confirmed, photo,
//    add-ons, price/duration, bookable), plus Categorías + Add-ons sub-tabs (real
//    CRUD) and a "Modo del listado" toggle (Solo mostrar vs Aceptar reservas).
//  • Reservas — manage real bookings (business_bookings) with status actions,
//    KPIs and calendar/list views.
// Display-only mode hides the Reservar button on the public listing. Fully
// explorable in demo (local sample); a signed-in owner persists to Supabase.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon as LucideIcon } from '@tabler/icons-react';
import { IconCalendarCheck as CalendarCheck, IconCalendar as CalendarDays, IconCheck as Check, IconCircleCheck as CheckCircle2, IconChevronDown as ChevronDown, IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight, IconChevronUp as ChevronUp, IconCopy as Copy, IconCurrencyDollar as DollarSign, IconLoader2 as Loader2, IconLock as Lock, IconMessage2 as MessageSquare, IconPencil as Pencil, IconPlus as Plus, IconShoppingBag as ShoppingBag, IconSparkles as Sparkles, IconBuildingStore as Store, IconTrash as Trash2, IconUpload as Upload, IconUsers as Users, IconTool as Wrench, IconCircleX as XCircle, IconBolt as Zap } from '@tabler/icons-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { escribir } from '@/lib/escribir';
import { ChipRow } from '@/components/ChipRow';
import { SectionTabs, type SectionTab } from '@/components/SectionTabs';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Overlay, OverlayTitle, Switch } from '@/components/ui';
import { QuickTagSheet } from '@/components/QuickTagSheet';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useUrlTab } from '@/lib/urlView';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draftStore';
import { deleteBizItem, insertBizItem, listBizItems, updateBizItem, type BizItemRow, type NewBizItem } from '@/lib/bizItems';
import {
  defaultServiceConfig, demoServiceConfig, normalizeServiceConfig,
  type ServiceAddon, type ServiceCategory, type ServiceConfig, type SvcProvider,
} from '@/lib/serviceConfig';
import { ServiceAddonEditor, ServiceCategoryEditor, ServiceProviderEditor, svcCatIcon } from '@/screens/negocio/modules/ServiceEditors';

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';
const stripe = (stops: string) => `repeating-linear-gradient(135deg,${stops})`;

type PriceType = 'fijo' | 'persona' | 'cotiza';
// Optional single-choice price variant (car-wash vehicle type, home size…): each
// option ADDS `delta` to the base price. Lives in attrs.variants; the consumer
// booking sheet renders it and the checkout re-prices the delta server-side.
type SvcVariant = { es: string; en?: string; options: { es: string; en?: string; delta: number }[] };
type Svc = {
  id: number; dbId?: string; name: string; es: string; en: string; cat: string;
  price: string; priceType: PriceType; dur: string; bookable: boolean;
  addons: string[]; tags: string[]; days: string[]; capacity: string; imageUrl?: string;
  variants?: SvcVariant | null;
  extra?: Record<string, unknown>;
};

const FALLBACK_CAT: ServiceCategory = { id: '_', es: 'Servicios', en: 'Services', icon: 'sparkles', tile: '#EFE3D0 0 8px,#E2CFB2 8px 16px', visible: true };
const DAY_KEYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const KNOWN_ATTRS = new Set(['en', 'priceType', 'dur', 'bookable', 'deposit', 'addons', 'tags', 'days', 'capacity', 'variants']);
function rowToSvc(r: BizItemRow, idx: number): Svc {
  const a = (r.attrs ?? {}) as Record<string, unknown>;
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(a)) if (!KNOWN_ATTRS.has(k)) extra[k] = v;
  const pt = (a.priceType as PriceType) ?? (r.price != null ? 'fijo' : 'cotiza');
  return {
    id: idx + 1,
    dbId: r.id,
    name: r.name,
    es: r.description ?? '',
    en: String(a.en ?? r.description ?? ''),
    cat: r.section ?? FALLBACK_CAT.id,
    price: r.price != null ? String(r.price) : (a.priceLabel != null ? String(a.priceLabel).replace(/[^0-9.]/g, '') : ''),
    priceType: pt,
    dur: String(a.dur ?? '60 min'),
    bookable: a.bookable !== false,
    addons: (a.addons as string[]) ?? [],
    tags: (a.tags as string[]) ?? [],
    days: (a.days as string[]) ?? ['Vie', 'Sáb', 'Dom'],
    capacity: String(a.capacity ?? '1'),
    imageUrl: r.image_url ?? undefined,
    variants: (a.variants as SvcVariant | undefined) ?? null,
    extra,
  };
}
const svcAttrs = (s: Svc): Record<string, unknown> => ({
  ...(s.extra ?? {}),
  en: s.en, priceType: s.priceType, dur: s.dur, bookable: s.bookable,
  addons: s.addons, tags: s.tags, days: s.days, capacity: s.capacity,
  variants: s.variants && s.variants.options.length > 0 ? s.variants : null,
});
function svcToRow(s: Svc, businessId: string, sort: number): NewBizItem {
  return {
    business_id: businessId, kind: 'service', name: s.name, description: s.es,
    price: s.priceType === 'cotiza' ? null : Number(s.price) || 0, unit: null,
    section: s.cat, available: true, sort, image_url: s.imageUrl ?? null, attrs: svcAttrs(s),
  };
}

// ---------- bookings (Reservas) model — real business_bookings (0027 + 0092) ----------
type BkStatus = 'pending' | 'confirmed' | 'seated' | 'done' | 'cancelled' | 'no_show';
type BookingRow = {
  id: string; service_name: string | null; customer_name: string; party_size: number | null;
  starts_at: string; status: BkStatus; deposit: number | null; notes: string | null; created_at: string;
  // booking-pro fields (0092)
  duration_min: number | null; staff_id: string | null; staff_name: string | null;
  addons: { n: string; p: number }[] | null; variant: string | null; total: number | null; customer_phone: string | null;
};
const BK_STATUS: Record<BkStatus, { es: string; en: string; cls: string }> = {
  pending: { es: 'Por confirmar', en: 'Pending', cls: 'bg-pink-bg text-pink-dark' },
  confirmed: { es: 'Confirmada', en: 'Confirmed', cls: 'bg-green-bg text-green-dark' },
  seated: { es: 'En curso', en: 'In progress', cls: 'bg-lilac-2 text-primary-dark' },
  done: { es: 'Completada', en: 'Done', cls: 'bg-lilac-2 text-ink-2' },
  cancelled: { es: 'Cancelada', en: 'Cancelled', cls: 'bg-lilac-2 text-muted-2' },
  no_show: { es: 'No vino', en: 'No-show', cls: 'bg-pink-bg text-pink-dark' },
};
const bookingWhen = (iso: string, es: boolean): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(es ? 'es-US' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};
const bookingHour = (iso: string): string => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};
// Local yyyy-mm-dd of a timestamp — keys the agenda's day strip.
const bookingDayKey = (iso: string): string => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const chip = (on: boolean) => `tap-y flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;
const fieldLabel = 'mb-1.5 text-[11px] font-extrabold text-ink-soft';
const inputCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary';
const addBtn = 'mt-3.5 w-full cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-app py-3 text-[12.5px] font-extrabold text-primary-dark';

// Demo services (sample so the module is explorable without signing in).
const DEMO_SVCS: Svc[] = [
  { id: 1, name: 'Sourdough 101', es: 'Aprende a hornear masa madre desde el fermento inicial. Incluye masa madre para llevar.', en: 'Learn to bake sourdough from the starter. Includes a starter to take home.', cat: 'classes', price: '85', priceType: 'fijo', dur: '2h', bookable: true, addons: ['starter'], tags: ['Más reservado'], days: ['Sáb', 'Dom'], capacity: '8–16', imageUrl: undefined },
  { id: 2, name: 'Pizza para familias', es: 'Taller práctico de pizza al horno de leña para toda la familia.', en: 'Hands-on wood-fired pizza workshop for the whole family.', cat: 'classes', price: '60', priceType: 'fijo', dur: '90 min', bookable: true, addons: [], tags: ['Familiar'], days: ['Vie', 'Sáb', 'Dom'], capacity: '2–6' },
  { id: 3, name: 'Menú degustación', es: '5 tiempos con maridaje de vino opcional. Mar–Dom, solo cena.', en: '5 courses with optional wine pairing. Tue–Sun, dinner only.', cat: 'tastings', price: '140', priceType: 'persona', dur: '2h', bookable: true, addons: ['wine'], tags: ['Premium'], days: ['Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], capacity: '2–6' },
  { id: 4, name: 'Cata de vinos', es: 'Cata guiada de vinos de California e Italia con quesos artesanales.', en: 'Guided tasting of California & Italy wines with artisan cheese.', cat: 'tastings', price: '45', priceType: 'persona', dur: '75 min', bookable: true, addons: [], tags: [], days: ['Vie', 'Sáb'], capacity: '8–16' },
  { id: 5, name: 'Comedor privado', es: 'Reserva nuestra sala trasera para cenas privadas y eventos corporativos.', en: 'Book our back room for private dinners and corporate events.', cat: 'private', price: '', priceType: 'cotiza', dur: '3h+', bookable: false, addons: ['photos', 'setup'], tags: [], days: ['Vie', 'Sáb', 'Dom'], capacity: '20+' },
  { id: 6, name: 'Catering · entrega', es: 'Catering para oficinas y eventos. Entrega o montaje en sitio.', en: 'Office & event catering. Drop-off or on-site setup.', cat: 'catering', price: '12', priceType: 'persona', dur: '3h+', bookable: false, addons: ['setup'], tags: [], days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'], capacity: '20+' },
];

// =====================================================================
export function ServicesModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es, isFree, isPremium, ci } = ctx;
  const admin = useBizAdmin();
  const { user } = useAuth();
  const real = admin.active;
  const persistable = !admin.demo && !!real;

  // ── config (categories / add-ons / booking mode) ──────────────────────────
  const [cfg, setCfg] = useState<ServiceConfig>(demoServiceConfig);
  useEffect(() => {
    setCfg(admin.demo ? demoServiceConfig() : real?.service_config ? normalizeServiceConfig(real.service_config) : defaultServiceConfig());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);
  const saveCfg = (next: ServiceConfig) => { setCfg(next); if (persistable) admin.update({ service_config: next }); };
  const catOf = (id: string): ServiceCategory => cfg.categories.find((c) => c.id === id) ?? FALLBACK_CAT;
  const catLabel = (c: ServiceCategory) => L(c.es, c.en);
  const addonOf = (id: string) => cfg.addons.find((a) => a.id === id);

  // ── services (business_items kind='service') ───────────────────────────────
    // El estado inicial NO puede ser de ejemplo: se pinta antes de saber si
  // hay negocio real, así que un dueño ve un instante el catálogo de otro.
  // Quien decide es el cargador de abajo. (Auditoría de Negocios, 2026-08-04.)
  const [services, setServices] = useState<Svc[]>([]);
  useEffect(() => {
    if (!persistable || !real) { setServices(DEMO_SVCS); return; }
    let cancelled = false;
    (async () => {
      const rows = await listBizItems(real.id, 'service');
      if (!cancelled) setServices(rows.map(rowToSvc));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  const nextId = () => (services.length ? Math.max(...services.map((s) => s.id)) : 0) + 1;
  const persistNew = async (s: Svc) => {
    if (!persistable || !real) return;
    const dbId = await insertBizItem(svcToRow(s, real.id, services.length));
    if (dbId) setServices((l) => l.map((x) => (x.id === s.id ? { ...x, dbId } : x)));
  };
  const persistPatch = (s: Svc | undefined) => {
    if (persistable && s?.dbId) updateBizItem(s.dbId, { name: s.name, description: s.es, price: s.priceType === 'cotiza' ? null : Number(s.price) || 0, section: s.cat, image_url: s.imageUrl ?? null, attrs: svcAttrs(s) });
  };
  const patchSvc = (id: number, p: Partial<Svc>) =>
    setServices((l) => { const next = l.map((s) => (s.id === id ? { ...s, ...p } : s)); persistPatch(next.find((s) => s.id === id)); return next; });

  const countIn = (catId: string) => services.filter((s) => s.cat === catId).length;
  const addonUsedBy = (addonId: string) => services.filter((s) => s.addons.includes(addonId)).length;

  // ── bookings (business_bookings) ───────────────────────────────────────────
  const [bookingRows, setBookingRows] = useState<BookingRow[] | null>(null);
  const reloadBookings = () => {
    if (!persistable || !real || !supabase) { setBookingRows(null); return; }
    supabase.from('business_bookings')
      .select('id,service_name,customer_name,party_size,starts_at,status,deposit,notes,created_at,duration_min,staff_id,staff_name,addons,variant,total,customer_phone')
      .eq('business_id', real.id).order('starts_at', { ascending: true })
      .then(({ data, error }) => {
        // Un fallo NO es «no tienes citas»: se marca y el vacío lo dice.
        setFalloCitas(!!error);
        if (!error && Array.isArray(data)) setBookingRows(data as unknown as BookingRow[]);
      });
  };
  useEffect(() => { reloadBookings(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [real?.id, admin.demo]);
  const [falloCitas, setFalloCitas] = useState(false);
  const setBookingStatus = async (id: string, status: BkStatus) => {
    // El error se TIRABA y se anunciaba «Reserva actualizada» pasara lo que
    // pasara: el dueño veía una cita confirmada que el cliente nunca recibió.
    const antes = bookingRows?.find((r) => r.id === id)?.status;
    setBookingRows((rows) => (rows ? rows.map((r) => (r.id === id ? { ...r, status } : r)) : rows));
    if (persistable && supabase) {
      const err = await escribir(supabase.from('business_bookings').update({ status }).eq('id', id), L('es', 'en') === 'en');
      if (err) {
        setBookingRows((rows) => (rows ? rows.map((r) => (r.id === id && antes ? { ...r, status: antes } : r)) : rows));
        flash(err);
        return;
      }
    }
    flash(L('Reserva actualizada', 'Booking updated'));
  };
  // Walk-in / phone booking: the owner creates it directly as CONFIRMED. The
  // per-professional overlap guard (0092) still applies — a conflicting slot errors.
  const submitWalkIn = async () => {
    if (!persistable || !real || !supabase || walkBusy) return;
    const svc = services.find((s) => s.id === walk.svcId);
    if (!svc || !walk.name.trim() || !walk.day) { flash(L('Completa servicio, cliente y fecha', 'Fill in service, customer & date')); return; }
    setWalkBusy(true);
    const provider = cfg.providers.find((p) => p.id === walk.staff);
    const h = /(\d+)\s*h/i.exec(svc.dur); const m = /(\d+)\s*m/i.exec(svc.dur);
    const durMin = Math.max(15, (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0) || parseInt(svc.dur, 10) || 60);
    const total = svc.priceType === 'cotiza' ? null : Number(svc.price) || null;
    const { error } = await supabase.from('business_bookings').insert({
      business_id: real.id, service_name: svc.name, service_id: svc.dbId ?? null,
      customer_name: walk.name.trim(), customer_phone: walk.phone.trim() || null,
      starts_at: new Date(`${walk.day}T${walk.time}:00`).toISOString(), status: 'confirmed',
      duration_min: durMin, staff_id: provider?.id ?? null, staff_name: provider?.name ?? null,
      total, notes: walk.note.trim() || null,
    });
    setWalkBusy(false);
    if (error) {
      flash(/staff_slot_taken/.test(error.message) ? L('Ese profesional ya tiene una cita a esa hora', 'That professional already has an appointment then') : L('No se pudo crear la cita', "Couldn't create the appointment"));
      return;
    }
    setWalkOpen(false);
    reloadBookings();
    flash(L('Cita creada', 'Appointment created'));
  };

  // ── ui state ────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'services' | 'bookings'>(tab === 'bookings' ? 'bookings' : 'services');
  // The sidebar has BOTH "Servicios" and "Reservas" nav items routing into this
  // one module — follow the nav (tab prop) whenever it changes, or the module
  // stays stuck on whichever mode it mounted with.
  useEffect(() => { setMode(tab === 'bookings' ? 'bookings' : 'services'); }, [tab]);
  // Services sub-tab mirrored to ?sub= (refresh-safe; Panel clears it on switch).
  const [svcSub, setSvcSub] = useUrlTab<'catalog' | 'cats' | 'addons' | 'pros'>('sub', 'catalog', (v) => ['catalog', 'cats', 'addons', 'pros'].includes(v));
  const [view, setView] = useState<'module' | 'wizard' | 'success'>('module');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [wizStep, setWizStep] = useState(0);
  const [wizMax, setWizMax] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => newDraft('general'));
  const [confirmDel, setConfirmDel] = useState(false);
  const [toast, setToast] = useState('');
  const [catSheet, setCatSheet] = useState<{ open: boolean; initial: ServiceCategory | null }>({ open: false, initial: null });
  const [addonSheet, setAddonSheet] = useState<{ open: boolean; initial: ServiceAddon | null }>({ open: false, initial: null });
  const [proSheet, setProSheet] = useState<{ open: boolean; initial: SvcProvider | null }>({ open: false, initial: null });
  const [bookFilter, setBookFilter] = useState<'all' | BkStatus>('all');
  // Agenda (Reservas): selected day ('all' = every date) + professional filter.
  const [bkDay, setBkDay] = useState<string>('all');
  const [bkStaff, setBkStaff] = useState<string>('all');
  // Walk-in ("+ Agendar cita"): the owner books a customer by hand — phone
  // bookings, someone at the counter. Inserts directly as CONFIRMED.
  const [walkOpen, setWalkOpen] = useState(false);
  const [walk, setWalk] = useState({ svcId: 0, name: '', phone: '', day: '', time: '12:00', staff: '', note: '' });
  const [walkBusy, setWalkBusy] = useState(false);
  const [catFromWiz, setCatFromWiz] = useState(false); // category sheet opened from the wizard → auto-select on create
  const [tagSheet, setTagSheet] = useState(false); // quick "new tag" popup

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };
  const upD = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  // ── draft recovery: autosave the CREATE draft so the owner can leave & resume ─
  const draftKey = 'tl:draft:service:' + (real?.id ?? 'demo');
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
  const upsertCategory = (c: ServiceCategory) => {
    const exists = cfg.categories.some((x) => x.id === c.id);
    saveCfg({ ...cfg, categories: exists ? cfg.categories.map((x) => (x.id === c.id ? c : x)) : [...cfg.categories, c] });
    if (!exists && catFromWiz) upD({ cat: c.id }); // just created from the wizard → select it
    setCatFromWiz(false);
    flash(exists ? L('Categoría guardada', 'Category saved') : L('Categoría creada', 'Category created'));
  };
  // Create a custom tag/etiqueta (reusable) and select it on the current draft.
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
  // Professionals (the public bookable team — service_config.providers). Declared
  // BEFORE the wizard/success early returns: editorSheets() renders there too.
  const upsertProvider = (p: SvcProvider) => {
    const exists = cfg.providers.some((x) => x.id === p.id);
    saveCfg({ ...cfg, providers: exists ? cfg.providers.map((x) => (x.id === p.id ? p : x)) : [...cfg.providers, p] });
    flash(exists ? L('Profesional guardado', 'Professional saved') : L('Profesional agregado', 'Professional added'));
  };
  const deleteProvider = (id: string) => {
    saveCfg({ ...cfg, providers: cfg.providers.filter((x) => x.id !== id) });
    flash(L('Profesional eliminado', 'Professional removed'));
  };
  // 14-day agenda strip (today first) — a hook, so it must run on EVERY render
  // (the wizard view early-returns below). Used by the agenda + walk-in sheet.
  const agendaDays = useMemo(() => {
    const wd = es ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const base = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { key, lab: i === 0 ? L('Hoy', 'Today') : i === 1 ? L('Mañana', 'Tmrw') : wd[d.getDay()], day: d.getDate() };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [es]);
  const walkServices = services.filter((s) => s.bookable);
  const providerColor = (id: string | null) => cfg.providers.find((p) => p.id === id)?.color ?? '#7B61FF';
  const upsertAddon = (a: ServiceAddon) => {
    const exists = cfg.addons.some((x) => x.id === a.id);
    saveCfg({ ...cfg, addons: exists ? cfg.addons.map((x) => (x.id === a.id ? a : x)) : [...cfg.addons, a] });
    flash(exists ? L('Add-on guardado', 'Add-on saved') : L('Add-on creado', 'Add-on created'));
  };
  const deleteAddon = (id: string) => {
    saveCfg({ ...cfg, addons: cfg.addons.filter((x) => x.id !== id) });
    // also detach from services locally (persist happens on their next save)
    setServices((l) => l.map((s) => (s.addons.includes(id) ? { ...s, addons: s.addons.filter((x) => x !== id) } : s)));
    flash(L('Add-on eliminado', 'Add-on deleted'));
  };

  const priceLabelOf = (s: { priceType: PriceType; price: string }) =>
    s.priceType === 'cotiza' ? L('Cotización', 'Quote') : s.price ? `$${s.price}${s.priceType === 'persona' ? L('/pers', '/pp') : ''}` : L('Gratis', 'Free');

  // ── wizard: draft ⇄ service ─────────────────────────────────────────────────
  const wizSteps: [string, string][] = [
    [L('Detalles', 'Details'), L('Detalles del servicio', 'Service details')],
    [L('Precio', 'Pricing'), L('Precio y duración', 'Pricing & duration')],
    [L('Add-ons', 'Add-ons'), L('Extras y add-ons', 'Extras & add-ons')],
    [L('Reserva', 'Booking'), L('Cómo se reserva', 'How it books')],
    [L('Revisar', 'Review'), L('Revisar y publicar', 'Review & publish')],
  ];
  const draftReady = !!draft.name.trim() && (!!draft.price || draft.priceType === 'cotiza');
  const startAdd = () => {
    setEditingId(null);
    const fresh = newDraft(cfg.categories.find((c) => c.visible)?.id ?? 'general');
    const saved = loadDraft<Draft>(draftKey);
    if (saved && (saved.name?.trim() || saved.descEs || saved.descEn || saved.price || saved.photoUrl)) {
      setDraft({ ...fresh, ...saved });
      flash(L('Borrador recuperado', 'Draft restored'));
    } else setDraft(fresh);
    setWizStep(0); setWizMax(0); setView('wizard');
  };
  const startEdit = (s: Svc) => {
    setEditingId(s.id);
    setDraft({
      name: s.name, descEs: s.es, descEn: s.en, cat: s.cat, price: s.price, priceType: s.priceType,
      dur: s.dur, bookable: s.bookable, addons: [...s.addons], tags: [...s.tags],
      days: [...s.days], capacity: s.capacity, photoUrl: s.imageUrl ?? '',
      varLabel: s.variants?.es ?? '', varOpts: (s.variants?.options ?? []).map((o) => ({ es: o.es, delta: o.delta ? String(o.delta) : '' })),
    });
    setWizStep(0); setWizMax(wizSteps.length - 1); setView('wizard');
  };
  const draftFields = () => ({
    name: draft.name.trim() || L('Nuevo servicio', 'New service'), es: draft.descEs || draft.descEn, en: draft.descEn || draft.descEs,
    cat: draft.cat, price: draft.price, priceType: draft.priceType, dur: draft.dur, bookable: draft.bookable,
    addons: draft.addons, tags: draft.tags, days: draft.days, capacity: draft.capacity,
    imageUrl: draft.photoUrl || undefined,
    variants: (() => {
      const opts = draft.varOpts.filter((o) => o.es.trim()).map((o) => ({ es: o.es.trim(), delta: Math.max(0, Number(o.delta) || 0) }));
      return opts.length > 0 ? { es: draft.varLabel.trim() || L('Opción', 'Option'), options: opts } : null;
    })(),
  });
  const addFromDraft = () => { const s: Svc = { id: nextId(), ...draftFields() }; setServices((l) => [s, ...l]); persistNew(s); clearDraft(draftKey); };
  const saveFromDraft = () => {
    if (editingId == null) return;
    setServices((l) => { const next = l.map((s) => (s.id === editingId ? { ...s, ...draftFields() } : s)); persistPatch(next.find((s) => s.id === editingId)); return next; });
  };
  const duplicateFromDraft = () => {
    const s: Svc = { id: nextId(), ...draftFields(), name: `${draft.name.trim() || L('Nuevo servicio', 'New service')} ${L('(copia)', '(copy)')}` };
    setServices((l) => [s, ...l]); persistNew(s); setView('module'); setEditingId(null); flash(L('Servicio duplicado', 'Service duplicated'));
  };
  const deleteEditing = () => {
    if (editingId == null) return;
    const target = services.find((s) => s.id === editingId);
    setServices((l) => l.filter((s) => s.id !== editingId));
    if (persistable && target?.dbId) deleteBizItem(target.dbId);
    setView('module'); setEditingId(null); flash(L('Servicio eliminado', 'Service deleted'));
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
  const nextGated = wizStep === 0 ? !!draft.name.trim() : wizStep === 1 ? (!!draft.price || draft.priceType === 'cotiza') : true;

  // ============================ FREE GATE ============================
  if (isFree) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 pb-8">
        <div className="flex flex-col items-center rounded-card-sm border border-hair bg-white p-6 text-center shadow-card">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-[16px] bg-lilac-2 text-primary-dark"><Lock size={26} stroke={2.2} /></span>
          <div className="text-[17px] font-extrabold text-ink">{L('Servicios y reservas', 'Services & bookings')}</div>
          <div className="mt-2 max-w-[380px] text-[12.5px] font-medium leading-relaxed text-muted">
            {L(`Publica servicios reservables para ${ci.name}, cobra en línea y gestiona tu calendario. Disponible en el plan Verified.`, `Publish bookable services for ${ci.name}, get paid online and manage your calendar. Available on the Verified plan.`)}
          </div>
          <button onClick={() => ctx.go('billing')} className="mt-4 rounded-btn-lg bg-primary px-6 py-3 text-[13px] font-extrabold text-white shadow-cta-sm">{L('Iniciar verificación', 'Start verification')}</button>
        </div>
      </div>
    );
  }

  // ============================ SUCCESS ============================
  if (view === 'success') {
    const dc = catOf(draft.cat);
    return (
      <>
        <ModulePage title={L('¡Publicado!', 'Published!')} onBack={() => { setView('module'); setMode('services'); setSvcSub('catalog'); }}>
          <div className="mx-auto flex max-w-[440px] flex-col items-center pb-4 pt-4 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-[18px] bg-green-bg text-green"><CheckCircle2 size={34} stroke={2.4} /></span>
            <div className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{(draft.name || L('Nuevo servicio', 'New service')) + ' ' + L('está activo', 'is live')}</div>
            <div className="mt-2 max-w-[300px] text-[13px] font-medium leading-relaxed text-muted">{L('Ya aparece en la pestaña de Servicios de tu listado público.', "It now appears on your public listing's Services tab.")}</div>
            <div className={`mt-5 w-full overflow-hidden text-left ${cardCls}`}>
              <div className="relative h-[104px]" style={{ background: stripe(dc.tile) }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {draft.photoUrl && <img src={draft.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              </div>
              <div className="flex items-center justify-between p-3.5">
                <div className="min-w-0">
                  <div className="text-[14px] font-extrabold text-ink">{draft.name || L('Nuevo servicio', 'New service')}</div>
                  <div className="mt-0.5 text-[11.5px] font-medium text-muted-2">{catLabel(dc)} · {draft.dur} · {priceLabelOf(draft)}</div>
                </div>
                <span className="flex-none rounded-lg bg-green-bg px-2.5 py-1.5 text-[10.5px] font-extrabold text-green-dark">{draft.bookable ? L('Reservable', 'Bookable') : L('Consulta', 'Inquiry')}</span>
              </div>
            </div>
            <div className="mt-5 flex w-full flex-col gap-2.5">
              <button onClick={startAdd} className="flex items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta"><Plus size={16} stroke={2.6} />{L('Agregar otro servicio', 'Add another service')}</button>
              <button onClick={() => { setView('module'); setMode('services'); setSvcSub('catalog'); }} className="rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3.5 text-[13.5px] font-extrabold text-ink">{L('Volver a servicios', 'Back to services')}</button>
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
            <div className={`text-[14px] font-extrabold ${draft.name ? 'text-ink' : 'text-muted-faint'}`}>{draft.name || L('Nombre del servicio', 'Service name')}</div>
            <div className="mt-0.5 text-[10.5px] font-medium text-muted-2">{catLabel(dc)} · {draft.dur}</div>
          </div>
          <span className="whitespace-nowrap text-[14px] font-extrabold text-ink">{priceLabelOf(draft)}</span>
        </div>
      </div>
    );
    const seg = (on: boolean) => `tap-y flex-1 cursor-pointer rounded-lg px-3 py-2 text-center text-[11px] font-extrabold ${on ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`;

    return (
      <>
        <ModulePage
          title={editingId != null ? L('Editar servicio', 'Edit service') : L('Nuevo servicio', 'New service')}
          subtitle={`${catLabel(dc)} · ${L('Paso', 'Step')} ${wizStep + 1}/${wizSteps.length}`}
          onBack={() => { setView('module'); setEditingId(null); }}
          backLabel={editingId != null ? L('Cerrar', 'Close') : L('Cancelar', 'Cancel')}
          maxW={940}
          footer={
            <div className="flex items-center gap-3">
              <button onClick={wizBack} className="flex-none cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3.5 text-[12.5px] font-extrabold text-ink">{wizStep === 0 ? (editingId != null ? L('Cerrar', 'Close') : L('Cancelar', 'Cancel')) : L('Atrás', 'Back')}</button>
              <button onClick={wizNext} disabled={!nextGated} className={`flex-1 rounded-btn-lg py-3.5 text-[13.5px] font-extrabold text-white ${nextGated ? 'cursor-pointer bg-primary shadow-cta-sm' : 'cursor-not-allowed bg-lilac-line'}`}>{wizStep >= wizSteps.length - 1 ? (editingId != null ? L('Guardar cambios', 'Save changes') : L('Publicar servicio', 'Publish service')) : L('Continuar', 'Continue')}</button>
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
                  <div><div className={fieldLabel}>{L('Nombre del servicio', 'Service name')} *</div><input value={draft.name} onChange={(e) => upD({ name: e.target.value })} placeholder={L('Ej. Corte de cabello', 'e.g. Haircut')} className={inputCls} /></div>
                  <div><div className={fieldLabel}>{L('Descripción', 'Description')} <span className="font-semibold text-muted">· {es ? 'ES' : 'EN'}</span></div><textarea value={es ? draft.descEs : draft.descEn} onChange={(e) => upD(es ? { descEs: e.target.value } : { descEn: e.target.value })} rows={3} placeholder={L('Qué incluye, para quién, qué lo hace especial…', 'What it includes, for whom, what makes it special…')} className={`${inputCls} resize-none leading-relaxed`} /></div>
                  <div>
                    <div className={fieldLabel}>{L('Categoría', 'Category')} *</div>
                    <ChipRow className="-mx-1 px-1">
                      {cfg.categories.filter((c) => c.visible || c.id === draft.cat).map((c) => <button key={c.id} onClick={() => upD({ cat: c.id })} className={chip(draft.cat === c.id)}>{catLabel(c)}</button>)}
                      <button onClick={() => { setCatFromWiz(true); setCatSheet({ open: true, initial: null }); }} className="tap-y flex-none cursor-pointer rounded-full border-[1.5px] border-dashed border-lilac-line px-3.5 py-2 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar', 'Add')}</button>
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
                  <div>
                    <div className={fieldLabel}>{L('Etiquetas', 'Tags')}</div>
                    <div className="flex flex-wrap gap-x-2 gap-y-[18px]">
                      {[...SVC_TAGS, ...cfg.tags].map((t) => { const on = draft.tags.includes(t); return <button key={t} onClick={() => upD({ tags: on ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] })} className={chip(on)}>{SVC_TAGS.includes(t) ? tagLabel(t, L) : t}</button>; })}
                      <button onClick={() => setTagSheet(true)} className="tap-y cursor-pointer rounded-full border-[1.5px] border-dashed border-lilac-line px-3.5 py-2 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar', 'Add')}</button>
                    </div>
                  </div>
                </div>
              )}

              {wizStep === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex-1">
                      <div className={fieldLabel}>{L('Precio', 'Price')} {draft.priceType !== 'cotiza' && '*'}</div>
                      <div className={`flex items-center rounded-field border-[1.5px] px-3.5 ${draft.priceType === 'cotiza' ? 'border-lilac-line bg-lilac-2 opacity-60' : 'border-lilac-line bg-white focus-within:border-primary'}`}>
                        <span className="text-[13px] font-bold text-muted-2">$</span>
                        <input value={draft.price} onChange={(e) => upD({ price: e.target.value.replace(/[^0-9.]/g, '') })} disabled={draft.priceType === 'cotiza'} inputMode="decimal" placeholder="0" className="w-full bg-transparent px-2 py-3 text-[13px] font-semibold text-ink outline-none" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className={fieldLabel}>{L('Tipo de precio', 'Price type')}</div>
                      <div className="flex gap-1.5">
                        {([['fijo', L('Fijo', 'Fixed')], ['persona', L('Por pers.', 'Per person')], ['cotiza', L('Cotizar', 'Quote')]] as [PriceType, string][]).map(([k, lbl]) => <button key={k} onClick={() => upD({ priceType: k })} className={seg(draft.priceType === k)}>{lbl}</button>)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className={fieldLabel}>{L('Duración', 'Duration')}</div>
                    <ChipRow className="-mx-1 px-1">
                      {['30 min', '45 min', '60 min', '90 min', '2h', '3h+'].map((d) => <button key={d} onClick={() => upD({ dur: d })} className={chip(draft.dur === d)}>{d}</button>)}
                    </ChipRow>
                  </div>
                  {/* How the customer pays is a BUSINESS-level decision (Modo del
                      listado + whether Stripe is connected), NEVER per service —
                      same rule as the menu. No per-service "deposit" toggle. */}
                  <div className="flex items-start gap-2.5 rounded-btn-lg bg-lilac-2 p-3">
                    <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] bg-white text-primary-dark"><CalendarCheck size={14} stroke={2.2} /></span>
                    <span className="text-[10.5px] font-medium leading-snug text-ink-3">
                      {L('El cobro se define a nivel del negocio: si conectas Stripe, tus clientes pagan en línea; si no, pagan en el local. No se configura por servicio.', 'How you get paid is set at the business level: with Stripe connected, customers pay online; otherwise they pay at your place. Not per service.')}
                    </span>
                  </div>

                  {/* Price variants — optional single-choice group that ADDS to the
                      base price (car wash: vehicle type; cleaning: home size…). */}
                  <div className="rounded-btn-lg border border-hair bg-app p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-bold text-ink">{L('Variantes de precio', 'Price variants')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span></div>
                        <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-muted-2">{L('El cliente elige UNA opción que suma al precio (ej. tipo de vehículo).', 'The customer picks ONE option that adds to the price (e.g. vehicle type).')}</div>
                      </div>
                      <Switch big on={draft.varOpts.length > 0} onClick={() => upD(draft.varOpts.length > 0 ? { varOpts: [], varLabel: '' } : { varOpts: [{ es: '', delta: '' }, { es: '', delta: '' }], varLabel: draft.varLabel })} />
                    </div>
                    {draft.varOpts.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        <input value={draft.varLabel} onChange={(e) => upD({ varLabel: e.target.value })} placeholder={L('Nombre del grupo — ej. Tipo de vehículo', 'Group name — e.g. Vehicle type')} className={inputCls} />
                        {draft.varOpts.map((o, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input value={o.es} onChange={(e) => upD({ varOpts: draft.varOpts.map((x, j) => (j === i ? { ...x, es: e.target.value } : x)) })} placeholder={L(`Opción ${i + 1} — ej. SUV / Crossover`, `Option ${i + 1} — e.g. SUV / Crossover`)} className={inputCls} />
                            <div className="flex w-[110px] flex-none items-center rounded-field border-[1.5px] border-lilac-line bg-white px-2.5 focus-within:border-primary">
                              <span className="text-[12px] font-bold text-muted-2">+$</span>
                              <input value={o.delta} onChange={(e) => upD({ varOpts: draft.varOpts.map((x, j) => (j === i ? { ...x, delta: e.target.value.replace(/[^0-9.]/g, '') } : x)) })} placeholder="0" inputMode="decimal" className="min-w-0 flex-1 bg-transparent px-1 py-3 text-[13px] font-semibold text-ink outline-none" />
                            </div>
                            <button onClick={() => upD({ varOpts: draft.varOpts.filter((_, j) => j !== i) })} aria-label={L('Quitar', 'Remove')} className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-btn border-[1.5px] border-lilac-line bg-white text-muted"><Trash2 size={14} stroke={2.2} /></button>
                          </div>
                        ))}
                        <button onClick={() => upD({ varOpts: [...draft.varOpts, { es: '', delta: '' }] })} className="tap-y cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-white py-2.5 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar opción', 'Add option')}</button>
                        <div className="text-[10px] font-medium text-muted-2">{L('La primera opción suele ser la base (+$0 = Incluido).', 'The first option is usually the base (+$0 = Included).')}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {wizStep === 2 && (
                <div className="flex flex-col gap-2.5">
                  <div className="text-[11px] font-medium leading-relaxed text-muted">{L('Extras reutilizables que el cliente agrega al reservar. Opcional.', 'Reusable extras the customer adds when booking. Optional.')}</div>
                  {cfg.addons.length === 0 && (
                    <div className="rounded-field border-[1.5px] border-dashed border-lilac-line bg-app px-4 py-5 text-center text-[12px] font-semibold text-muted">{L('Aún no tienes add-ons.', "You don't have add-ons yet.")}</div>
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
                  <button onClick={() => setAddonSheet({ open: true, initial: null })} className="mt-1 w-full cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-app py-3 text-[12px] font-extrabold text-primary-dark">+ {L('Nuevo add-on', 'New add-on')}</button>
                </div>
              )}

              {wizStep === 3 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <div className={fieldLabel}>{L('¿Cómo se vende?', 'How is it sold?')}</div>
                    <div className="flex flex-col gap-2.5">
                      {([['bookable', L('Reservable', 'Bookable'), L('Acepta citas con horario', 'Accepts scheduled appointments'), CalendarCheck], ['inquiry', L('Solo consulta', 'Inquiry only'), L('Recolecta leads para cotizar', 'Collects leads to quote'), MessageSquare]] as const).map(([k, lbl, sub, Icon]) => {
                        const on = (k === 'bookable') === draft.bookable;
                        return (
                          <button key={k} onClick={() => upD({ bookable: k === 'bookable' })} className={`flex items-center gap-3 rounded-btn-lg border-[1.5px] p-3 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-lilac text-primary-dark"><Icon size={16} strokeWidth={2.2} /></span>
                            <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-extrabold text-ink">{lbl}</span><span className="mt-0.5 block text-[10px] font-semibold text-muted-2">{sub}</span></span>
                            <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[1.5px] ${on ? 'border-primary' : 'border-muted-faint'}`}>{on && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {draft.bookable && (
                    <>
                      <div>
                        <div className={fieldLabel}>{L('Capacidad por sesión', 'Capacity per session')}</div>
                        <ChipRow className="-mx-1 px-1">{['1', '2–6', '8–16', '20+'].map((c) => <button key={c} onClick={() => upD({ capacity: c })} className={chip(draft.capacity === c)}>{c}</button>)}</ChipRow>
                      </div>
                      <div>
                        <div className={fieldLabel}>{L('Días disponibles', 'Available days')}</div>
                        <div className="flex flex-wrap gap-x-2 gap-y-[18px]">
                          {(es ? DAY_KEYS : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((d, i) => { const key = DAY_KEYS[i]; const on = draft.days.includes(key); return <button key={key} onClick={() => upD({ days: on ? draft.days.filter((x) => x !== key) : [...draft.days, key] })} className={`h-9 w-11 flex-none rounded-lg text-[11px] font-extrabold ${on ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`}>{d}</button>; })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {wizStep === 4 && (() => {
                const editing = editingId != null;
                const addonNames = draft.addons.map((id) => addonOf(id)).filter(Boolean).map((a) => L(a!.es, a!.en ?? a!.es));
                const rows: [string, string, boolean, number][] = [
                  [L('Nombre', 'Name'), draft.name || '—', !!draft.name, 0],
                  [L('Categoría', 'Category'), catLabel(dc), true, 0],
                  [L('Precio', 'Price'), priceLabelOf(draft), !!draft.price || draft.priceType === 'cotiza', 1],
                  [L('Duración', 'Duration'), draft.dur, true, 1],
                  [L('Add-ons', 'Add-ons'), addonNames.length ? addonNames.join(', ') : L('Ninguno', 'None'), true, 2],
                  [L('Modo', 'Mode'), draft.bookable ? L('Reservable', 'Bookable') : L('Solo consulta', 'Inquiry only'), true, 3],
                ];
                return (
                  <div className="flex flex-col gap-4">
                    <div className={`flex items-center gap-3 rounded-btn-lg border p-3.5 ${draftReady ? 'border-[#A7E3C0] bg-green-bg' : 'border-[#FDE68A] bg-amber-bg'}`}>
                      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-white text-[15px] font-extrabold ${draftReady ? 'text-green-dark' : 'text-amber-ink'}`}>{draftReady ? '✓' : '⚠'}</span>
                      <div className="min-w-0">
                        <div className={`text-[12px] font-extrabold ${draftReady ? 'text-green-dark' : 'text-amber-ink'}`}>{draftReady ? (editing ? L('Listo para guardar', 'Ready to save') : L('Listo para publicar', 'Ready to publish')) : L('Faltan datos', 'A few essentials missing')}</div>
                        <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-ink-3">{draftReady ? L('Aparecerá en tu listado al instante.', "It'll appear on your listing instantly.") : L('Agrega nombre y precio antes de continuar.', 'Add a name and price before continuing.')}</div>
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
                        <div className={fieldLabel}>{L('Administrar servicio', 'Manage service')}</div>
                        <div className="flex gap-2.5">
                          <button onClick={duplicateFromDraft} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3 text-[12.5px] font-extrabold text-ink"><Copy size={14} stroke={2.4} />{L('Duplicar', 'Duplicate')}</button>
                          <button onClick={() => setConfirmDel(true)} className="tap flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn-lg border-[1.5px] border-pink-bg bg-white py-3 text-[12.5px] font-extrabold text-pink-dark"><Trash2 size={14} stroke={2.4} />{L('Eliminar', 'Delete')}</button>
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
        <QuickTagSheet open={tagSheet} onClose={() => setTagSheet(false)} L={L} onCreate={addTag} existing={[...SVC_TAGS, ...cfg.tags]} />
        <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={() => { setConfirmDel(false); deleteEditing(); }} title={L('¿Eliminar servicio?', 'Delete service?')} message={L(`“${draft.name || L('Este servicio', 'This service')}” se quitará de tu listado. Esta acción no se puede deshacer.`, `“${draft.name || 'This service'}” will be removed from your listing. This can’t be undone.`)} confirmLabel={L('Eliminar', 'Delete')} cancelLabel={L('Cancelar', 'Cancel')} />
        <Toast msg={toast} />
      </>
    );
  }

  // ============================ MODULE ============================
  const modeBtn = (on: boolean) => `tap-y flex flex-1 items-center justify-center gap-2 rounded-btn py-2.5 text-[12.5px] font-extrabold ${on ? 'bg-ink text-white' : 'bg-lilac-2 text-ink-2'}`;

  function editorSheets() {
    return (
      <>
        <ServiceCategoryEditor open={catSheet.open} onClose={() => { setCatSheet((s) => ({ ...s, open: false })); setCatFromWiz(false); }} L={L} initial={catSheet.initial} itemCount={catSheet.initial ? countIn(catSheet.initial.id) : 0} onSave={upsertCategory} onDelete={deleteCategory} />
        <ServiceAddonEditor open={addonSheet.open} onClose={() => setAddonSheet((s) => ({ ...s, open: false }))} L={L} initial={addonSheet.initial} usedCount={addonSheet.initial ? addonUsedBy(addonSheet.initial.id) : 0} onSave={upsertAddon} onDelete={deleteAddon} />
        <ServiceProviderEditor
          open={proSheet.open}
          onClose={() => setProSheet((s) => ({ ...s, open: false }))}
          L={L}
          initial={proSheet.initial}
          services={services.filter((s) => s.dbId && s.bookable).map((s) => ({ id: s.dbId!, name: s.name }))}
          onSave={upsertProvider}
          onDelete={deleteProvider}
          onPickPhoto={async (file) => {
            try { return !persistable || !user || !supabase ? URL.createObjectURL(file) : await uploadImage(file, user.id, 800); }
            catch { flash(L('No se pudo subir la foto.', "Couldn't upload the photo.")); return null; }
          }}
        />
        {walkInSheet()}
      </>
    );
  }

  // Walk-in / phone booking sheet ("+ Agendar cita").
  function walkInSheet() {
    const svc = services.find((s) => s.id === walk.svcId);
    const times = Array.from({ length: 25 }, (_, i) => {
      const min = 8 * 60 + i * 30; // 8:00 → 20:00 every 30 min
      return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
    });
    const activePros = cfg.providers.filter((p) => p.active !== false);
    return (
      <Overlay open={walkOpen} onClose={() => setWalkOpen(false)} width={440}>
        <OverlayTitle title={L('Agendar cita', 'Add appointment')} onClose={() => setWalkOpen(false)} />
        <div className="flex flex-col gap-3.5">
          <div>
            <div className={fieldLabel}>{L('Servicio', 'Service')} *</div>
            <div className="flex flex-wrap gap-x-1 gap-y-[18px].5">
              {walkServices.map((s) => (
                <button key={s.id} onClick={() => setWalk((w) => ({ ...w, svcId: s.id }))} className={`tap-y cursor-pointer rounded-full border-[1.5px] px-3 py-1.5 text-[11px] font-extrabold ${walk.svcId === s.id ? 'border-primary bg-lilac-3 text-primary-dark' : 'border-lilac-line bg-white text-muted'}`}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><div className={fieldLabel}>{L('Cliente', 'Customer')} *</div><input value={walk.name} onChange={(e) => setWalk((w) => ({ ...w, name: e.target.value }))} placeholder={L('Nombre', 'Name')} className={inputCls} /></div>
            <div className="flex-1"><div className={fieldLabel}>{L('Teléfono', 'Phone')}</div><input value={walk.phone} onChange={(e) => setWalk((w) => ({ ...w, phone: e.target.value }))} placeholder={L('Opcional', 'Optional')} inputMode="tel" className={inputCls} /></div>
          </div>
          <div>
            <div className={fieldLabel}>{L('Fecha', 'Date')} *</div>
            <ChipRow className="-mx-1 px-1">
              {agendaDays.map((d) => (
                <button key={d.key} onClick={() => setWalk((w) => ({ ...w, day: d.key }))} className={`tap-y flex-none cursor-pointer rounded-btn px-2.5 py-1.5 text-center ${walk.day === d.key ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-soft'}`}>
                  <span className={`block text-[9.5px] font-bold ${walk.day === d.key ? 'text-white/80' : 'text-muted'}`}>{d.lab}</span>
                  <span className="block text-[13px] font-extrabold leading-tight">{d.day}</span>
                </button>
              ))}
            </ChipRow>
          </div>
          <div>
            <div className={fieldLabel}>{L('Hora', 'Time')} *</div>
            <ChipRow className="-mx-1 px-1">
              {times.map((t) => (
                <button key={t} onClick={() => setWalk((w) => ({ ...w, time: t }))} className={`tap-y flex-none cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold ${walk.time === t ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`}>{t}</button>
              ))}
            </ChipRow>
          </div>
          {activePros.length > 0 && (
            <div>
              <div className={fieldLabel}>{L('Profesional', 'Professional')}</div>
              <div className="flex flex-wrap gap-x-1 gap-y-[18px].5">
                <button onClick={() => setWalk((w) => ({ ...w, staff: '' }))} className={`tap-y cursor-pointer rounded-full border-[1.5px] px-3 py-1.5 text-[11px] font-extrabold ${walk.staff === '' ? 'border-primary bg-lilac-3 text-primary-dark' : 'border-lilac-line bg-white text-muted'}`}>{L('Sin asignar', 'Unassigned')}</button>
                {activePros.map((p) => (
                  <button key={p.id} onClick={() => setWalk((w) => ({ ...w, staff: p.id }))} className={`tap-y flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-[11px] font-extrabold ${walk.staff === p.id ? 'border-primary bg-lilac-3 text-primary-dark' : 'border-lilac-line bg-white text-muted'}`}>
                    <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />{p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className={fieldLabel}>{L('Nota', 'Note')}</div>
            <input value={walk.note} onChange={(e) => setWalk((w) => ({ ...w, note: e.target.value }))} placeholder={L('Opcional', 'Optional')} className={inputCls} />
          </div>
          {svc && svc.priceType !== 'cotiza' && Number(svc.price) > 0 && (
            <div className="rounded-field bg-lilac-2 px-3.5 py-2.5 text-[12px] font-semibold text-ink-2">
              {L('Cobras en sitio', 'You collect on site')}: <span className="font-extrabold text-ink">${Number(svc.price) || 0}</span> · {svc.dur}
            </div>
          )}
          <button onClick={() => void submitWalkIn()} disabled={walkBusy || !walk.name.trim() || !walk.day} className="w-full cursor-pointer rounded-btn bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm disabled:cursor-not-allowed disabled:opacity-50">
            {walkBusy ? L('Creando…', 'Creating…') : L('Crear cita confirmada', 'Create confirmed appointment')}
          </button>
        </div>
      </Overlay>
    );
  }

  // ---- services · catalog ----
  const groups = cfg.categories.filter((c) => c.visible).map((c) => ({ cat: c, list: services.filter((s) => s.cat === c.id) }))
    .concat([{ cat: FALLBACK_CAT, list: services.filter((s) => !cfg.categories.some((c) => c.id === s.cat)) }])
    .filter((g) => g.list.length);

  const catalog = (
    <div className="flex flex-col gap-4">
      {/* MODE: display-only vs online bookings */}
      <div className={`${cardCls} p-3.5`}>
        <div className="mb-2 flex items-center gap-2 text-[12.5px] font-extrabold text-ink"><CalendarCheck size={15} stroke={2.2} className="text-primary-dark" />{L('Modo del listado', 'Listing mode')}</div>
        <div className="flex rounded-full bg-lilac-2 p-0.5">
          <button onClick={() => { if (cfg.booking) { saveCfg({ ...cfg, booking: false }); flash(L('Servicios en modo Solo mostrar', 'Services set to Display only')); } }} className={`tap-y flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${!cfg.booking ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`}>{L('Solo mostrar', 'Display only')}</button>
          <button onClick={() => { if (!cfg.booking) { saveCfg({ ...cfg, booking: true }); flash(L('Servicios con reservas en línea', 'Services set to Online bookings')); } }} className={`tap-y flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${cfg.booking ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`}>{L('Aceptar reservas', 'Accept bookings')}</button>
        </div>
        <p className="mt-2 text-[11px] font-medium leading-relaxed text-muted">
          {cfg.booking
            ? L('Tu listado muestra tus servicios y los clientes pueden reservar en línea (botón Reservar).', 'Your listing shows services and customers can book online (Reservar button).')
            : L('Tu listado muestra tus servicios y precios. Los clientes te llaman o visitan para reservar — sin reservas en línea.', 'Your listing shows services & prices. Customers call or visit to book — no online booking.')}
        </p>
      </div>

      {/* APPROVAL MODE: auto-confirm vs manual approval (Booksy "Instant book" vs
          "Request to book"). Only meaningful when accepting bookings. */}
      {cfg.booking && (
        <div className={`${cardCls} p-3.5`}>
          <div className="mb-2 flex items-center gap-2 text-[12.5px] font-extrabold text-ink"><CheckCircle2 size={15} stroke={2.2} className="text-primary-dark" />{L('Confirmación de citas', 'Booking confirmation')}</div>
          <div className="flex rounded-full bg-lilac-2 p-0.5">
            <button onClick={() => { if (cfg.autoConfirm) { saveCfg({ ...cfg, autoConfirm: false }); flash(L('Las citas requieren tu aprobación', 'Bookings now need your approval')); } }} className={`tap-y flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${!cfg.autoConfirm ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`}>{L('Requiere aprobación', 'Needs approval')}</button>
            <button onClick={() => { if (!cfg.autoConfirm) { saveCfg({ ...cfg, autoConfirm: true }); flash(L('Las citas se confirman automáticamente', 'Bookings now confirm automatically')); } }} className={`tap-y flex-1 cursor-pointer rounded-full py-2 text-center text-[12px] font-extrabold transition-colors ${cfg.autoConfirm ? 'bg-white text-primary-dark shadow-cta-sm' : 'text-muted'}`}>{L('Automática', 'Automatic')}</button>
          </div>
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-muted">
            {cfg.autoConfirm
              ? L('La cita queda confirmada al instante cuando el cliente reserva. No tienes que hacer nada.', 'The appointment is confirmed instantly when the customer books. You don’t have to do anything.')
              : L('Cada cita llega como «Por confirmar» a tu agenda. Tú la confirmas o rechazas — el cliente recibe aviso.', 'Each booking arrives as “Pending” in your agenda. You confirm or decline — the customer is notified.')}
          </p>
          <p className="mt-1.5 text-[10.5px] font-semibold leading-relaxed text-muted-2">
            {L('Las citas que se pagan en línea siempre quedan confirmadas al pagar.', 'Bookings paid online are always confirmed on payment.')}
          </p>
        </div>
      )}

      {groups.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Aún no tienes servicios — agrega el primero.', 'No services yet — add your first one.')}</div>
      ) : groups.map((g) => (
        <div key={g.cat.id}>
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-white" style={{ background: stripe(g.cat.tile) }}>{(() => { const Icon = svcCatIcon(g.cat.icon); return <Icon size={16} strokeWidth={2.2} />; })()}</span>
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-ink">{catLabel(g.cat)}</div>
              <div className="text-[10px] font-semibold text-muted-2">{g.list.length} {g.list.length === 1 ? L('servicio', 'service') : L('servicios', 'services')}</div>
            </div>
          </div>
          <div className="grid gap-2.5 md:grid-cols-2">
            {g.list.map((s) => (
              <button key={s.id} onClick={() => startEdit(s)} className={`${cardCls} cursor-pointer p-3 text-left`}>
                <div className="flex gap-3">
                  <span className="relative h-[60px] w-[60px] flex-none overflow-hidden rounded-tile" style={{ background: stripe(catOf(s.cat).tile) }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s.imageUrl && <img src={s.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[13.5px] font-extrabold text-ink">{s.name}</span><Pencil size={11} stroke={2.4} className="flex-none text-muted-faint" /></span>
                      <span className="whitespace-nowrap text-[13.5px] font-extrabold text-ink">{priceLabelOf(s)}</span>
                    </span>
                    <span className="mt-0.5 block text-[10.5px] font-semibold text-muted-2">{s.dur} · {s.bookable ? L('reservable', 'bookable') : L('solo consulta', 'inquiry only')}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-[18px].5">
                      {s.addons.length > 0 && <span className="rounded-md bg-lilac px-1.5 py-0.5 text-[9px] font-extrabold text-primary-dark">{s.addons.length} {L('add-ons', 'add-ons')}</span>}
                      {s.tags.map((t) => <span key={t} className="rounded-md bg-amber-bg px-1.5 py-0.5 text-[9px] font-extrabold text-amber-ink">{tagLabel(t, L)}</span>)}
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <button onClick={startAdd} className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[14px] font-extrabold text-white shadow-cta-sm"><Plus size={16} stroke={2.6} />{L('Nuevo servicio', 'New service')}</button>
    </div>
  );

  // ---- services · categories ----
  const categoriesTab = (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3 text-[11.5px] font-medium leading-relaxed text-ink-3">{cfg.categories.length}{L(' categorías · toca para editar · reordena con las flechas · activa/desactiva para mostrar', ' categories · tap to edit · reorder with the arrows · toggle to show')}</div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {cfg.categories.map((c, i) => {
          const Icon = svcCatIcon(c.icon); const n = countIn(c.id);
          return (
            <div key={c.id} className={`flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 shadow-card ${c.visible ? '' : 'opacity-60'}`}>
              <span className="flex flex-none flex-col">
                <button onClick={() => moveCategory(c.id, -1)} disabled={i === 0} aria-label={L('Subir', 'Up')} className="cursor-pointer p-0.5 text-muted-2 disabled:opacity-25"><ChevronUp size={13} stroke={2.6} /></button>
                <button onClick={() => moveCategory(c.id, 1)} disabled={i === cfg.categories.length - 1} aria-label={L('Bajar', 'Down')} className="cursor-pointer p-0.5 text-muted-2 disabled:opacity-25"><ChevronDown size={13} stroke={2.6} /></button>
              </span>
              <button onClick={() => setCatSheet({ open: true, initial: c })} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[11px] text-white" style={{ background: stripe(c.tile) }}><Icon size={18} strokeWidth={2.2} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-ink">{catLabel(c)}</span><Pencil size={11} stroke={2.4} className="flex-none text-muted-faint" />{!c.visible && <span className="rounded bg-lilac-2 px-1.5 py-px text-[8.5px] font-extrabold text-muted-2">{L('Oculto', 'Hidden')}</span>}</div>
                  <div className="mt-0.5 text-[10px] font-semibold text-muted-2">{n} {n === 1 ? L('servicio', 'service') : L('servicios', 'services')}</div>
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

  // ---- services · add-ons ----
  const addonsTab = (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3.5 flex items-center gap-3 rounded-tile bg-lilac-2 p-3">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-primary"><Zap size={15} className="text-white" stroke={2.2} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[12px] font-extrabold text-ink">{L('Extras reutilizables', 'Reusable extras')}</span><span className="block text-[10.5px] font-medium leading-snug text-ink-3">{L('Crea un add-on una vez, úsalo en cualquier servicio.', 'Build an add-on once, use it on any service.')}</span></span>
      </div>
      {cfg.addons.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Aún no hay add-ons — crea el primero (ej. Lavado, Diseño de barba).', 'No add-ons yet — create your first (e.g. Wash, Beard design).')}</div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {cfg.addons.map((a) => {
            const used = addonUsedBy(a.id);
            return (
              <button key={a.id} onClick={() => setAddonSheet({ open: true, initial: a })} className="flex cursor-pointer items-center gap-3 rounded-card-sm border border-hair bg-white p-3 text-left shadow-card">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-lilac"><Zap size={16} className="text-primary-dark" stroke={2.2} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-ink">{L(a.es, a.en ?? a.es)}</span><Pencil size={11} stroke={2.4} className="flex-none text-muted-faint" /></span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-muted-2">{used} {used === 1 ? L('servicio', 'service') : L('servicios', 'services')}</span>
                </span>
                <span className="flex-none text-[13px] font-extrabold text-ink">{a.price ? `+$${a.price}` : L('Gratis', 'Free')}</span>
              </button>
            );
          })}
        </div>
      )}
      <button onClick={() => setAddonSheet({ open: true, initial: null })} className={addBtn}>+ {L('Nuevo add-on', 'New add-on')}</button>
    </div>
  );

  // ---- services · professionals (the public bookable team — service_config.providers) ----
  const prosTab = (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-3.5 flex items-center gap-3 rounded-tile bg-lilac-2 p-3">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-primary"><Users size={15} className="text-white" stroke={2.2} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-extrabold text-ink">{L('Tu equipo reservable', 'Your bookable team')}</span>
          <span className="block text-[10.5px] font-medium leading-snug text-ink-3">{L('El cliente elige a su profesional al reservar — y el sistema evita dobles citas por persona.', 'Customers pick their professional when booking — the system blocks double-booking per person.')}</span>
        </span>
      </div>
      {cfg.providers.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Aún no hay profesionales — agrega a tu equipo (ej. Marco · Fades, Tony · Barbas).', 'No professionals yet — add your team (e.g. Marco · Fades, Tony · Beards).')}</div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {cfg.providers.map((p) => {
            const nSvc = !p.serviceIds || p.serviceIds.length === 0 ? null : p.serviceIds.length;
            return (
              <div key={p.id} className={`flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 shadow-card ${p.active === false ? 'opacity-60' : ''}`}>
                <button onClick={() => setProSheet({ open: true, initial: p })} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                  <span className="relative flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-full text-[14px] font-extrabold text-white" style={{ background: p.color }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.photo ? <img src={p.photo} alt="" className="absolute inset-0 h-full w-full object-cover" /> : p.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-ink">{p.name}</span><Pencil size={11} stroke={2.4} className="flex-none text-muted-faint" />{p.active === false && <span className="rounded bg-lilac-2 px-1.5 py-px text-[8.5px] font-extrabold text-muted-2">{L('Oculto', 'Hidden')}</span>}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-semibold text-muted-2">{L(p.tagEs, p.tagEn ?? p.tagEs)}{nSvc != null ? ` · ${nSvc} ${nSvc === 1 ? L('servicio', 'service') : L('servicios', 'services')}` : ` · ${L('todos los servicios', 'all services')}`}</span>
                  </span>
                </button>
                <Switch big on={p.active !== false} onClick={() => upsertProvider({ ...p, active: p.active === false })} />
              </div>
            );
          })}
        </div>
      )}
      <button onClick={() => setProSheet({ open: true, initial: null })} className={addBtn}>+ {L('Nuevo profesional', 'New professional')}</button>
    </div>
  );

  // ---- bookings (Reservas) — Booksy-style day agenda ----
  // Sin filas reales → agenda VACÍA, nunca DEMO_BOOKINGS. `bookingRows` queda en
  // null cuando no hay negocio real o el backend falla (l.196), así que este
  // respaldo podía mostrarle CITAS INVENTADAS a un dueño real durante un fallo de
  // red — con nombres de clientes y horas que no existen (regla #8).
  const allBk = bookingRows ?? [];
  const nowMs = Date.now();
  const activeSt = (s: BkStatus) => s === 'pending' || s === 'confirmed' || s === 'seated';
  const countOn = (key: string) => allBk.filter((b) => activeSt(b.status) && bookingDayKey(b.starts_at) === key).length;
  const bkList = allBk
    .filter((b) => bookFilter === 'all' || b.status === bookFilter)
    .filter((b) => bkDay === 'all' || bookingDayKey(b.starts_at) === bkDay)
    .filter((b) => bkStaff === 'all' || b.staff_id === bkStaff);
  const todayKey = agendaDays[0]?.key ?? '';
  const todayCount = countOn(todayKey);
  const upcoming = allBk.filter((b) => b.status === 'pending' || b.status === 'confirmed').length;
  const pending = allBk.filter((b) => b.status === 'pending').length;
  const depositsHeld = allBk.filter((b) => b.status !== 'cancelled').reduce((n, b) => n + (b.deposit ?? 0), 0);

  const kpis: { Icon: LucideIcon; c: string; bg: string; label: string; value: string }[] = [
    { Icon: CalendarCheck, c: '#1F8A4C', bg: '#E3F5EA', label: L('Hoy', 'Today'), value: String(todayCount) },
    { Icon: MessageSquare, c: '#9A6A12', bg: '#FCEFD6', label: L('Por confirmar', 'Pending'), value: String(pending) },
    { Icon: CalendarDays, c: '#6D4DF6', bg: '#EFEBFF', label: L('Próximas', 'Upcoming'), value: String(upcoming) },
    { Icon: DollarSign, c: '#D6336C', bg: '#FDE7EF', label: L('Cobrado en línea', 'Paid online'), value: `$${depositsHeld}` },
  ];
  const bkFilterChip = (on: boolean) => `tap-y flex-none cursor-pointer rounded-lg px-2.5 py-1.5 text-[10.5px] font-extrabold ${on ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`;

  const bookings = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${cardCls} p-3`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: k.bg }}><k.Icon size={16} strokeWidth={2.2} style={{ color: k.c }} /></span>
            <div className="mt-2 text-[10px] font-semibold text-muted-2">{k.label}</div>
            <div className="mt-0.5 text-[19px] font-extrabold text-ink">{k.value}</div>
          </div>
        ))}
      </div>

      {/* agenda day strip: Todas + next 14 days with live counts */}
      <ChipRow className="-mx-1 px-1">
        <button onClick={() => setBkDay('all')} className={`tap-y flex-none cursor-pointer rounded-btn px-3 py-2 text-center ${bkDay === 'all' ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-soft'}`}>
          <span className="block text-[11.5px] font-extrabold">{L('Todas', 'All')}</span>
        </button>
        {agendaDays.map((d) => {
          const on = bkDay === d.key;
          const n = countOn(d.key);
          return (
            <button key={d.key} onClick={() => setBkDay(d.key)} className={`tap-y flex-none cursor-pointer rounded-btn px-2.5 py-1.5 text-center ${on ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-soft'}`}>
              <span className={`block text-[9.5px] font-bold ${on ? 'text-white/80' : 'text-muted'}`}>{d.lab}</span>
              <span className="block text-[13.5px] font-extrabold leading-tight">{d.day}</span>
              <span className={`block text-[8.5px] font-extrabold ${n > 0 ? (on ? 'text-white' : 'text-primary-dark') : 'opacity-0'}`}>{n} {n === 1 ? L('cita', 'appt') : L('citas', 'appts')}</span>
            </button>
          );
        })}
      </ChipRow>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-[18px]">
        <ChipRow className="-mx-1 min-w-0 flex-1 px-1">
          {([['all', L('Todas', 'All')], ['pending', L('Por confirmar', 'Pending')], ['confirmed', L('Confirmadas', 'Confirmed')], ['seated', L('En curso', 'In progress')], ['done', L('Completadas', 'Done')], ['no_show', L('No vino', 'No-show')], ['cancelled', L('Canceladas', 'Cancelled')]] as [typeof bookFilter, string][]).map(([k, lbl]) => (
            <button key={k} onClick={() => setBookFilter(k)} className={bkFilterChip(bookFilter === k)}>{lbl}</button>
          ))}
        </ChipRow>
        {persistable && walkServices.length > 0 && (
          <button onClick={() => { setWalk({ svcId: walkServices[0].id, name: '', phone: '', day: todayKey, time: '12:00', staff: '', note: '' }); setWalkOpen(true); }} className="tap-y flex-none cursor-pointer rounded-btn bg-primary px-3 py-2 text-[11.5px] font-extrabold text-white shadow-cta-sm">
            + {L('Agendar cita', 'Add appointment')}
          </button>
        )}
      </div>

      {/* professional filter (only when a bookable team exists) */}
      {cfg.providers.filter((p) => p.active !== false).length > 0 && (
        <ChipRow className="-mx-1 px-1">
          <button onClick={() => setBkStaff('all')} className={bkFilterChip(bkStaff === 'all')}>{L('Todo el equipo', 'Whole team')}</button>
          {cfg.providers.filter((p) => p.active !== false).map((p) => (
            <button key={p.id} onClick={() => setBkStaff(p.id)} className={`tap-y flex-none flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10.5px] font-extrabold ${bkStaff === p.id ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`}>
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: p.color }} />{p.name}
            </button>
          ))}
        </ChipRow>
      )}

      {bkList.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{falloCitas
          ? L('No pudimos cargar tus citas. Revisa tu conexión y vuelve a entrar.', "We couldn't load your appointments. Check your connection and come back.")
          : bookingRows == null ? L('Reservas de ejemplo — las reales de tus clientes aparecerán aquí.', 'Sample bookings — your real customer bookings appear here.') : L('Sin citas en este día/filtro.', 'No appointments for this day/filter.')}</div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {bkList.map((b) => {
            const bd = BK_STATUS[b.status];
            const canAct = !!b.id && b.status !== 'done' && b.status !== 'cancelled' && b.status !== 'no_show' && bookingRows != null;
            const started = new Date(b.starts_at).getTime() <= nowMs;
            return (
              <div key={b.id} className={`${cardCls} p-3`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 flex-none flex-col items-center justify-center rounded-btn-lg bg-lilac-2">
                    <span className="text-[11px] font-extrabold leading-tight text-primary-dark">{bookingHour(b.starts_at)}</span>
                    {b.duration_min ? <span className="text-[8.5px] font-bold text-muted">{b.duration_min} min</span> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5"><span className="truncate text-[12.5px] font-extrabold text-ink">{b.customer_name}</span>{b.customer_phone && <span className="flex-none text-[9.5px] font-bold text-muted">{b.customer_phone}</span>}</div>
                    <div className="mt-0.5 text-[10.5px] font-semibold text-ink-3">
                      {b.service_name || L('Reserva', 'Booking')}
                      {b.variant ? ` · ${b.variant}` : ''}
                      {b.party_size && b.party_size > 1 ? ` · ${b.party_size} ${L('pers', 'ppl')}` : ''}
                    </div>
                    <div className="mt-0.5 text-[10px] font-medium text-muted-2">{bookingWhen(b.starts_at, es)}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-[18px].5">
                      {b.staff_name && (
                        <span className="flex items-center gap-1 rounded bg-lilac-2 px-1.5 py-0.5 text-[9px] font-extrabold text-ink-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: providerColor(b.staff_id) }} />{b.staff_name}
                        </span>
                      )}
                      {Array.isArray(b.addons) && b.addons.length > 0 && <span className="rounded bg-lilac px-1.5 py-0.5 text-[9px] font-extrabold text-primary-dark">{b.addons.map((a) => a.n).join(' · ')}</span>}
                      {b.deposit ? <span className="rounded bg-green-bg px-1.5 py-0.5 text-[9px] font-extrabold text-green-dark">{L('Pagado', 'Paid')} ${b.deposit}</span>
                        : b.total ? <span className="rounded bg-amber-bg px-1.5 py-0.5 text-[9px] font-extrabold text-amber-ink">{L('Cobra en sitio', 'Collect on site')} ${b.total}</span> : null}
                    </div>
                    {b.notes && <div className="mt-1.5 rounded-r-md border-l-2 border-lilac-line bg-app px-2 py-1.5 text-[10px] font-medium italic leading-snug text-muted-2">&ldquo;{b.notes}&rdquo;</div>}
                  </div>
                  <span className={`flex-none self-start rounded-md px-2 py-1 text-[9px] font-extrabold ${bd.cls}`}>{L(bd.es, bd.en)}</span>
                </div>
                {canAct && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-[18px] border-t border-dashed border-hair pt-2.5">
                    {b.status === 'pending' && <button onClick={() => setBookingStatus(b.id, 'confirmed')} className="tap-y rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-extrabold text-white">{L('Confirmar', 'Confirm')}</button>}
                    {b.status === 'confirmed' && <button onClick={() => setBookingStatus(b.id, 'seated')} className="tap-y rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-extrabold text-white">{L('Iniciar', 'Start')}</button>}
                    {b.status === 'seated' && <button onClick={() => setBookingStatus(b.id, 'done')} className="tap-y rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-extrabold text-white">{L('Completar', 'Complete')}</button>}
                    {b.status === 'confirmed' && started && <button onClick={() => setBookingStatus(b.id, 'no_show')} className="tap-y rounded-lg border-[1.5px] border-amber-bg bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-amber-ink">{L('No vino', 'No-show')}</button>}
                    {(b.status === 'pending' || b.status === 'confirmed') && <button onClick={() => setBookingStatus(b.id, 'cancelled')} className="tap-y rounded-lg border-[1.5px] border-pink-bg bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-pink-dark">{b.status === 'pending' ? L('Rechazar', 'Decline') : L('Cancelar', 'Cancel')}</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative pb-8">
      <div className="mb-3 flex gap-2">
        <button onClick={() => setMode('services')} className={modeBtn(mode === 'services')}><Wrench size={14} stroke={2} />{L('Servicios', 'Services')}</button>
        <button onClick={() => setMode('bookings')} className={modeBtn(mode === 'bookings')}><CalendarDays size={14} stroke={2} />{L('Reservas', 'Bookings')}{upcoming > 0 && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-extrabold text-white">{upcoming}</span>}</button>
      </div>

      {mode === 'services' && (
        <SectionTabs
          className="mb-4"
          tabs={[
            ['catalog', L('Catálogo', 'Catalog')],
            ['cats', L('Categorías', 'Categories'), cfg.categories.length],
            ['addons', L('Add-ons', 'Add-ons'), cfg.addons.length],
            ['pros', L('Profesionales', 'Team'), cfg.providers.length],
          ] as SectionTab<typeof svcSub>[]}
          value={svcSub}
          onChange={setSvcSub}
        />
      )}

      {mode === 'services' ? (svcSub === 'catalog' ? catalog : svcSub === 'cats' ? categoriesTab : svcSub === 'addons' ? addonsTab : prosTab) : bookings}

      {!isPremium && (
        <div className="mt-4 flex flex-wrap items-center gap-3.5 rounded-card-sm p-4 text-white shadow-band" style={{ background: 'linear-gradient(140deg,#1E1B2E,#3A2E6E)' }}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-[rgba(244,183,64,.2)] text-amber"><Sparkles size={18} stroke={2.2} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-extrabold">{L('Recordatorios SMS automáticos', 'Automatic SMS reminders')}</span>
            <span className="mt-0.5 block max-w-[520px] text-[11.5px] font-medium leading-snug text-[rgba(255,255,255,.7)]">{L('Reduce no-shows con recordatorios automáticos a tus clientes. Incluido en Premium.', 'Cut no-shows with automatic reminders to your customers. Included with Premium.')}</span>
          </span>
          <button onClick={() => ctx.go('billing')} className="tap-y flex-none rounded-btn bg-amber px-3.5 py-2.5 text-[12px] font-extrabold text-ink">{L('Mejorar a Premium', 'Upgrade to Premium')}</button>
        </div>
      )}

      {editorSheets()}
      <Toast msg={toast} />
    </div>
  );
}

// ---------- draft ----------
type Draft = {
  name: string; descEs: string; descEn: string; cat: string; price: string; priceType: 'fijo' | 'persona' | 'cotiza';
  dur: string; bookable: boolean; addons: string[]; tags: string[]; days: string[]; capacity: string; photoUrl: string;
  // Optional price-variant group (delta as string while typing).
  varLabel: string; varOpts: { es: string; delta: string }[];
};
const newDraft = (cat: string): Draft => ({ name: '', descEs: '', descEn: '', cat, price: '', priceType: 'fijo', dur: '60 min', bookable: true, addons: [], tags: [], days: ['Vie', 'Sáb', 'Dom'], capacity: '1', photoUrl: '', varLabel: '', varOpts: [] });
const SVC_TAGS = ['Más reservado', 'Familiar', 'Premium', 'Nuevo'];
const tagLabel = (t: string, L: (es: string, en: string) => string) => ({ 'Más reservado': L('Más reservado', 'Most booked'), Familiar: L('Familiar', 'Family'), Premium: 'Premium', Nuevo: L('Nuevo', 'New') } as Record<string, string>)[t] ?? t;

// Sample bookings for demo (no dbId → no persistence, no status actions).

