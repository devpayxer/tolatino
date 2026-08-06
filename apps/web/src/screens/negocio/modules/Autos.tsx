'use client';

// Autos — CAR DEALER panel module (business dashboard). Built from the "ToLatino
// Auto Dealer" handoff: (1) Resumen/list — KPIs, "Requiere atención", inventory
// with status filters; (2) vehicle detail with performance + status changes +
// per-vehicle leads; (3) a 4-step publish wizard (Vehículo → Precio → Fotos →
// Revisar) with a license gate (auto_config.license) before publishing; (4) leads
// pipeline with stage moves; (5) financing pipeline (pre-qual leads); (6) test-
// drive agenda (7-day strip, confirm / reschedule / complete); (7) an Equipo tab
// (salespeople stored in auto_config.team). Benchmarked vs CarGurus / AutoTrader
// dealer tools. Demo mode (no signed-in business) shows realistic sample data with
// local-only actions; a REAL business sees ONLY its real rows (honest zeros/empty
// states — never fabricated numbers for a real dealer).

import { useEffect, useMemo, useRef, useState } from 'react';
import { imgUrl, ANCHO } from '@/lib/img';
import {
  IconCalendarEvent as CalendarEvent, IconCar as Car, IconCertificate as Certificate,
  IconCheck as Check, IconChevronRight as ChevronRight, IconCreditCard as CreditCard,
  IconExternalLink as ExternalLink, IconEye as Eye, IconGauge as Gauge, IconHeart as Heart,
  IconMail as Mail, IconPhone as Phone, IconPhotoPlus as ImagePlus, IconPlus as Plus,
  IconTrash as Trash2, IconUserPlus as UserPlus, IconUsers as Users, IconX as X,
} from '@tabler/icons-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image';
import { searchAddress, type Address } from '@/lib/geo';
import {
  upsertVehicle, fetchMyVehicles, fetchMyVehicleLeads, setVehicleLeadStage,
  fetchMyVehicleTests, setVehicleTestStatus,
  AU_CONDS, AU_TYPES, AU_TRANS, AU_FUELS, AU_MAKES, AU_TILE, fmtAuPrice, fmtMiles, estMonthly,
  type AuCard, type AuLead, type AuTest, type AuCond, type AuType, type AuStatus,
  type AuLeadStage, type AuTestStatus,
} from '@/lib/autos';

const cardCls = 'rounded-card-sm border border-line bg-white shadow-card';

type View = 'list' | 'detail' | 'wizard' | 'success' | 'leads' | 'lead' | 'financing' | 'tests' | 'team';
type MyVehicle = AuCard & { leadsCount: number; testsCount: number };
type MyLead = AuLead & { vehicleTitle: string };
type MyTest = AuTest & { vehicleTitle: string };
type Member = { name: string; role: string; phone: string };

/** The exact shape written to businesses.auto_config (merged over existing keys). */
type AutoConfig = {
  license?: string; sellerType?: string; bhph?: boolean; financing?: boolean; cash?: boolean;
  langs?: string; zones?: string; team?: Member[];
};

type VehDraft = {
  id: string | null;         // editing an existing vehicle
  status: AuStatus;          // current status when editing (preserved on save)
  cond: AuCond; vtype: AuType;
  make: string; model: string; year: string; city: string;
  price: string; down: string; miles: string;
  trans: string; fuel: string; mpg: string; color: string; vin: string; apr: string;
  desc: string;
  bhph: boolean; financing: boolean; tradeIn: boolean;
  feats: string[];
  photos: string[];
  lat: number | null; lng: number | null; // set by the address autocomplete (geo pipeline)
};

// Status → badge meta. Only draft/published/pending/sold are settable (the upsert
// RPC rejects anything else); 'review' is here only for defensive rendering.
const STATUS_META: Record<AuStatus, { es: string; en: string; cls: string }> = {
  published: { es: 'Disponible', en: 'Available', cls: 'bg-green-bg text-green-dark' },
  pending:   { es: 'Apartado', en: 'Reserved', cls: 'bg-amber-bg text-amber-ink' },
  sold:      { es: 'Vendido', en: 'Sold', cls: 'bg-lilac text-primary-dark' },
  draft:     { es: 'Borrador', en: 'Draft', cls: 'bg-lilac-2 text-ink-2' },
  review:    { es: 'En revisión', en: 'In review', cls: 'bg-amber-bg text-amber-ink' },
};
const SETTABLE_STATUS: AuStatus[] = ['published', 'pending', 'sold', 'draft'];

const STAGES: { id: AuLeadStage; es: string; en: string; cls: string }[] = [
  { id: 'new', es: 'Nuevo', en: 'New', cls: 'bg-pink-bg text-pink-dark' },
  { id: 'contacted', es: 'Contactado', en: 'Contacted', cls: 'bg-blue-bg text-blue' },
  { id: 'test', es: 'Con prueba', en: 'Test drive', cls: 'bg-lilac text-primary-dark' },
  { id: 'financing', es: 'Financiando', en: 'Financing', cls: 'bg-amber-bg text-amber-ink' },
  { id: 'sold', es: 'Vendido', en: 'Sold', cls: 'bg-green-bg text-green-dark' },
];
const stageMeta = (s: AuLeadStage) => STAGES.find((x) => x.id === s) ?? STAGES[0];

const TEST_STATUS: Record<AuTestStatus, { es: string; en: string; cls: string }> = {
  pendiente: { es: 'Pendiente', en: 'Pending', cls: 'bg-amber-bg text-amber-ink' },
  confirmada: { es: 'Confirmada', en: 'Confirmed', cls: 'bg-green-bg text-green-dark' },
  cancelada: { es: 'Cancelada', en: 'Cancelled', cls: 'bg-lilac-2 text-ink-2' },
  completada: { es: 'Completada', en: 'Completed', cls: 'bg-lilac text-primary-dark' },
};

const SELLER_TYPES: { id: string; es: string; en: string }[] = [
  { id: 'dealer', es: 'Dealer', en: 'Dealer' },
  { id: 'particular', es: 'Particular', en: 'Private seller' },
];

const CREDIT_LABEL: Record<string, { es: string; en: string }> = {
  excelente: { es: 'Excelente', en: 'Excellent' },
  bueno: { es: 'Bueno', en: 'Good' },
  regular: { es: 'Regular', en: 'Fair' },
  malo: { es: 'Bajo', en: 'Poor' },
};

// Avatar palette (same set the other people-facing modules use for initials).
const AV_COLORS = ['#7B61FF', '#2A5C8A', '#E8954A', '#D6336C', '#1F9D57'];
const avColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
};
const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

const tileBg = (cond: AuCond) =>
  `repeating-linear-gradient(135deg,${AU_TILE[cond][0]} 0 11px,${AU_TILE[cond][1]} 11px 22px)`;

const timeAgo = (iso: string, es: boolean): string => {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return es ? 'ahora' : 'now';
  const m = Math.max(1, Math.floor(ms / 60000));
  if (m < 60) return es ? `hace ${m} min` : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return es ? `hace ${h} h` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return es ? `hace ${d} d` : `${d}d ago`;
};

const fmtClock = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`;
};

// Local YYYY-MM-DD key for a date/ISO (agenda day grouping).
const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayKeyOf = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dayKey(d);
};
// ISO → value for <input type="datetime-local"> in local time.
const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const DOW_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (iso: string, es: boolean): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return es ? `${d.getDate()} ${MON_ES[d.getMonth()]}` : `${MON_EN[d.getMonth()]} ${d.getDate()}`;
};

function newVehDraft(city: string): VehDraft {
  return {
    id: null, status: 'draft', cond: 'usado', vtype: 'sedan',
    make: '', model: '', year: '', city,
    price: '', down: '', miles: '', trans: 'automatica', fuel: 'gasolina', mpg: '', color: '', vin: '', apr: '',
    desc: '', bhph: false, financing: true, tradeIn: false,
    feats: [], photos: [], lat: null, lng: null,
  };
}

export function AutosModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es } = ctx;
  void tab;

  // ---------- persistence wiring (mirror RealEstate.tsx) ----------
  const admin = useBizAdmin();
  const real = admin.active;
  const persistable = !admin.demo && !!real; // real signed-in business → persist
  const { user } = useAuth();

  // ---------- view state machine ----------
  const [view, setView] = useState<View>('list');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadBack, setLeadBack] = useState<View>('leads'); // where lead detail returns to
  const [listFilter, setListFilter] = useState<'all' | AuStatus>('all');
  const [leadFilter, setLeadFilter] = useState<'all' | AuLeadStage>('all');
  const [testDay, setTestDay] = useState(() => dayKey(new Date()));
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };

  // ---------- license / dealer profile (auto_config) ----------
  const autoConfig = ((real as unknown as { auto_config?: AutoConfig } | null)?.auto_config) ?? null;
  const hasLicense = !!autoConfig?.license?.trim();
  const [licEdit, setLicEdit] = useState(false);
  const [licBusy, setLicBusy] = useState(false);
  const [licForm, setLicForm] = useState({
    license: '', sellerType: 'dealer', financing: true, bhph: false, cash: true,
    langEs: true, langEn: false, zones: '',
  });
  const openLicForm = () => {
    setLicForm({
      license: autoConfig?.license ?? '',
      sellerType: autoConfig?.sellerType ?? 'dealer',
      financing: autoConfig?.financing !== false,
      bhph: autoConfig?.bhph === true,
      cash: autoConfig?.cash !== false,
      langEs: autoConfig?.langs ? autoConfig.langs.includes('Español') : true,
      langEn: autoConfig?.langs ? autoConfig.langs.includes('English') : false,
      zones: autoConfig?.zones ?? '',
    });
    setLicEdit(true);
  };
  const saveLicense = async () => {
    const lic = licForm.license.trim();
    if (!lic) { flash(L('Escribe tu número de licencia', 'Enter your license number')); return; }
    if (licBusy) return;
    setLicBusy(true);
    const langs = [licForm.langEs ? 'Español' : '', licForm.langEn ? 'English' : ''].filter(Boolean).join(' · ');
    const cfg: AutoConfig = {
      ...(autoConfig ?? {}),
      license: lic, sellerType: licForm.sellerType,
      bhph: licForm.bhph, financing: licForm.financing, cash: licForm.cash,
      langs: langs || 'Español', zones: licForm.zones.trim(),
    };
    const res = await admin.update({ auto_config: cfg } as never);
    setLicBusy(false);
    if (res.error) { flash(L('No se pudo guardar la licencia', "Couldn't save the license")); return; }
    setLicEdit(false);
    flash(L('Licencia guardada', 'License saved'));
  };

  // ---------- demo seeds (sample dealer: realistic Houston content) ----------
  const now = Date.now();
  const seedVehicles = useMemo<MyVehicle[]>(() => {
    const mk = (p: Partial<MyVehicle> & Pick<MyVehicle, 'id' | 'cond' | 'vtype' | 'make' | 'model' | 'year' | 'price' | 'status'>): MyVehicle => ({
      slug: p.id, down: null, miles: null, trans: 'automatica', fuel: 'gasolina', mpg: null,
      colorEs: null, colorEn: null, city: 'Houston, TX', lat: null, lng: null, photos: [],
      bhph: false, financing: true, apr: null, views: 0, saves: 0,
      createdAt: new Date(now - 10 * 86400e3).toISOString(),
      bizSlug: null, bizName: null, bizLogo: null, bizTier: null, bizRating: null,
      distanceM: null, totalCount: 0, leadsCount: 0, testsCount: 0,
      ...p,
    });
    return [
      mk({ id: 'demo-v1', cond: 'usado', vtype: 'sedan', make: 'Toyota', model: 'Camry SE', year: 2021, price: 21900, down: 2000, miles: 38200, status: 'published', bhph: true, views: 412, saves: 33, leadsCount: 4, testsCount: 2 }),
      mk({ id: 'demo-v2', cond: 'usado', vtype: 'pickup', make: 'Ford', model: 'F-150 XLT', year: 2019, price: 28500, down: 3000, miles: 61400, status: 'published', bhph: true, views: 298, saves: 21, leadsCount: 3, testsCount: 1 }),
      mk({ id: 'demo-v3', cond: 'seminuevo', vtype: 'suv', make: 'Honda', model: 'CR-V EX', year: 2022, price: 26900, down: null, miles: 24800, status: 'pending', views: 176, saves: 12, leadsCount: 1, testsCount: 0 }),
      mk({ id: 'demo-v4', cond: 'usado', vtype: 'sedan', make: 'Nissan', model: 'Sentra SV', year: 2020, price: 15400, down: 1500, miles: 45900, status: 'draft', bhph: true, views: 0, saves: 0 }),
    ];
  }, [now]);
  const seedLeads = useMemo<MyLead[]>(() => [
    {
      id: 'demo-l1', vehicleId: 'demo-v1', name: 'José Hernández', phone: '(832) 555-0134', email: 'jose.h@gmail.com',
      kind: 'prueba', stage: 'new', message: L('¿Puedo ir a manejarlo este sábado?', 'Can I come test drive it this Saturday?'),
      offerAmount: null, income: null, employ: null, credit: null, down: null,
      createdAt: new Date(now - 22 * 60e3).toISOString(), vehicleTitle: '2021 Toyota Camry SE',
    },
    {
      id: 'demo-l2', vehicleId: 'demo-v1', name: 'María Torres', phone: '(713) 555-0188', email: 'maria.torres@outlook.com',
      kind: 'prequal', stage: 'financing', message: null, offerAmount: null,
      income: '$3,800/mes', employ: 'tiempo completo', credit: 'bueno', down: 2000,
      createdAt: new Date(now - 5 * 3600e3).toISOString(), vehicleTitle: '2021 Toyota Camry SE',
    },
    {
      id: 'demo-l3', vehicleId: 'demo-v2', name: 'Luis Peña', phone: '(281) 555-0102', email: null,
      kind: 'oferta', stage: 'contacted', message: L('Te doy $26,000 en efectivo.', 'I can pay $26,000 cash.'),
      offerAmount: 26000, income: null, employ: null, credit: null, down: null,
      createdAt: new Date(now - 26 * 3600e3).toISOString(), vehicleTitle: '2019 Ford F-150 XLT',
    },
    {
      id: 'demo-l4', vehicleId: 'demo-v2', name: 'Ana García', phone: '(832) 555-0177', email: 'ana.g@yahoo.com',
      kind: 'prequal', stage: 'new', message: null, offerAmount: null,
      income: '$2,900/mes', employ: 'medio tiempo', credit: 'regular', down: 3000,
      createdAt: new Date(now - 2 * 86400e3).toISOString(), vehicleTitle: '2019 Ford F-150 XLT',
    },
    {
      id: 'demo-l5', vehicleId: 'demo-v3', name: 'Carlos Ramírez', phone: '(713) 555-0155', email: 'carlos.r@gmail.com',
      kind: 'mensaje', stage: 'sold', message: L('¡Gracias, me lo llevo!', 'Thanks, I will take it!'),
      offerAmount: null, income: null, employ: null, credit: null, down: null,
      createdAt: new Date(now - 6 * 86400e3).toISOString(), vehicleTitle: '2022 Honda CR-V EX',
    },
  ], [L, now]);
  const seedTests = useMemo<MyTest[]>(() => {
    const at = (days: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); };
    return [
      { id: 'demo-t1', vehicleId: 'demo-v1', name: 'José Hernández', phone: '(832) 555-0134', at: at(0, 15, 30), message: null, status: 'pendiente', createdAt: new Date(now - 3600e3).toISOString(), vehicleTitle: '2021 Toyota Camry SE' },
      { id: 'demo-t2', vehicleId: 'demo-v2', name: 'Luis Peña', phone: '(281) 555-0102', at: at(1, 11, 0), message: null, status: 'confirmada', createdAt: new Date(now - 86400e3).toISOString(), vehicleTitle: '2019 Ford F-150 XLT' },
      { id: 'demo-t3', vehicleId: 'demo-v1', name: 'María Torres', phone: '(713) 555-0188', at: at(3, 10, 0), message: null, status: 'pendiente', createdAt: new Date(now - 5 * 3600e3).toISOString(), vehicleTitle: '2021 Toyota Camry SE' },
    ];
  }, [now]);
  const seedTeam = useMemo<Member[]>(() => [
    { name: 'Roberto Salinas', role: L('Ventas', 'Sales'), phone: '(832) 555-0140' },
    { name: 'Diana Cruz', role: L('Financiamiento', 'Financing'), phone: '(713) 555-0161' },
  ], [L]);

  // ---------- data: demo seeds vs real Supabase loads ----------
  const [vehRows, setVehRows] = useState<MyVehicle[] | null>(null);
  const [leadRows, setLeadRows] = useState<MyLead[] | null>(null);
  const [testRows, setTestRows] = useState<MyTest[] | null>(null);
    // El estado inicial NO puede ser de ejemplo: se pinta antes de saber si
  // hay negocio real, así que un dueño ve un instante el catálogo de otro.
  // Quien decide es el cargador de abajo. (Auditoría de Negocios, 2026-08-04.)
  const [teamDemo, setTeamDemo] = useState<Member[]>([]);

  // fetchMyVehicles has no owner filter (RLS also returns everyone's published
  // rows), so intersect with the signed-in owner's own vehicle ids — then scope
  // leads/tests to those same ids so a real dealer never sees anyone else's data.
  const loadAll = async () => {
    if (!supabase || !user) return;
    const [own, vehicles, leads, tests] = await Promise.all([
      supabase.from('vehicles').select('id').eq('owner_id', user.id).limit(500),
      fetchMyVehicles(), fetchMyVehicleLeads(), fetchMyVehicleTests(),
    ]);
    const ids = new Set((Array.isArray(own.data) ? own.data : []).map((r) => String((r as { id: string }).id)));
    setVehRows(vehicles.filter((v) => ids.has(v.id)));
    setLeadRows(leads.filter((l) => ids.has(l.vehicleId)));
    setTestRows(tests.filter((t) => ids.has(t.vehicleId)));
  };
  useEffect(() => {
    if (!persistable || !user) {
      setVehRows(seedVehicles); setLeadRows(seedLeads); setTestRows(seedTests); setTeamDemo(seedTeam);
      return;
    }
    let cancelled = false;
    setVehRows(null); setLeadRows(null); setTestRows(null);
    (async () => {
      if (cancelled) return;
      await loadAll();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistable, user?.id, real?.id, es]);

  const vehicles = vehRows ?? [];
  const leads = leadRows ?? [];
  const tests = testRows ?? [];
  const team = persistable ? (autoConfig?.team ?? []) : teamDemo;
  const loading = persistable && vehRows === null;

  // ---------- derived KPIs (REAL numbers — never fabricated for a real dealer) ----------
  const inventoryCount = vehicles.filter((v) => v.status !== 'draft').length;
  const newLeads = leads.filter((l) => l.stage === 'new').length;
  const pendingTests = tests.filter((t) => t.status === 'pendiente').length;
  const totalViews = vehicles.reduce((n, v) => n + v.views, 0);
  const prequalLeads = leads.filter((l) => l.kind === 'prequal');

  const attention: { id: string; icon: 'test' | 'lead' | 'fin'; title: string; sub: string; go: () => void }[] = [
    ...tests.filter((t) => t.status === 'pendiente').slice(0, 2).map((t) => ({
      id: `t-${t.id}`, icon: 'test' as const,
      title: L(`Confirmar prueba de ${t.name}`, `Confirm ${t.name}'s test drive`),
      sub: `${fmtDay(t.at, es)} · ${fmtClock(t.at)} · ${t.vehicleTitle}`,
      go: () => { setTestDay(dayKeyOf(t.at) || dayKey(new Date())); setView('tests'); },
    })),
    ...leads.filter((l) => l.stage === 'new').slice(0, 2).map((l) => ({
      id: `l-${l.id}`, icon: 'lead' as const,
      title: L(`Lead nuevo · ${l.name}`, `New lead · ${l.name}`),
      sub: `${timeAgo(l.createdAt, es)} · ${l.vehicleTitle}`,
      go: () => { setLeadId(l.id); setLeadBack('list'); setView('lead'); },
    })),
    ...prequalLeads.filter((l) => l.stage === 'financing').slice(0, 1).map((l) => ({
      id: `f-${l.id}`, icon: 'fin' as const,
      title: L(`Financiamiento en trámite · ${l.name}`, `Financing in progress · ${l.name}`),
      sub: `${l.vehicleTitle}${l.credit ? ` · ${L('crédito', 'credit')} ${L(CREDIT_LABEL[l.credit]?.es ?? l.credit, CREDIT_LABEL[l.credit]?.en ?? l.credit)}` : ''}`,
      go: () => setView('financing'),
    })),
  ];

  // ---------- shared UI helpers ----------
  const chip = (on: boolean) =>
    `tap-y flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;
  const fieldCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary';
  const labelCls = 'mb-1.5 block text-[11px] font-extrabold text-ink-soft';

  const statusBadge = (s: AuStatus) => {
    const m = STATUS_META[s] ?? STATUS_META.draft;
    return <span className={`rounded-[7px] px-2 py-1 text-[9px] font-extrabold ${m.cls}`}>{L(m.es, m.en)}</span>;
  };
  const condLabel = (c: AuCond) => { const x = AU_CONDS.find((k) => k.id === c); return x ? L(x.es, x.en) : c; };
  const vtypeLabel = (t: AuType) => { const x = AU_TYPES.find((k) => k.id === t); return x ? L(x.es, x.en) : t; };
  const transLabel = (t: string | null) => { const x = AU_TRANS.find((k) => k.id === t); return x ? L(x.es, x.en) : (t ?? '—'); };
  const fuelLabel = (f: string | null) => { const x = AU_FUELS.find((k) => k.id === f); return x ? L(x.es, x.en) : (f ?? '—'); };
  const vehTitle = (v: { year: number; make: string; model: string }) => `${v.year} ${v.make} ${v.model}`.trim();
  const thumbStyle = (v: MyVehicle) =>
    v.photos[0]
      ? { backgroundImage: `url("${imgUrl(v.photos[0], ANCHO.tarjeta)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: tileBg(v.cond) };

  // Segmented control (condition / transmission / fuel).
  const segmented = <T extends string>(items: { id: T; es: string; en: string }[], val: T, on: (v: T) => void, cols: number) => (
    <div className="grid gap-1.5 rounded-btn-lg bg-lilac-2 p-1" style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
      {items.map((it) => (
        <button key={it.id} onClick={() => on(it.id)} className={`tap-y cursor-pointer rounded-btn py-2 text-[11px] font-extrabold ${val === it.id ? 'bg-white text-primary-dark shadow-card' : 'text-ink-2'}`}>
          {L(it.es, it.en)}
        </button>
      ))}
    </div>
  );

  // ==================================================================
  // WIZARD state + actions
  // ==================================================================
  const [draft, setDraft] = useState<VehDraft>(() => newVehDraft(''));
  const [wizStep, setWizStep] = useState(0);
  const [wizMax, setWizMax] = useState(0);
  const [wizBusy, setWizBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [featInput, setFeatInput] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const upD = (patch: Partial<VehDraft>) => setDraft((d) => ({ ...d, ...patch }));
  // Address/location autocomplete → real coords, so the vehicle shows on the
  // consumer map (same free Nominatim/Photon pipeline as the other wizards).
  const [addrResults, setAddrResults] = useState<Address[]>([]);
  const [addrSearching, setAddrSearching] = useState(false);
  useEffect(() => {
    const q = draft.city.trim();
    if (draft.lat != null || q.length < 4) { setAddrResults([]); return; }
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setAddrSearching(true);
      try { setAddrResults(await searchAddress(q, null, ctrl.signal)); }
      catch { /* aborted/offline */ }
      setAddrSearching(false);
    }, 450);
    return () => { ctrl.abort(); window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.city, draft.lat]);
  const chooseCity = (a: Address) => { setAddrResults([]); upD({ city: a.city || a.formatted, lat: a.lat, lng: a.lng }); };

  const startWizard = () => {
    setDraft(newVehDraft(real?.city ?? 'Houston, TX'));
    setFeatInput(''); setWizStep(0); setWizMax(0); setView('wizard');
  };
  const startEdit = async (v: MyVehicle) => {
    const base: VehDraft = {
      ...newVehDraft(v.city ?? real?.city ?? ''),
      id: v.id, status: v.status, cond: v.cond, vtype: v.vtype,
      make: v.make, model: v.model, year: v.year ? String(v.year) : '', city: v.city ?? real?.city ?? '',
      price: v.price ? String(v.price) : '', down: v.down != null ? String(v.down) : '',
      miles: v.miles != null ? String(v.miles) : '', trans: v.trans ?? 'automatica', fuel: v.fuel ?? 'gasolina',
      mpg: v.mpg != null ? String(v.mpg) : '', color: v.colorEs ?? '', apr: v.apr != null ? String(v.apr) : '',
      bhph: v.bhph, financing: v.financing, photos: [...v.photos],
    };
    // Extended fields (vin/desc/feats/trade-in) aren't on the card — owner RLS
    // allows a direct read even for drafts.
    if (persistable && supabase) {
      const { data } = await supabase.from('vehicles')
        .select('vin,desc_es,feats,trade_in').eq('id', v.id).maybeSingle();
      if (data) {
        const r = data as Record<string, unknown>;
        base.vin = String(r.vin ?? '');
        base.desc = String(r.desc_es ?? '');
        base.tradeIn = r.trade_in === true;
        base.feats = Array.isArray(r.feats)
          ? (r.feats as unknown[]).map((f) => typeof f === 'string' ? f : String((f as { es?: string }).es ?? '')).filter(Boolean)
          : [];
      }
    }
    setDraft(base);
    setFeatInput(''); setWizStep(0); setWizMax(3); setView('wizard');
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files || photoBusy) return;
    const remaining = 12 - draft.photos.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, remaining));
    if (!picked.length) return;
    setPhotoBusy(true);
    try {
      const urls: string[] = [];
      for (const f of picked) {
        urls.push(!persistable || !user || !supabase ? URL.createObjectURL(f) : await uploadImage(f, user.id, 1600));
      }
      setDraft((d) => ({ ...d, photos: [...d.photos, ...urls].slice(0, 12) }));
    } catch {
      flash(L('No se pudo subir la foto', "Couldn't upload the photo"));
    }
    setPhotoBusy(false);
  };
  const removePhoto = (url: string) => setDraft((d) => ({ ...d, photos: d.photos.filter((x) => x !== url) }));
  const addFeat = () => {
    const f = featInput.trim();
    if (!f) return;
    setDraft((d) => (d.feats.includes(f) ? d : { ...d, feats: [...d.feats, f] }));
    setFeatInput('');
  };

  const step0Ok = !!draft.make.trim() && !!draft.model.trim() && Number(draft.year) > 1900;
  const step1Ok = Number(draft.price) > 0;
  const step2Ok = draft.photos.length >= 1;
  const stepValid = wizStep === 0 ? step0Ok : wizStep === 1 ? step1Ok : wizStep === 2 ? step2Ok : true;
  // Editing something already live keeps its status; anything else publishes.
  const finalStatus: AuStatus = draft.id && draft.status !== 'draft' ? draft.status : 'published';
  const publishReady = step0Ok && step1Ok && step2Ok;
  const publishBlocked = finalStatus === 'published' && !hasLicense;

  const buildPayload = (status: AuStatus): Record<string, unknown> => ({
    status, cond: draft.cond, vtype: draft.vtype,
    make: draft.make.trim(), model: draft.model.trim(), year: draft.year.trim(),
    price: Number(draft.price) || 0, down: draft.down.trim(), miles: draft.miles.trim(),
    trans: draft.trans, fuel: draft.fuel, mpg: draft.mpg.trim(),
    color_es: draft.color.trim(), vin: draft.vin.trim(), apr: draft.apr.trim(),
    desc_es: draft.desc.trim(),
    photos: draft.photos,
    feats: draft.feats.map((f) => ({ es: f, en: f })),
    bhph: draft.bhph, financing: draft.financing, trade_in: draft.tradeIn,
    city: draft.city.trim(),
    ...(draft.lat != null && draft.lng != null ? { lat: draft.lat, lng: draft.lng } : {}),
    ...(persistable && real ? { business_id: real.id } : {}),
  });

  // Save (publish or draft). Returns true only when the write truly succeeded —
  // never show success for a vehicle that isn't saved (founder honesty rule).
  const saveVehicle = async (status: AuStatus): Promise<boolean> => {
    if (!persistable) {
      const local: MyVehicle = {
        id: draft.id ?? `demo-v${Date.now()}`, slug: draft.id ?? '',
        cond: draft.cond, vtype: draft.vtype, make: draft.make.trim() || L('Auto', 'Vehicle'),
        model: draft.model.trim(), year: Number(draft.year) || 0, price: Number(draft.price) || 0,
        down: draft.down ? Number(draft.down) : null, miles: draft.miles ? Number(draft.miles) : null,
        trans: draft.trans, fuel: draft.fuel, mpg: draft.mpg ? Number(draft.mpg) : null,
        colorEs: draft.color.trim() || null, colorEn: draft.color.trim() || null, city: draft.city.trim() || null,
        lat: null, lng: null, photos: draft.photos, bhph: draft.bhph, financing: draft.financing,
        apr: draft.apr ? Number(draft.apr) : null, status, views: 0, saves: 0, createdAt: new Date().toISOString(),
        bizSlug: null, bizName: null, bizLogo: null, bizTier: null, bizRating: null,
        distanceM: null, totalCount: 0, leadsCount: 0, testsCount: 0,
      };
      setVehRows((rows) => {
        const xs = rows ?? [];
        return draft.id ? xs.map((x) => (x.id === draft.id ? { ...x, ...local, views: x.views, saves: x.saves, leadsCount: x.leadsCount, testsCount: x.testsCount } : x)) : [local, ...xs];
      });
      return true;
    }
    const res = await upsertVehicle(draft.id, buildPayload(status));
    if (res.error) {
      flash(/license required/i.test(res.error)
        ? L('Agrega tu número de licencia para publicar', 'Add your license number to publish')
        : L('No se pudo guardar el auto. Intenta de nuevo.', "Couldn't save the vehicle. Try again."));
      return false;
    }
    await loadAll();
    return true;
  };

  const saveDraft = async () => {
    if (!draft.make.trim() && !draft.model.trim()) { flash(L('Pon marca y modelo para guardar el borrador', 'Add make and model to save the draft')); return; }
    if (draftBusy || wizBusy) return;
    setDraftBusy(true);
    const ok = await saveVehicle('draft');
    setDraftBusy(false);
    if (ok) { flash(L('Borrador guardado', 'Draft saved')); setView('list'); }
  };
  const wizNext = async () => {
    if (wizStep < 3) {
      if (!stepValid) return;
      const n = wizStep + 1;
      setWizStep(n); setWizMax((m) => Math.max(m, n));
      return;
    }
    if (!publishReady || publishBlocked || wizBusy || draftBusy) return;
    setWizBusy(true);
    const ok = await saveVehicle(finalStatus);
    setWizBusy(false);
    if (!ok) return;
    if (draft.id && draft.status !== 'draft') { flash(L('Cambios guardados', 'Changes saved')); setView('list'); }
    else setView('success');
  };
  const wizBack = () => { if (wizStep === 0) setView('list'); else setWizStep((s) => s - 1); };

  // ---------- detail actions ----------
  const detailVeh = detailId ? vehicles.find((v) => v.id === detailId) ?? null : null;
  const [statusBusy, setStatusBusy] = useState(false);
  const changeStatus = async (v: MyVehicle, status: AuStatus) => {
    if (status === v.status || statusBusy) return;
    if (!persistable) {
      setVehRows((rows) => (rows ?? []).map((x) => (x.id === v.id ? { ...x, status } : x)));
      flash(L('Estado actualizado', 'Status updated'));
      return;
    }
    setStatusBusy(true);
    const res = await upsertVehicle(v.id, { status });
    setStatusBusy(false);
    if (res.error) {
      flash(/license required/i.test(res.error)
        ? L('Agrega tu número de licencia para publicar', 'Add your license number to publish')
        : L('No se pudo cambiar el estado', "Couldn't change the status"));
      return;
    }
    setVehRows((rows) => (rows ?? []).map((x) => (x.id === v.id ? { ...x, status } : x)));
    flash(L('Estado actualizado', 'Status updated'));
    void loadAll();
  };

  // ---------- lead actions ----------
  const detailLead = leadId ? leads.find((l) => l.id === leadId) ?? null : null;
  const moveStage = async (l: MyLead, stage: AuLeadStage) => {
    if (stage === l.stage) return;
    const prev = leadRows;
    setLeadRows((rows) => (rows ?? []).map((x) => (x.id === l.id ? { ...x, stage } : x)));
    if (persistable) {
      const err = await setVehicleLeadStage(l.id, stage);
      if (err) { setLeadRows(prev); flash(L('No se pudo mover el lead', "Couldn't move the lead")); return; }
    }
    flash(L('Etapa actualizada', 'Stage updated'));
  };

  // ---------- test actions ----------
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [reschedAt, setReschedAt] = useState('');
  const testAction = async (t: MyTest, status: AuTestStatus, at?: string) => {
    const prev = testRows;
    setTestRows((rows) => (rows ?? []).map((x) => (x.id === t.id ? { ...x, status, at: at ?? x.at } : x)));
    if (persistable) {
      const err = await setVehicleTestStatus(t.id, status, at);
      if (err) { setTestRows(prev); flash(L('No se pudo actualizar la prueba', "Couldn't update the test drive")); return; }
    }
    if (at) setTestDay(dayKeyOf(at) || testDay);
    setReschedId(null); setReschedAt('');
    flash(at ? L('Prueba reprogramada', 'Test drive rescheduled')
      : status === 'confirmada' ? L('Prueba confirmada', 'Test drive confirmed')
      : status === 'completada' ? L('Prueba completada', 'Test drive completed')
      : L('Prueba actualizada', 'Test drive updated'));
  };

  // ---------- team actions ----------
  const [teamBusy, setTeamBusy] = useState(false);
  const [memForm, setMemForm] = useState<Member>({ name: '', role: '', phone: '' });
  const saveTeam = async (next: Member[]) => {
    if (!persistable) { setTeamDemo(next); return true; }
    setTeamBusy(true);
    const res = await admin.update({ auto_config: { ...(autoConfig ?? {}), team: next } } as never);
    setTeamBusy(false);
    if (res.error) { flash(L('No se pudo guardar el equipo', "Couldn't save the team")); return false; }
    return true;
  };
  const addMember = async () => {
    const name = memForm.name.trim();
    if (!name) { flash(L('Escribe el nombre', 'Enter a name')); return; }
    const next = [...team, { name, role: memForm.role.trim() || L('Ventas', 'Sales'), phone: memForm.phone.trim() }];
    const ok = await saveTeam(next);
    if (ok) { setMemForm({ name: '', role: '', phone: '' }); flash(L('Miembro agregado', 'Member added')); }
  };
  const removeMember = async (i: number) => {
    const next = team.filter((_, idx) => idx !== i);
    const ok = await saveTeam(next);
    if (ok) flash(L('Miembro eliminado', 'Member removed'));
  };

  // ==================================================================
  // LICENSE gate UI (banner + inline form + settings row)
  // ==================================================================
  const licenseForm = (
    <div className="mt-3 flex flex-col gap-3 border-t border-hair pt-3">
      <div>
        <label className={labelCls}>{L('Número de licencia de dealer', 'Dealer license number')} *</label>
        <input value={licForm.license} onChange={(e) => setLicForm((f) => ({ ...f, license: e.target.value }))} placeholder="TX-DLR 0045821" className={fieldCls} />
      </div>
      <div>
        <label className={labelCls}>{L('Tipo de vendedor', 'Seller type')}</label>
        <div className="flex flex-wrap gap-x-2 gap-y-[18px]">
          {SELLER_TYPES.map((s) => (
            <button key={s.id} onClick={() => setLicForm((f) => ({ ...f, sellerType: s.id }))} className={chip(licForm.sellerType === s.id)}>{L(s.es, s.en)}</button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>{L('Formas de pago que ofreces', 'Payment options you offer')}</label>
        <div className="flex flex-wrap gap-x-2 gap-y-[18px]">
          <button onClick={() => setLicForm((f) => ({ ...f, financing: !f.financing }))} className={chip(licForm.financing)}>{licForm.financing ? '✓ ' : ''}{L('Financiamiento', 'Financing')}</button>
          <button onClick={() => setLicForm((f) => ({ ...f, bhph: !f.bhph }))} className={chip(licForm.bhph)}>{licForm.bhph ? '✓ ' : ''}{L('Aquí pagas aquí', 'Buy here pay here')}</button>
          <button onClick={() => setLicForm((f) => ({ ...f, cash: !f.cash }))} className={chip(licForm.cash)}>{licForm.cash ? '✓ ' : ''}{L('Contado', 'Cash')}</button>
        </div>
      </div>
      <div>
        <label className={labelCls}>{L('Idiomas', 'Languages')}</label>
        <div className="flex gap-2">
          <button onClick={() => setLicForm((f) => ({ ...f, langEs: !f.langEs }))} className={chip(licForm.langEs)}>{licForm.langEs ? '✓ ' : ''}Español</button>
          <button onClick={() => setLicForm((f) => ({ ...f, langEn: !f.langEn }))} className={chip(licForm.langEn)}>{licForm.langEn ? '✓ ' : ''}English</button>
        </div>
      </div>
      <div>
        <label className={labelCls}>{L('Zonas que cubres', 'Areas you cover')}</label>
        <input value={licForm.zones} onChange={(e) => setLicForm((f) => ({ ...f, zones: e.target.value }))} placeholder={L('Ej. Spring Branch, Katy, Pasadena', 'e.g. Spring Branch, Katy, Pasadena')} className={fieldCls} />
      </div>
      <div className="flex gap-2">
        <button onClick={saveLicense} disabled={licBusy} className="tap-y flex-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm disabled:opacity-50">
          {licBusy ? L('Guardando…', 'Saving…') : L('Guardar licencia', 'Save license')}
        </button>
        <button onClick={() => setLicEdit(false)} className="tap-y cursor-pointer rounded-btn border border-line bg-white px-4 py-2.5 text-[12px] font-extrabold text-ink-soft">{L('Cancelar', 'Cancel')}</button>
      </div>
    </div>
  );
  const licenseBanner = !hasLicense && (
    <div className="rounded-card-sm bg-amber-bg p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-white"><Certificate size={18} stroke={2} className="text-amber-ink" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-extrabold text-ink">{L('Agrega tu licencia para publicar', 'Add your license to publish')}</div>
          <div className="mt-0.5 text-[11.5px] font-semibold leading-snug text-amber-ink">{L('Los compradores confían en dealers verificados. Puedes guardar borradores mientras tanto.', 'Buyers trust verified dealers. You can save drafts in the meantime.')}</div>
        </div>
        {!licEdit && (
          <button onClick={openLicForm} className="tap-y flex-none cursor-pointer rounded-[10px] bg-ink px-3.5 py-2 text-[12px] font-extrabold text-white">{L('Agregar', 'Add')}</button>
        )}
      </div>
      {licEdit && licenseForm}
    </div>
  );
  const licenseCard = hasLicense && (
    <div className={`${cardCls} p-3.5`}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-green-bg"><Certificate size={18} stroke={2} className="text-green-dark" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink">
            {L('Licencia', 'License')} · {autoConfig?.license}
            <Check size={14} stroke={3} className="text-green" />
          </div>
          <div className="mt-0.5 truncate text-[10.5px] font-semibold text-muted-2">
            {L(SELLER_TYPES.find((s) => s.id === autoConfig?.sellerType)?.es ?? 'Dealer', SELLER_TYPES.find((s) => s.id === autoConfig?.sellerType)?.en ?? 'Dealer')}
            {autoConfig?.bhph ? ` · ${L('Aquí pagas aquí', 'BHPH')}` : ''}{autoConfig?.langs ? ` · ${autoConfig.langs}` : ''}{autoConfig?.zones ? ` · ${autoConfig.zones}` : ''}
          </div>
        </div>
        {!licEdit && <button onClick={openLicForm} className="tap-y flex-none cursor-pointer rounded-btn border border-line bg-white px-3.5 py-2 text-[11.5px] font-extrabold text-ink">{L('Editar', 'Edit')}</button>}
      </div>
      {licEdit && licenseForm}
    </div>
  );

  // ==================================================================
  // LIST (default view — Resumen)
  // ==================================================================
  const kpis: { label: string; value: string; onTap?: () => void }[] = [
    { label: L('Autos en inventario', 'Vehicles in stock'), value: String(inventoryCount), onTap: () => setListFilter('published') },
    { label: L('Leads nuevos', 'New leads'), value: String(newLeads), onTap: () => { setLeadFilter('new'); setView('leads'); } },
    { label: L('Pruebas pendientes', 'Pending test drives'), value: String(pendingTests), onTap: () => setView('tests') },
    { label: L('Vistas totales', 'Total views'), value: totalViews.toLocaleString() },
  ];

  const listFilters: { id: 'all' | AuStatus; es: string; en: string }[] = [
    { id: 'all', es: 'Todos', en: 'All' },
    { id: 'published', es: 'Disponibles', en: 'Available' },
    { id: 'pending', es: 'Apartados', en: 'Reserved' },
    { id: 'sold', es: 'Vendidos', en: 'Sold' },
    { id: 'draft', es: 'Borradores', en: 'Drafts' },
  ];
  const filteredVehicles = listFilter === 'all' ? vehicles : vehicles.filter((v) => v.status === listFilter);

  const vehCard = (v: MyVehicle) => (
    <button key={v.id} onClick={() => { setDetailId(v.id); setView('detail'); }} className="cursor-pointer overflow-hidden rounded-card-sm border border-line bg-white text-left shadow-card">
      <div className="flex gap-3 p-3">
        <div className="relative h-[84px] w-[84px] flex-none overflow-hidden rounded-tile" style={thumbStyle(v)}>
          <span className="absolute left-1.5 top-1.5">{statusBadge(v.status)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-[18px].5">
            <span className="text-[15px] font-extrabold text-ink">{fmtAuPrice(v.price)}</span>
            {v.bhph && <span className="rounded-md bg-amber-bg px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase text-amber-ink">{L('Aquí pagas aquí', 'BHPH')}</span>}
          </div>
          <div className="mt-0.5 truncate text-[12px] font-bold text-ink-soft">{vehTitle(v)}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-muted-2">
            <Gauge size={12} stroke={2} className="text-muted-2" />{fmtMiles(v.miles, es)}
            <span className="mx-1 text-muted-faint">·</span>{condLabel(v.cond)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-hair px-3 py-2 text-[10px] font-bold text-muted-2">
        <span className="flex items-center gap-1"><Eye size={12} stroke={2.2} />{v.views} {L('vistas', 'views')}</span>
        <span className="flex items-center gap-1"><Heart size={12} stroke={2.2} />{v.saves}</span>
        <span className="flex items-center gap-1"><Users size={12} stroke={2.2} />{v.leadsCount} leads</span>
        <span className="flex items-center gap-1"><CalendarEvent size={12} stroke={2.2} />{v.testsCount} {L('pruebas', 'tests')}</span>
      </div>
    </button>
  );

  const navCard = (onClick: () => void, bg: string, c: string, Icon: typeof Users, title: string, sub: string) => (
    <button onClick={onClick} className={`${cardCls} flex cursor-pointer items-center gap-2.5 p-3 text-left`}>
      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-tile ${bg}`}><Icon size={17} stroke={2.2} className={c} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-extrabold text-ink">{title}</span>
        <span className="block truncate text-[10px] font-semibold text-muted-2">{loading ? '…' : sub}</span>
      </span>
      <ChevronRight size={15} stroke={2.4} className="flex-none text-muted-2" />
    </button>
  );

  const listBody = (
    <div className="flex flex-col gap-4">
      {licenseBanner}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        {kpis.map((k) => (
          <button key={k.label} onClick={k.onTap} disabled={!k.onTap} className={`${cardCls} cursor-pointer p-3 text-left disabled:cursor-default`}>
            <div className="text-[9.5px] font-bold text-muted-2">{k.label}</div>
            <div className="mt-0.5 text-[19px] font-extrabold text-ink">{loading ? '…' : k.value}</div>
          </button>
        ))}
      </div>

      {/* Requiere atención */}
      {!loading && attention.length > 0 && (
        <div className={`${cardCls} p-3.5`}>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[13px] font-extrabold text-ink">{L('Requiere atención', 'Needs attention')}</div>
            <span className="rounded-full bg-pink-bg px-2 py-0.5 text-[9.5px] font-extrabold text-pink-dark">{attention.length} {attention.length === 1 ? L('tarea', 'task') : L('tareas', 'tasks')}</span>
          </div>
          <div className="flex flex-col">
            {attention.map((a, i) => (
              <button key={a.id} onClick={a.go} className={`tap-y flex cursor-pointer items-center gap-2.5 py-2.5 text-left ${i < attention.length - 1 ? 'border-b border-hair' : ''}`}>
                <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] ${a.icon === 'test' ? 'bg-amber-bg' : a.icon === 'fin' ? 'bg-blue-bg' : 'bg-pink-bg'}`}>
                  {a.icon === 'test' ? <CalendarEvent size={15} stroke={2.2} className="text-amber-ink" /> : a.icon === 'fin' ? <CreditCard size={15} stroke={2.2} className="text-blue" /> : <Users size={15} stroke={2.2} className="text-pink-dark" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-extrabold text-ink">{a.title}</span>
                  <span className="block truncate text-[10px] font-semibold text-muted-2">{a.sub}</span>
                </span>
                <ChevronRight size={15} stroke={2.4} className="flex-none text-muted-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* quick nav: pipeline / financing / agenda / team */}
      <div className="grid grid-cols-2 gap-2.5">
        {navCard(() => { setLeadFilter('all'); setView('leads'); }, 'bg-lilac', 'text-primary-dark', Users, L('Leads', 'Leads'), `${leads.length} ${L('en tu pipeline', 'in your pipeline')}`)}
        {navCard(() => setView('financing'), 'bg-blue-bg', 'text-blue', CreditCard, L('Financiamiento', 'Financing'), `${prequalLeads.length} ${L('solicitudes', 'applications')}`)}
        {navCard(() => setView('tests'), 'bg-amber-bg', 'text-amber-ink', CalendarEvent, L('Pruebas', 'Test drives'), `${tests.length} ${L('agendadas', 'scheduled')}`)}
        {navCard(() => setView('team'), 'bg-green-bg', 'text-green-dark', Users, L('Equipo', 'Team'), `${team.length} ${team.length === 1 ? L('miembro', 'member') : L('miembros', 'members')}`)}
      </div>

      {/* Inventory */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-[15px] font-extrabold text-ink">{L('Mi inventario', 'My inventory')}</div>
          <button onClick={startWizard} className="tap-y flex cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-3.5 py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm">
            <Plus size={14} stroke={2.6} />{L('Publicar auto', 'Publish vehicle')}
          </button>
        </div>
        <div className="-my-1.5 py-1.5 no-scrollbar mb-3 flex min-w-0 gap-2 overflow-x-auto pb-0.5">
          {listFilters.map((f) => <button key={f.id} onClick={() => setListFilter(f.id)} className={chip(listFilter === f.id)}>{L(f.es, f.en)}</button>)}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[0, 1].map((i) => <div key={i} className={`${cardCls} h-[132px] animate-pulse bg-lilac-2`} />)}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="rounded-card-sm border border-line bg-white px-6 py-12 text-center shadow-card">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-tile bg-lilac-3"><Car size={22} stroke={2} className="text-primary-dark" /></span>
            <div className="text-[13.5px] font-extrabold text-ink">
              {vehicles.length === 0 ? L('Aún no tienes autos', 'No vehicles yet') : L('Nada con este filtro', 'Nothing with this filter')}
            </div>
            <div className="mt-1 text-[11.5px] font-medium text-muted-2">
              {vehicles.length === 0
                ? L('Publica tu primer auto y llega a compradores cerca de ti.', 'Publish your first vehicle and reach buyers near you.')
                : L('Cambia el filtro o publica un auto nuevo.', 'Change the filter or publish a new vehicle.')}
            </div>
            {vehicles.length === 0 && (
              <button onClick={startWizard} className="tap-y mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-4 py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm">
                <Plus size={15} stroke={2.6} />{L('Publicar auto', 'Publish vehicle')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{filteredVehicles.map(vehCard)}</div>
        )}
      </div>

      {licenseCard}
    </div>
  );

  // ==================================================================
  // VEHICLE DETAIL
  // ==================================================================
  const detailPage = detailVeh && (() => {
    const v = detailVeh;
    const vLeads = leads.filter((l) => l.vehicleId === v.id);
    const vTests = tests.filter((t) => t.vehicleId === v.id);
    const perf = [
      { Icon: Eye, label: L('Vistas', 'Views'), value: v.views.toLocaleString(), bg: 'bg-lilac', c: 'text-primary-dark' },
      { Icon: Heart, label: L('Guardados', 'Saves'), value: String(v.saves), bg: 'bg-pink-bg', c: 'text-pink-dark' },
      { Icon: Users, label: L('Leads', 'Leads'), value: String(v.leadsCount || vLeads.length), bg: 'bg-green-bg', c: 'text-green-dark' },
      { Icon: CalendarEvent, label: L('Pruebas', 'Tests'), value: String(v.testsCount || vTests.length), bg: 'bg-blue-bg', c: 'text-blue' },
    ];
    const specs: [string, string][] = [
      [L('Millaje', 'Mileage'), fmtMiles(v.miles, es)],
      [L('Transmisión', 'Transmission'), transLabel(v.trans)],
      [L('Combustible', 'Fuel'), fuelLabel(v.fuel)],
      [L('Condición', 'Condition'), condLabel(v.cond)],
      ...(v.mpg != null ? [[L('Rendimiento', 'MPG'), `${v.mpg} MPG`] as [string, string]] : []),
      ...(v.colorEs ? [[L('Color', 'Color'), es ? v.colorEs : (v.colorEn ?? v.colorEs)] as [string, string]] : []),
    ];
    return (
      <ModulePage
        title={vehTitle(v)}
        subtitle={L('Detalle del auto', 'Vehicle detail')}
        onBack={() => setView('list')}
        maxW={760}
        action={<button onClick={() => void startEdit(v)} className="tap-y cursor-pointer rounded-btn border border-line bg-white px-3.5 py-2 text-[12px] font-extrabold text-ink">{L('Editar', 'Edit')}</button>}
      >
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-card-sm border border-line bg-white shadow-card">
            <div className="relative h-[150px]" style={thumbStyle(v)}>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 40%,rgba(0,0,0,.5))' }} />
              <span className="absolute left-2.5 top-2.5">{statusBadge(v.status)}</span>
              {v.bhph && <span className="absolute right-2.5 top-2.5 rounded-md bg-amber-bg px-2 py-1 text-[9px] font-extrabold uppercase text-amber-ink">{L('Aquí pagas aquí', 'BHPH')}</span>}
              <div className="absolute bottom-2.5 left-3 right-3">
                <div className="text-[19px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{fmtAuPrice(v.price)}</div>
                <div className="truncate text-[11px] font-semibold text-white/85">{vehTitle(v)} · {fmtMiles(v.miles, es)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-3.5">
              {specs.map(([k, val]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-semibold text-muted-2">{k}</span>
                  <span className="min-w-0 truncate text-[11.5px] font-bold text-ink">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* performance */}
          <div>
            <div className="mb-2 text-[13px] font-extrabold text-ink">{L('Rendimiento', 'Performance')}</div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {perf.map((s) => (
                <div key={s.label} className={`${cardCls} p-3`}>
                  <span className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-[8px] ${s.bg}`}><s.Icon size={14} stroke={2.2} className={s.c} /></span>
                  <div className="text-[17px] font-extrabold text-ink">{s.value}</div>
                  <div className="text-[9.5px] font-bold text-muted-2">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* status */}
          <div className={`${cardCls} p-3.5`}>
            <div className="mb-2 text-[12.5px] font-extrabold text-ink">{L('Estado del auto', 'Vehicle status')}</div>
            <div className="-my-1.5 py-1.5 no-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-0.5">
              {SETTABLE_STATUS.map((s) => (
                <button key={s} onClick={() => void changeStatus(v, s)} disabled={statusBusy} className={`${chip(v.status === s)} disabled:opacity-60`}>
                  {L(STATUS_META[s].es, STATUS_META[s].en)}
                </button>
              ))}
            </div>
            {!hasLicense && v.status !== 'published' && (
              <div className="mt-2 text-[10px] font-semibold text-amber-ink">{L('Para publicar necesitas tu número de licencia (arriba en Autos).', 'Publishing requires your license number (top of Autos).')}</div>
            )}
          </div>

          {/* leads for this vehicle */}
          <div className={`${cardCls} p-3.5`}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[12.5px] font-extrabold text-ink">{L('Leads de este auto', 'Leads for this vehicle')}</div>
              {vLeads.length > 0 && (
                <button onClick={() => { setLeadFilter('all'); setView('leads'); }} className="cursor-pointer text-[11px] font-extrabold text-primary-dark">{L('Ver todos', 'See all')}</button>
              )}
            </div>
            {vLeads.length === 0 ? (
              <div className="py-4 text-center text-[11.5px] font-semibold text-muted-2">{L('Todavía no hay leads para este auto.', 'No leads for this vehicle yet.')}</div>
            ) : (
              <div className="flex flex-col">
                {vLeads.slice(0, 5).map((l, i) => {
                  const st = stageMeta(l.stage);
                  return (
                    <button key={l.id} onClick={() => { setLeadId(l.id); setLeadBack('detail'); setView('lead'); }} className={`tap-y flex cursor-pointer items-center gap-2.5 py-2.5 text-left ${i < Math.min(vLeads.length, 5) - 1 ? 'border-b border-hair' : ''}`}>
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold text-white" style={{ background: avColor(l.name) }}>{initials(l.name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-extrabold text-ink">{l.name}</span>
                        <span className="block truncate text-[10px] font-semibold text-muted-2">{timeAgo(l.createdAt, es)}{l.message ? ` · ${l.message}` : ''}</span>
                      </span>
                      <span className={`flex-none rounded-md px-2 py-1 text-[9px] font-extrabold ${st.cls}`}>{L(st.es, st.en)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* actions */}
          <div className="flex gap-2.5">
            <button onClick={() => void startEdit(v)} className="flex-1 cursor-pointer rounded-btn-lg bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm">{L('Editar auto', 'Edit vehicle')}</button>
            <a href={`/autos?v=${v.slug}`} target="_blank" rel="noreferrer" className="flex flex-none cursor-pointer items-center gap-1.5 rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3 text-[13px] font-extrabold text-ink">
              <ExternalLink size={14} stroke={2.2} className="text-primary-dark" />{L('Ver como cliente', 'View as client')}
            </a>
          </div>
        </div>
      </ModulePage>
    );
  })();

  // ==================================================================
  // LEADS pipeline
  // ==================================================================
  const leadFilters: { id: 'all' | AuLeadStage; es: string; en: string }[] = [
    { id: 'all', es: 'Todos', en: 'All' },
    { id: 'new', es: 'Nuevos', en: 'New' },
    { id: 'contacted', es: 'Contactados', en: 'Contacted' },
    { id: 'test', es: 'Con prueba', en: 'Test drive' },
    { id: 'financing', es: 'Financiando', en: 'Financing' },
    { id: 'sold', es: 'Vendidos', en: 'Sold' },
  ];
  const filteredLeads = leadFilter === 'all' ? leads : leads.filter((l) => l.stage === leadFilter);
  const kindPill = (l: MyLead) => {
    const [label, cls] =
      l.kind === 'oferta'
        ? [`${L('Oferta', 'Offer')} · $${(l.offerAmount ?? 0).toLocaleString()}`, 'bg-amber-bg text-amber-ink']
        : l.kind === 'prueba'
          ? [L('Prueba', 'Test drive'), 'bg-blue-bg text-blue']
          : l.kind === 'prequal'
            ? [L('Pre-calificación', 'Pre-qual'), 'bg-green-bg text-green-dark']
            : [L('Mensaje', 'Message'), 'bg-lilac-2 text-ink-2'];
    return <span className={`rounded-md px-2 py-1 text-[9px] font-extrabold ${cls}`}>{label}</span>;
  };

  const leadsPage = (
    <ModulePage title={L('Leads y consultas', 'Leads & inquiries')} subtitle={L('Tu pipeline de compradores', 'Your buyer pipeline')} onBack={() => setView('list')} maxW={760}>
      <div className="-my-1.5 py-1.5 no-scrollbar mb-3 flex min-w-0 gap-2 overflow-x-auto pb-0.5">
        {leadFilters.map((f) => <button key={f.id} onClick={() => setLeadFilter(f.id)} className={chip(leadFilter === f.id)}>{L(f.es, f.en)}</button>)}
      </div>
      {persistable && leadRows === null ? (
        <div className="grid gap-2.5">{[0, 1, 2].map((i) => <div key={i} className={`${cardCls} h-[92px] animate-pulse bg-lilac-2`} />)}</div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-card-sm border border-line bg-white px-6 py-12 text-center shadow-card">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-tile bg-lilac-3"><Users size={22} stroke={2} className="text-primary-dark" /></span>
          <div className="text-[13.5px] font-extrabold text-ink">{leads.length === 0 ? L('Aún no tienes leads', 'No leads yet') : L('Nada en esta etapa', 'Nothing in this stage')}</div>
          <div className="mt-1 text-[11.5px] font-medium text-muted-2">
            {leads.length === 0
              ? L('Cuando alguien pregunte, agende una prueba, haga una oferta o se pre-califique, aparecerá aquí.', 'When someone asks, books a test drive, makes an offer or gets pre-qualified, it shows here.')
              : L('Mueve leads entre etapas desde su detalle.', 'Move leads between stages from their detail.')}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {filteredLeads.map((l) => {
            const st = stageMeta(l.stage);
            return (
              <div key={l.id} className={`${cardCls} p-3`}>
                <button onClick={() => { setLeadId(l.id); setLeadBack('leads'); setView('lead'); }} className="flex w-full cursor-pointer items-start gap-2.5 text-left">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[11.5px] font-extrabold text-white" style={{ background: avColor(l.name) }}>{initials(l.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-[12.5px] font-extrabold text-ink">{l.name}</span>
                      <span className="flex-none text-[9.5px] font-semibold text-muted-2">{timeAgo(l.createdAt, es)}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-[18px].5">
                      {kindPill(l)}
                      <span className={`rounded-md px-2 py-1 text-[9px] font-extrabold ${st.cls}`}>{L(st.es, st.en)}</span>
                    </span>
                    <span className="mt-1 block truncate text-[10.5px] font-semibold text-muted-2">{l.vehicleTitle}</span>
                    {l.kind === 'prequal' && (l.credit || l.down != null) && (
                      <span className="mt-0.5 block truncate text-[10.5px] font-bold text-green-dark">
                        {l.credit ? `${L('Crédito', 'Credit')} ${L(CREDIT_LABEL[l.credit]?.es ?? l.credit, CREDIT_LABEL[l.credit]?.en ?? l.credit)}` : ''}{l.credit && l.down != null ? ' · ' : ''}{l.down != null ? `${L('Enganche', 'Down')} $${l.down.toLocaleString()}` : ''}
                      </span>
                    )}
                    {l.message && <span className="mt-0.5 block truncate text-[11px] font-medium text-ink-3">“{l.message}”</span>}
                  </span>
                </button>
                <div className="mt-2.5 flex gap-2 border-t border-hair pt-2.5">
                  {l.phone && (
                    <a href={`tel:${l.phone}`} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn border border-lilac-line bg-white py-2 text-[11px] font-extrabold text-ink">
                      <Phone size={13} stroke={2.2} className="text-primary-dark" />{L('Llamar', 'Call')}
                    </a>
                  )}
                  {l.email && (
                    <a href={`mailto:${l.email}`} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn border border-lilac-line bg-white py-2 text-[11px] font-extrabold text-ink">
                      <Mail size={13} stroke={2.2} className="text-primary-dark" />{L('Correo', 'Email')}
                    </a>
                  )}
                  <button onClick={() => { setLeadId(l.id); setLeadBack('leads'); setView('lead'); }} className="tap-y flex-1 cursor-pointer rounded-btn bg-primary py-2 text-[11px] font-extrabold text-white">{L('Abrir', 'Open')}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModulePage>
  );

  // ---- lead detail ----
  const leadDetailPage = detailLead && (() => {
    const l = detailLead;
    const st = stageMeta(l.stage);
    const veh = vehicles.find((v) => v.id === l.vehicleId);
    const monthly = veh && l.kind === 'prequal' ? estMonthly(veh.price, l.down) : null;
    const info: [string, string][] = [
      [L('Auto', 'Vehicle'), l.vehicleTitle || '—'],
      ...(l.offerAmount != null ? [[L('Oferta', 'Offer'), `$${l.offerAmount.toLocaleString()}`] as [string, string]] : []),
      ...(l.credit ? [[L('Crédito', 'Credit'), L(CREDIT_LABEL[l.credit]?.es ?? l.credit, CREDIT_LABEL[l.credit]?.en ?? l.credit)] as [string, string]] : []),
      ...(l.income ? [[L('Ingresos', 'Income'), l.income] as [string, string]] : []),
      ...(l.employ ? [[L('Empleo', 'Employment'), l.employ] as [string, string]] : []),
      ...(l.down != null ? [[L('Enganche', 'Down payment'), `$${l.down.toLocaleString()}`] as [string, string]] : []),
      ...(monthly != null ? [[L('Est. mensual', 'Est. monthly'), `$${Math.round(monthly).toLocaleString()}/${L('mes', 'mo')}`] as [string, string]] : []),
      [L('Teléfono', 'Phone'), l.phone ?? '—'],
      [L('Correo', 'Email'), l.email ?? '—'],
      [L('Recibido', 'Received'), `${fmtDay(l.createdAt, es)} · ${fmtClock(l.createdAt)}`],
    ];
    return (
      <ModulePage title={l.name} subtitle={L('Detalle del lead', 'Lead detail')} onBack={() => setView(leadBack)} maxW={640}>
        <div className="flex flex-col gap-4">
          <div className={`${cardCls} p-4`}>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-[15px] font-extrabold text-white" style={{ background: avColor(l.name) }}>{initials(l.name)}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-extrabold text-ink">{l.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-[18px].5">
                  {kindPill(l)}
                  <span className={`rounded-md px-2 py-1 text-[9px] font-extrabold ${st.cls}`}>{L(st.es, st.en)}</span>
                </div>
              </div>
            </div>
            {l.message && (
              <div className="mt-3 rounded-field bg-lilac-3 px-3.5 py-3 text-[12px] font-medium leading-relaxed text-ink-3">“{l.message}”</div>
            )}
            <div className="mt-3 flex gap-2">
              {l.phone && (
                <a href={`tel:${l.phone}`} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn bg-primary py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm">
                  <Phone size={14} stroke={2.2} />{L('Llamar', 'Call')}
                </a>
              )}
              {l.email && (
                <a href={`mailto:${l.email}`} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn border-[1.5px] border-lilac-line bg-white py-2.5 text-[12px] font-extrabold text-ink">
                  <Mail size={14} stroke={2.2} className="text-primary-dark" />{L('Correo', 'Email')}
                </a>
              )}
            </div>
          </div>

          <div className={`${cardCls} p-3.5`}>
            <div className="mb-1 text-[12.5px] font-extrabold text-ink">{L('Información', 'Information')}</div>
            {info.map(([k, val], i) => (
              <div key={k} className={`flex items-center justify-between gap-3 py-2.5 ${i < info.length - 1 ? 'border-b border-hair' : ''}`}>
                <span className="flex-none text-[10.5px] font-semibold text-muted-2">{k}</span>
                <span className="min-w-0 truncate text-[11.5px] font-bold text-ink">{val}</span>
              </div>
            ))}
          </div>

          <div className={`${cardCls} p-3.5`}>
            <div className="mb-2 text-[12.5px] font-extrabold text-ink">{L('Mover a etapa', 'Move to stage')}</div>
            <div className="-my-1.5 py-1.5 no-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-0.5">
              {STAGES.map((s) => (
                <button key={s.id} onClick={() => void moveStage(l, s.id)} className={chip(l.stage === s.id)}>{L(s.es, s.en)}</button>
              ))}
            </div>
          </div>
        </div>
      </ModulePage>
    );
  })();

  // ==================================================================
  // FINANCING pipeline (pre-qual leads)
  // ==================================================================
  const appStatus = (stage: AuLeadStage) =>
    stage === 'sold' ? { es: 'Aprobado', en: 'Approved', cls: 'bg-green-bg text-green-dark' }
      : stage === 'financing' ? { es: 'En trámite', en: 'In progress', cls: 'bg-blue-bg text-blue' }
        : { es: 'En revisión', en: 'Under review', cls: 'bg-amber-bg text-amber-ink' };
  const approvedCount = prequalLeads.filter((l) => l.stage === 'sold').length;
  const reviewCount = prequalLeads.filter((l) => l.stage !== 'sold').length;

  const financingPage = (
    <ModulePage title={L('Financiamiento', 'Financing')} subtitle={L('Solicitudes de pre-calificación', 'Pre-qualification applications')} onBack={() => setView('list')} maxW={760}>
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <div className={`${cardCls} p-3`}>
          <div className="text-[9.5px] font-bold text-muted-2">{L('Aprobadas', 'Approved')}</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-green-dark">{loading ? '…' : approvedCount}</div>
        </div>
        <div className={`${cardCls} p-3`}>
          <div className="text-[9.5px] font-bold text-muted-2">{L('En revisión', 'Under review')}</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-amber-ink">{loading ? '…' : reviewCount}</div>
        </div>
      </div>
      {persistable && leadRows === null ? (
        <div className="grid gap-2.5">{[0, 1].map((i) => <div key={i} className={`${cardCls} h-[110px] animate-pulse bg-lilac-2`} />)}</div>
      ) : prequalLeads.length === 0 ? (
        <div className="rounded-card-sm border border-line bg-white px-6 py-12 text-center shadow-card">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-tile bg-lilac-3"><CreditCard size={22} stroke={2} className="text-primary-dark" /></span>
          <div className="text-[13.5px] font-extrabold text-ink">{L('Sin solicitudes de financiamiento', 'No financing applications')}</div>
          <div className="mt-1 text-[11.5px] font-medium text-muted-2">{L('Cuando un comprador se pre-califique en uno de tus autos, su solicitud aparecerá aquí.', 'When a buyer gets pre-qualified on one of your vehicles, their application shows here.')}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {prequalLeads.map((l) => {
            const ap = appStatus(l.stage);
            const veh = vehicles.find((v) => v.id === l.vehicleId);
            const monthly = veh ? estMonthly(veh.price, l.down) : null;
            const cells: [string, string][] = [
              [L('Crédito', 'Credit'), l.credit ? L(CREDIT_LABEL[l.credit]?.es ?? l.credit, CREDIT_LABEL[l.credit]?.en ?? l.credit) : '—'],
              [L('Enganche', 'Down'), l.down != null ? `$${l.down.toLocaleString()}` : '—'],
              [L('Est. mensual', 'Est. monthly'), monthly != null ? `$${Math.round(monthly).toLocaleString()}` : '—'],
              [L('Ingresos', 'Income'), l.income ?? '—'],
            ];
            return (
              <button key={l.id} onClick={() => { setLeadId(l.id); setLeadBack('financing'); setView('lead'); }} className={`${cardCls} cursor-pointer p-3.5 text-left`}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[11.5px] font-extrabold text-white" style={{ background: avColor(l.name) }}>{initials(l.name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-extrabold text-ink">{l.name}</div>
                    <div className="truncate text-[10px] font-semibold text-muted-2">{l.vehicleTitle}</div>
                  </div>
                  <span className={`flex-none rounded-md px-2 py-1 text-[9px] font-extrabold ${ap.cls}`}>{L(ap.es, ap.en)}</span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-hair pt-3">
                  {cells.map(([k, val]) => (
                    <div key={k} className="min-w-0">
                      <div className="text-[8.5px] font-bold uppercase text-muted-2">{k}</div>
                      <div className="mt-0.5 truncate text-[11px] font-extrabold text-ink">{val}</div>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </ModulePage>
  );

  // ==================================================================
  // TEST DRIVES agenda
  // ==================================================================
  const agendaDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  }), []);
  const dayTests = tests
    .filter((t) => dayKeyOf(t.at) === testDay)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const testsPage = (
    <ModulePage title={L('Agenda de pruebas', 'Test drive calendar')} subtitle={L('Confirma y organiza tus pruebas de manejo', 'Confirm and organize your test drives')} onBack={() => setView('list')} maxW={760}>
      <div className="-my-1.5 py-1.5 no-scrollbar mb-4 flex min-w-0 gap-2 overflow-x-auto pb-0.5">
        {agendaDays.map((d) => {
          const key = dayKey(d);
          const on = key === testDay;
          const has = tests.some((t) => dayKeyOf(t.at) === key);
          return (
            <button key={key} onClick={() => setTestDay(key)} className={`tap-y flex w-14 flex-none cursor-pointer flex-col items-center rounded-btn-lg py-2.5 ${on ? 'bg-primary text-white shadow-cta-sm' : 'border border-lilac-line bg-white text-ink'}`}>
              <span className={`text-[9px] font-extrabold uppercase ${on ? 'text-white/80' : 'text-muted-2'}`}>{(es ? DOW_ES : DOW_EN)[d.getDay()]}</span>
              <span className="text-[15px] font-extrabold leading-tight">{d.getDate()}</span>
              <span className={`mt-0.5 h-1 w-1 rounded-full ${has ? (on ? 'bg-white' : 'bg-primary') : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>

      {persistable && testRows === null ? (
        <div className="grid gap-2.5">{[0, 1].map((i) => <div key={i} className={`${cardCls} h-[92px] animate-pulse bg-lilac-2`} />)}</div>
      ) : dayTests.length === 0 ? (
        <div className="rounded-card-sm border border-line bg-white px-6 py-12 text-center shadow-card">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-tile bg-lilac-3"><CalendarEvent size={22} stroke={2} className="text-primary-dark" /></span>
          <div className="text-[13.5px] font-extrabold text-ink">{L('Sin pruebas este día', 'No test drives this day')}</div>
          <div className="mt-1 text-[11.5px] font-medium text-muted-2">{L('Las pruebas que agenden tus clientes aparecerán aquí.', 'Test drives your clients book will show here.')}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {dayTests.map((t) => {
            const st = TEST_STATUS[t.status] ?? TEST_STATUS.pendiente;
            return (
              <div key={t.id} className={`${cardCls} p-3.5`}>
                <div className="flex items-start gap-3">
                  <div className="flex-none text-center">
                    <div className="text-[14px] font-extrabold text-ink">{fmtClock(t.at)}</div>
                    <div className="text-[9px] font-bold text-muted-2">30 min</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-[12.5px] font-extrabold text-ink">{t.name}</span>
                      <span className={`flex-none rounded-md px-2 py-1 text-[9px] font-extrabold ${st.cls}`}>{L(st.es, st.en)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[10.5px] font-semibold text-muted-2">{t.vehicleTitle}</div>
                    {t.phone && (
                      <div className="mt-1.5">
                        <a href={`tel:${t.phone}`} className="inline-flex items-center gap-1 rounded-full bg-lilac-2 px-2.5 py-1 text-[9.5px] font-extrabold text-ink-soft"><Phone size={11} stroke={2.4} />{L('Llamar', 'Call')}</a>
                      </div>
                    )}
                  </div>
                </div>

                {(t.status === 'pendiente' || t.status === 'confirmada') && (
                  <div className="mt-3 flex flex-wrap gap-x-2 gap-y-[18px] border-t border-hair pt-3">
                    {t.status === 'pendiente' && (
                      <button onClick={() => void testAction(t, 'confirmada')} className="tap-y flex-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[11.5px] font-extrabold text-white shadow-cta-sm">{L('Confirmar', 'Confirm')}</button>
                    )}
                    {t.status === 'confirmada' && (
                      <button onClick={() => void testAction(t, 'completada')} className="tap-y flex-1 cursor-pointer rounded-btn bg-green py-2.5 text-[11.5px] font-extrabold text-white">{L('Completada', 'Completed')}</button>
                    )}
                    <button onClick={() => { setReschedId(reschedId === t.id ? null : t.id); setReschedAt(toLocalInput(t.at)); }} className="tap-y flex-1 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white py-2.5 text-[11.5px] font-extrabold text-ink">{L('Reprogramar', 'Reschedule')}</button>
                  </div>
                )}
                {reschedId === t.id && (
                  <div className="mt-2.5 rounded-btn-lg border-[1.5px] border-primary bg-lilac-3 p-3">
                    <label className={labelCls}>{L('Nueva fecha y hora', 'New date & time')}</label>
                    <input type="datetime-local" value={reschedAt} onChange={(e) => setReschedAt(e.target.value)} className={fieldCls} />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => { if (!reschedAt) return; void testAction(t, 'pendiente', new Date(reschedAt).toISOString()); }}
                        disabled={!reschedAt}
                        className="tap-y flex-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[11.5px] font-extrabold text-white disabled:opacity-40"
                      >
                        {L('Proponer horario', 'Propose time')}
                      </button>
                      <button onClick={() => { setReschedId(null); setReschedAt(''); }} className="tap-y cursor-pointer rounded-btn border border-line bg-white px-4 py-2.5 text-[11.5px] font-extrabold text-ink-soft">{L('Cancelar', 'Cancel')}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ModulePage>
  );

  // ==================================================================
  // TEAM (salespeople — stored in auto_config.team)
  // ==================================================================
  const teamPage = (
    <ModulePage title={L('Equipo', 'Team')} subtitle={L('Tu equipo de ventas y financiamiento', 'Your sales & financing team')} onBack={() => setView('list')} maxW={640}>
      <div className="flex flex-col gap-4">
        <div className={`${cardCls} p-3.5`}>
          <div className="mb-2 text-[12.5px] font-extrabold text-ink">{L('Agregar miembro', 'Add member')}</div>
          <div className="flex flex-col gap-2.5">
            <input value={memForm.name} onChange={(e) => setMemForm((f) => ({ ...f, name: e.target.value }))} placeholder={L('Nombre', 'Name')} className={fieldCls} />
            <div className="flex gap-2.5">
              <input value={memForm.role} onChange={(e) => setMemForm((f) => ({ ...f, role: e.target.value }))} placeholder={L('Rol (ej. Ventas)', 'Role (e.g. Sales)')} className={`${fieldCls} flex-1`} />
              <input value={memForm.phone} onChange={(e) => setMemForm((f) => ({ ...f, phone: e.target.value }))} placeholder={L('Teléfono', 'Phone')} inputMode="tel" className={`${fieldCls} flex-1`} />
            </div>
            <button onClick={() => void addMember()} disabled={teamBusy} className="tap-y flex cursor-pointer items-center justify-center gap-1.5 rounded-btn bg-primary py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm disabled:opacity-50">
              <UserPlus size={15} stroke={2.4} />{teamBusy ? L('Guardando…', 'Saving…') : L('Agregar al equipo', 'Add to team')}
            </button>
          </div>
        </div>

        {team.length === 0 ? (
          <div className="rounded-card-sm border border-line bg-white px-6 py-12 text-center shadow-card">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-tile bg-lilac-3"><Users size={22} stroke={2} className="text-primary-dark" /></span>
            <div className="text-[13.5px] font-extrabold text-ink">{L('Sin miembros todavía', 'No members yet')}</div>
            <div className="mt-1 text-[11.5px] font-medium text-muted-2">{L('Agrega a tu equipo de ventas para asignar leads y pruebas.', 'Add your sales team to assign leads and test drives.')}</div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-card-sm border border-line bg-white shadow-card">
            {team.map((m, i) => (
              <div key={`${m.name}-${i}`} className={`flex items-center gap-3 p-3.5 ${i < team.length - 1 ? 'border-b border-hair' : ''}`}>
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: avColor(m.name) }}>{initials(m.name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-extrabold text-ink">{m.name}</div>
                  <div className="truncate text-[10.5px] font-semibold text-muted-2">{m.role}{m.phone ? ` · ${m.phone}` : ''}</div>
                </div>
                {m.phone && (
                  <a href={`tel:${m.phone}`} className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-lilac-2 text-primary-dark" aria-label={L('Llamar', 'Call')}><Phone size={15} stroke={2.2} /></a>
                )}
                <button onClick={() => void removeMember(i)} disabled={teamBusy} className="tap flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink-soft disabled:opacity-50" aria-label={L('Eliminar', 'Remove')}><Trash2 size={15} stroke={2.2} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModulePage>
  );

  // ==================================================================
  // WIZARD UI (Vehículo → Precio → Fotos → Revisar)
  // ==================================================================
  const stepDefs: string[] = [L('Vehículo', 'Vehicle'), L('Precio', 'Price'), L('Fotos', 'Photos'), L('Revisar', 'Review')];

  const wizStep0 = (
    <div className="flex flex-col gap-3.5">
      <div>
        <label className={labelCls}>{L('Condición', 'Condition')} *</label>
        {segmented(AU_CONDS, draft.cond, (v) => upD({ cond: v }), 4)}
      </div>
      <div>
        <label className={labelCls}>{L('Tipo de vehículo', 'Vehicle type')} *</label>
        <div className="flex flex-wrap gap-x-2 gap-y-[18px]">
          {AU_TYPES.map((t) => (
            <button key={t.id} onClick={() => upD({ vtype: t.id })} className={chip(draft.vtype === t.id)}>{L(t.es, t.en)}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="w-[110px] flex-none">
          <label className={labelCls}>{L('Año', 'Year')} *</label>
          <input value={draft.year} onChange={(e) => upD({ year: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })} inputMode="numeric" placeholder="2021" className={fieldCls} />
        </div>
        <div className="flex-1">
          <label className={labelCls}>{L('Marca', 'Make')} *</label>
          <input list="au-makes" value={draft.make} onChange={(e) => upD({ make: e.target.value })} placeholder="Toyota" className={fieldCls} />
          <datalist id="au-makes">{AU_MAKES.map((m) => <option key={m} value={m} />)}</datalist>
        </div>
      </div>
      <div>
        <label className={labelCls}>{L('Modelo', 'Model')} *</label>
        <input value={draft.model} onChange={(e) => upD({ model: e.target.value })} placeholder={L('Ej. Camry SE', 'e.g. Camry SE')} className={fieldCls} />
      </div>
      <div>
        <label className={labelCls}>{L('Ciudad', 'City')}</label>
        <div className="relative">
          <input value={draft.city} onChange={(e) => upD({ city: e.target.value, lat: null, lng: null })} placeholder="Houston, TX" className={fieldCls} />
          {addrResults.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-[200px] w-full overflow-y-auto rounded-field border border-line-strong bg-white p-1 shadow-pop">
              {addrResults.map((a, i) => (
                <button key={`${a.formatted}-${i}`} type="button" onClick={() => chooseCity(a)} className="w-full cursor-pointer rounded-field p-2.5 text-left text-[12.5px] font-bold text-ink-soft hover:bg-app">
                  {a.formatted}
                </button>
              ))}
            </div>
          )}
          <div className="mt-1 text-[10px] font-semibold text-muted-2">
            {addrSearching ? L('Buscando ubicación…', 'Searching location…')
              : draft.lat != null ? L('📍 Ubicación fijada — saldrá en el mapa del cliente.', '📍 Location set — it will show on the buyer map.')
              : L('Elige una sugerencia para fijar el mapa (opcional).', 'Pick a suggestion to pin the map (optional).')}
          </div>
        </div>
      </div>
    </div>
  );

  const wizStep1 = (
    <div className="flex flex-col gap-3.5">
      <div>
        <label className={labelCls}>{L('Precio', 'Price')} *</label>
        <div className="flex items-center gap-1.5 rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 focus-within:border-primary">
          <span className="text-[18px] font-extrabold text-muted-2">$</span>
          <input value={draft.price} onChange={(e) => upD({ price: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="21,900" className="min-w-0 flex-1 bg-transparent py-3 text-[19px] font-extrabold text-ink outline-none placeholder:text-muted-faint" />
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="flex-1">
          <label className={labelCls}>{L('Enganche', 'Down payment')}</label>
          <input value={draft.down} onChange={(e) => upD({ down: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="2,000" className={fieldCls} />
        </div>
        <div className="flex-1">
          <label className={labelCls}>{L('Millaje', 'Mileage')}</label>
          <input value={draft.miles} onChange={(e) => upD({ miles: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="38,200" className={fieldCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>{L('Transmisión', 'Transmission')}</label>
        {segmented(AU_TRANS, draft.trans as never, (v) => upD({ trans: v }), 3)}
      </div>
      <div>
        <label className={labelCls}>{L('Combustible', 'Fuel')}</label>
        {segmented(AU_FUELS, draft.fuel as never, (v) => upD({ fuel: v }), 4)}
      </div>
      <div className="flex gap-2.5">
        <div className="flex-1">
          <label className={labelCls}>{L('Rendimiento (MPG)', 'MPG')}</label>
          <input value={draft.mpg} onChange={(e) => upD({ mpg: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="32" className={fieldCls} />
        </div>
        <div className="flex-1">
          <label className={labelCls}>{L('Color', 'Color')}</label>
          <input value={draft.color} onChange={(e) => upD({ color: e.target.value })} placeholder={L('Ej. Gris plata', 'e.g. Silver')} className={fieldCls} />
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="flex-1">
          <label className={labelCls}>{L('VIN', 'VIN')}</label>
          <input value={draft.vin} onChange={(e) => upD({ vin: e.target.value.toUpperCase() })} placeholder="1HGCM82633A004352" className={fieldCls} />
        </div>
        <div className="w-[110px] flex-none">
          <label className={labelCls}>{L('APR %', 'APR %')}</label>
          <input value={draft.apr} onChange={(e) => upD({ apr: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="8.9" className={fieldCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>{L('Descripción', 'Description')}</label>
        <textarea value={draft.desc} onChange={(e) => upD({ desc: e.target.value })} rows={3} placeholder={L('Describe lo mejor del auto…', 'Describe the best of the vehicle…')} className={`${fieldCls} resize-none text-[12px] font-medium leading-relaxed`} />
      </div>
      <div>
        <label className={labelCls}>{L('Opciones de venta', 'Sale options')}</label>
        <div className="flex flex-wrap gap-x-2 gap-y-[18px]">
          <button onClick={() => upD({ bhph: !draft.bhph })} className={chip(draft.bhph)}>{draft.bhph ? '✓ ' : ''}{L('Aquí pagas aquí (sin crédito)', 'Buy here pay here (no credit)')}</button>
          <button onClick={() => upD({ financing: !draft.financing })} className={chip(draft.financing)}>{draft.financing ? '✓ ' : ''}{L('Financiamiento', 'Financing')}</button>
          <button onClick={() => upD({ tradeIn: !draft.tradeIn })} className={chip(draft.tradeIn)}>{draft.tradeIn ? '✓ ' : ''}{L('Acepta trade-in', 'Accepts trade-in')}</button>
        </div>
      </div>
      <div>
        <label className={labelCls}>{L('Características', 'Features')}</label>
        {draft.feats.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-x-1 gap-y-[18px].5">
            {draft.feats.map((f) => (
              <span key={f} className="flex items-center gap-1.5 rounded-full bg-lilac px-3 py-1.5 text-[11px] font-extrabold text-primary-dark">
                {f}
                <button onClick={() => upD({ feats: draft.feats.filter((x) => x !== f) })} className="cursor-pointer" aria-label={L('Quitar', 'Remove')}><X size={12} stroke={2.6} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input value={featInput} onChange={(e) => setFeatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeat(); } }} placeholder={L('Ej. Cámara de reversa', 'e.g. Backup camera')} className={`${fieldCls} flex-1`} />
          <button onClick={addFeat} className="flex-none cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 px-4 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar', 'Add')}</button>
        </div>
      </div>
    </div>
  );

  const wizStep2 = (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-medium leading-relaxed text-muted">{L('Agrega al menos 1 foto (máx. 12). La primera es la portada.', 'Add at least 1 photo (max 12). The first is the cover.')}</p>
      <input ref={photoInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = e.target.files; void addPhotos(f); e.target.value = ''; }} />
      <div className="grid grid-cols-3 gap-2">
        {draft.photos.map((url, i) => (
          <div key={url} className="relative aspect-square overflow-hidden rounded-tile border border-line" style={{ backgroundImage: `url("${imgUrl(url, ANCHO.tarjeta)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-0.5 text-[8.5px] font-extrabold text-white">{L('Portada', 'Cover')}</span>}
            <button onClick={() => removePhoto(url)} className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white" aria-label={L('Quitar foto', 'Remove photo')}>
              <Trash2 size={12} stroke={2.2} />
            </button>
          </div>
        ))}
        {draft.photos.length < 12 && (
          <button onClick={() => photoInputRef.current?.click()} disabled={photoBusy} className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-tile border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 text-primary-dark disabled:opacity-60">
            <ImagePlus size={20} stroke={2} />
            <span className="text-[10px] font-extrabold">{photoBusy ? L('Subiendo…', 'Uploading…') : L('Agregar foto', 'Add photo')}</span>
          </button>
        )}
      </div>
    </div>
  );

  const reviewRows: [string, string, boolean][] = [
    [L('Vehículo', 'Vehicle'), `${draft.year.trim()} ${draft.make.trim()} ${draft.model.trim()}`.trim() || '—', step0Ok],
    [L('Condición', 'Condition'), `${condLabel(draft.cond)} · ${vtypeLabel(draft.vtype)}`, true],
    [L('Precio', 'Price'), Number(draft.price) > 0 ? fmtAuPrice(Number(draft.price)) : '—', Number(draft.price) > 0],
    [L('Financiamiento', 'Financing'), draft.bhph ? L('Aquí pagas aquí', 'Buy here pay here') : draft.financing ? L('Financiamiento', 'Financing') : L('Contado', 'Cash only'), true],
    [L('Fotos', 'Photos'), `${draft.photos.length} ${L('de', 'of')} 6`, draft.photos.length >= 1],
  ];
  const wizStep3 = (
    <div className="flex flex-col gap-3.5">
      {/* live preview */}
      <div className="overflow-hidden rounded-card-sm border border-line bg-white shadow-card">
        <div className="relative h-[120px]" style={draft.photos[0] ? { backgroundImage: `url("${imgUrl(draft.photos[0], ANCHO.ancha)}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: tileBg(draft.cond) }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 40%,rgba(0,0,0,.5))' }} />
          <span className="absolute left-2.5 top-2.5 rounded-[7px] bg-white px-2 py-1 text-[9px] font-extrabold text-primary-dark">{condLabel(draft.cond)}</span>
          {draft.bhph && <span className="absolute right-2.5 top-2.5 rounded-md bg-amber-bg px-2 py-1 text-[9px] font-extrabold uppercase text-amber-ink">{L('Aquí pagas aquí', 'BHPH')}</span>}
          <div className="absolute bottom-2.5 left-3 right-3">
            <div className="text-[17px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{Number(draft.price) > 0 ? fmtAuPrice(Number(draft.price)) : L('Precio por definir', 'Price TBD')}</div>
            <div className="truncate text-[10.5px] font-semibold text-white/85">{`${draft.year.trim()} ${draft.make.trim()} ${draft.model.trim()}`.trim() || L('Auto', 'Vehicle')}</div>
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-1 text-[10.5px] font-semibold text-muted-2">
            <Gauge size={12} stroke={2} className="text-muted-2" />{draft.miles ? fmtMiles(Number(draft.miles), es) : L('Millaje s/d', 'Mileage n/a')}
            <span className="mx-1 text-muted-faint">·</span>{transLabel(draft.trans)}
            <span className="mx-1 text-muted-faint">·</span>{fuelLabel(draft.fuel)}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-field border border-line bg-white">
        {reviewRows.map(([k, val, ok], i) => (
          <div key={k} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < reviewRows.length - 1 ? 'border-b border-hair' : ''}`}>
            <span className="w-[92px] flex-none text-[10.5px] font-semibold text-muted-2">{k}</span>
            <span className={`min-w-0 flex-1 truncate text-[11.5px] font-bold ${ok ? 'text-ink' : 'text-muted-faint'}`}>{val}</span>
            {ok && <Check size={13} stroke={3} className="flex-none text-green" />}
          </div>
        ))}
      </div>

      {publishBlocked ? (
        <div className="flex items-start gap-2.5 rounded-field bg-amber-bg p-3">
          <Certificate size={16} stroke={2.2} className="mt-0.5 flex-none text-amber-ink" />
          <div className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-amber-ink">
            {L('Agrega tu número de licencia para publicar (arriba en Autos). Mientras tanto puedes guardar como borrador.', 'Add your license number to publish (top of Autos). Meanwhile you can save it as a draft.')}
          </div>
        </div>
      ) : (
        <p className="text-[10.5px] font-medium leading-snug text-muted-2">
          {L('Al publicar, tu auto aparecerá en la búsqueda y el mapa de ToLatino.', 'On publish, your vehicle appears in ToLatino search and map.')}
        </p>
      )}
    </div>
  );

  const finalLabel = draft.id && draft.status !== 'draft' ? L('Guardar cambios', 'Save changes') : L('Publicar', 'Publish');
  const wizardPage = (
    <ModulePage
      title={draft.id ? L('Editar auto', 'Edit vehicle') : L('Publicar auto', 'Publish vehicle')}
      subtitle={`${L('Paso ', 'Step ')}${wizStep + 1}${L(' de ', ' of ')}4 · ${stepDefs[wizStep]}`}
      onBack={() => setView('list')}
      backLabel={L('Cancelar', 'Cancel')}
      maxW={720}
      footer={
        <div className="flex items-center gap-2.5">
          <button onClick={wizBack} className="flex-none cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3.5 text-[12.5px] font-extrabold text-ink">
            {wizStep === 0 ? L('Cancelar', 'Cancel') : L('Atrás', 'Back')}
          </button>
          {(!draft.id || draft.status === 'draft') && (
            <button onClick={() => void saveDraft()} disabled={draftBusy || wizBusy} className="flex-none cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3.5 text-[12.5px] font-extrabold text-ink-soft disabled:opacity-40">
              {draftBusy ? L('Guardando…', 'Saving…') : L('Borrador', 'Draft')}
            </button>
          )}
          <button
            onClick={() => void wizNext()}
            disabled={wizStep === 3 ? !publishReady || publishBlocked || wizBusy : !stepValid}
            className="flex-1 cursor-pointer rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta disabled:cursor-not-allowed disabled:opacity-40"
          >
            {wizStep === 3 ? (wizBusy ? L('Publicando…', 'Publishing…') : finalLabel) : L('Continuar', 'Continue')}
          </button>
        </div>
      }
    >
      <div className="-my-1.5 py-1.5 no-scrollbar mb-4 flex min-w-0 gap-2 overflow-x-auto pb-0.5">
        {stepDefs.map((label, i) => {
          const active = wizStep === i;
          const done = i < wizStep || (i <= wizMax && i !== wizStep);
          return (
            <button
              key={label}
              onClick={() => { if (i <= wizMax) setWizStep(i); }}
              className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${active ? 'bg-primary text-white' : done ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted-2'}`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold ${active ? 'bg-white/25 text-white' : done ? 'bg-primary text-white' : 'bg-muted-faint text-white'}`}>{done ? '✓' : i + 1}</span>
              {label}
            </button>
          );
        })}
      </div>

      <div className={`${cardCls} p-4`}>
        <div className="mb-3.5 text-[13.5px] font-extrabold text-ink">
          {wizStep === 0 ? L('¿Qué auto vas a publicar?', 'What vehicle are you publishing?')
            : wizStep === 1 ? L('Precio y detalles', 'Price & details')
            : wizStep === 2 ? L('Fotos del auto', 'Vehicle photos')
            : L('Revisar y publicar', 'Review & publish')}
        </div>
        {wizStep === 0 && wizStep0}
        {wizStep === 1 && wizStep1}
        {wizStep === 2 && wizStep2}
        {wizStep === 3 && wizStep3}
      </div>
    </ModulePage>
  );

  // ==================================================================
  // SUCCESS
  // ==================================================================
  const successPage = (
    <ModulePage title={L('¡Auto publicado!', 'Vehicle published!')} onBack={() => setView('list')}>
      <div className="flex flex-col items-center px-2 pb-8 pt-6 text-center">
        <div className="mb-3.5 flex h-16 w-16 items-center justify-center rounded-card bg-green-bg">
          <Check size={32} stroke={2.6} className="text-green" />
        </div>
        <div className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{`${draft.year.trim()} ${draft.make.trim()} ${draft.model.trim()}`.trim() || L('Tu auto', 'Your vehicle')} {L('está activo', 'is live')}</div>
        <div className="mt-2 max-w-[320px] text-[13px] font-medium leading-relaxed text-muted">
          {L('Tu auto ya es visible para compradores en ToLatino. Te avisaremos de cada lead y prueba de manejo.', 'Your vehicle is now visible to buyers on ToLatino. We will notify you of every lead and test drive.')}
        </div>

        <div className="mt-5 w-full max-w-[420px] overflow-hidden rounded-card-sm border border-line bg-white text-left shadow-card">
          <div className="relative h-[104px]" style={draft.photos[0] ? { backgroundImage: `url("${imgUrl(draft.photos[0], ANCHO.ancha)}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: tileBg(draft.cond) }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.45))' }} />
            <div className="absolute bottom-2.5 left-3 text-[15px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{`${draft.year.trim()} ${draft.make.trim()} ${draft.model.trim()}`.trim() || L('Auto', 'Vehicle')}</div>
          </div>
          <div className="flex items-center justify-between p-3.5">
            <div className="text-[12.5px] font-extrabold text-ink">{Number(draft.price) > 0 ? fmtAuPrice(Number(draft.price)) : ''}</div>
            <span className="flex-none rounded-lg bg-green-bg px-3 py-1.5 text-[10.5px] font-extrabold text-green-dark">{L('Disponible', 'Available')}</span>
          </div>
        </div>

        <div className="mt-5 flex w-full max-w-[420px] flex-col gap-2.5">
          <button
            onClick={() => {
              const url = typeof window !== 'undefined' ? `${window.location.origin}/autos` : '';
              if (typeof navigator !== 'undefined' && navigator.clipboard && url) void navigator.clipboard.writeText(url);
              flash(L('Enlace copiado', 'Link copied'));
            }}
            className="w-full cursor-pointer rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta"
          >
            {L('Compartir mi inventario', 'Share my inventory')}
          </button>
          <button onClick={() => setView('list')} className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3.5 text-[13.5px] font-extrabold text-ink">{L('Ver mi inventario', 'View my inventory')}</button>
        </div>
      </div>
    </ModulePage>
  );

  // ---------- render ----------
  if (view === 'detail' && detailPage) return <>{detailPage}<Toast msg={toast} /></>;
  if (view === 'wizard') return <>{wizardPage}<Toast msg={toast} /></>;
  if (view === 'success') return <>{successPage}<Toast msg={toast} /></>;
  if (view === 'leads') return <>{leadsPage}<Toast msg={toast} /></>;
  if (view === 'lead' && leadDetailPage) return <>{leadDetailPage}<Toast msg={toast} /></>;
  if (view === 'financing') return <>{financingPage}<Toast msg={toast} /></>;
  if (view === 'tests') return <>{testsPage}<Toast msg={toast} /></>;
  if (view === 'team') return <>{teamPage}<Toast msg={toast} /></>;

  return (
    <div className="relative">
      {listBody}
      <Toast msg={toast} />
    </div>
  );
}
