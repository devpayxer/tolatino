'use client';

// Bienes Raíces — AGENT/AGENCY panel module (business dashboard). Built from the
// "ToLatino Real Estate Agent" handoff: (1) Resumen/list — KPIs, "Requiere
// atención", listings with status filters; (2) listing detail with performance
// + status changes + per-property leads; (3) a 4-step publish wizard (Tipo →
// Detalles → Fotos → Revisar) with a license gate (re_config.license) before
// publishing; (4) leads pipeline with stage moves; (5) tours agenda (7-day
// strip, confirm / reschedule / complete). Benchmarked vs Zillow Premier Agent.
// Demo mode (no signed-in business) shows realistic sample data with local-only
// actions; a REAL business sees ONLY its real rows (honest zeros/empty states).

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconBath as Bath, IconBed as Bed, IconCalendarEvent as CalendarEvent,
  IconCertificate as Certificate, IconCheck as Check, IconChevronRight as ChevronRight,
  IconExternalLink as ExternalLink, IconEye as Eye, IconHeart as Heart,
  IconHome as Home, IconMail as Mail, IconMapPin as MapPin, IconPhone as Phone,
  IconPhotoPlus as ImagePlus, IconPlus as Plus, IconRulerMeasure as Ruler,
  IconTrash as Trash2, IconUsers as Users, IconVideo as Video, IconX as X,
} from '@tabler/icons-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image';
import { searchAddress, type Address } from '@/lib/geo';
import {
  upsertProperty, fetchMyProperties, fetchMyLeads, setLeadStage, fetchMyTours, setTourStatus,
  RE_DEALS, RE_TYPES, RE_TILE, fmtPrice, fmtPriceFull,
  type ReCard, type ReLead, type ReTour, type ReDeal, type RePtype, type ReStatus,
  type ReLeadStage, type ReTourStatus,
} from '@/lib/realestate';

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';

type View = 'list' | 'detail' | 'wizard' | 'success' | 'leads' | 'lead' | 'tours';
type MyProp = ReCard & { leadsCount: number; toursCount: number };
type MyLead = ReLead & { propertyTitle: string };
type MyTour = ReTour & { propertyTitle: string };

/** The exact shape written to businesses.re_config (merged over existing keys). */
type ReConfig = { license?: string; specialty?: string; langs?: string; zones?: string };

type PropDraft = {
  id: string | null;           // editing an existing property
  status: ReStatus;            // current status when editing (preserved on save)
  deal: ReDeal; ptype: RePtype;
  title: string; address: string; hood: string; city: string;
  price: string; beds: number; baths: number;
  sqft: string; lotSqft: string; year: string; hoa: string;
  deposit: string; available: string; lease: string;
  desc: string;
  pets: boolean; noCredit: boolean; cosigner: boolean;
  openHouse: string;           // datetime-local value
  feats: string[];
  photos: string[];
  lat: number | null; lng: number | null; // set by the address autocomplete (geo pipeline)
};

// Property types offered per deal (handoff: Tipo step chips).
const PTYPE_FOR_DEAL: Record<ReDeal, RePtype[]> = {
  venta: ['casa', 'condo', 'townhouse', 'departamento'],
  renta: ['casa', 'condo', 'townhouse', 'departamento'],
  cuarto: ['cuarto'],
  comercial: ['local', 'oficina', 'terreno'],
};

const STATUS_META: Record<ReStatus, { es: string; en: string; cls: string }> = {
  published: { es: 'Publicado', en: 'Published', cls: 'bg-green-bg text-green-dark' },
  pending:   { es: 'En trámite', en: 'Pending', cls: 'bg-amber-bg text-amber-ink' },
  rented:    { es: 'Rentado', en: 'Rented', cls: 'bg-lilac text-primary-dark' },
  sold:      { es: 'Vendido', en: 'Sold', cls: 'bg-lilac text-primary-dark' },
  draft:     { es: 'Borrador', en: 'Draft', cls: 'bg-lilac-2 text-ink-2' },
  review:    { es: 'En revisión', en: 'In review', cls: 'bg-amber-bg text-amber-ink' },
};
// Status values an owner can set from the panel (matches the upsert RPC).
const SETTABLE_STATUS: ReStatus[] = ['published', 'pending', 'rented', 'sold', 'draft'];

const STAGES: { id: ReLeadStage; es: string; en: string; cls: string }[] = [
  { id: 'new', es: 'Nuevo', en: 'New', cls: 'bg-pink-bg text-pink-dark' },
  { id: 'contacted', es: 'Contactado', en: 'Contacted', cls: 'bg-blue-bg text-blue' },
  { id: 'tour', es: 'Con visita', en: 'Tour', cls: 'bg-lilac text-primary-dark' },
  { id: 'offer', es: 'Oferta', en: 'Offer', cls: 'bg-amber-bg text-amber-ink' },
  { id: 'closed', es: 'Cerrado', en: 'Closed', cls: 'bg-green-bg text-green-dark' },
];
const stageMeta = (s: ReLeadStage) => STAGES.find((x) => x.id === s) ?? STAGES[0];

const TOUR_STATUS: Record<ReTourStatus, { es: string; en: string; cls: string }> = {
  pendiente: { es: 'Pendiente', en: 'Pending', cls: 'bg-amber-bg text-amber-ink' },
  confirmada: { es: 'Confirmada', en: 'Confirmed', cls: 'bg-green-bg text-green-dark' },
  cancelada: { es: 'Cancelada', en: 'Cancelled', cls: 'bg-lilac-2 text-ink-2' },
  completada: { es: 'Completada', en: 'Completed', cls: 'bg-lilac text-primary-dark' },
};

const SPECIALTIES: { id: string; es: string; en: string }[] = [
  { id: 'residencial', es: 'Residencial', en: 'Residential' },
  { id: 'comercial', es: 'Comercial', en: 'Commercial' },
  { id: 'rentas', es: 'Rentas', en: 'Rentals' },
];

// Avatar palette (same set the Events module uses for people initials).
const AV_COLORS = ['#7B61FF', '#2A5C8A', '#E8954A', '#D6336C', '#1F9D57'];
const avColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
};
const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

const tileBg = (deal: ReDeal) =>
  `repeating-linear-gradient(135deg,${RE_TILE[deal][0]} 0 9px,${RE_TILE[deal][1]} 9px 18px)`;

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

function newPropDraft(city: string): PropDraft {
  return {
    id: null, status: 'draft', deal: 'venta', ptype: 'casa',
    title: '', address: '', hood: '', city,
    price: '', beds: 3, baths: 2, sqft: '', lotSqft: '', year: '', hoa: '',
    deposit: '', available: '', lease: '',
    desc: '', pets: false, noCredit: false, cosigner: false,
    openHouse: '', feats: [], photos: [], lat: null, lng: null,
  };
}

export function RealEstateModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es } = ctx;
  void tab;

  // ---------- persistence wiring (mirror Events.tsx) ----------
  const admin = useBizAdmin();
  const real = admin.active;
  const persistable = !admin.demo && !!real; // real signed-in business → persist
  const { user } = useAuth();

  // ---------- view state machine ----------
  const [view, setView] = useState<View>('list');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadBack, setLeadBack] = useState<View>('leads'); // where lead detail returns to
  const [listFilter, setListFilter] = useState<'all' | ReStatus>('all');
  const [leadFilter, setLeadFilter] = useState<'all' | ReLeadStage>('all');
  const [tourDay, setTourDay] = useState(() => dayKey(new Date()));
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };

  // ---------- license / agency profile (re_config) ----------
  // BizRow doesn't type re_config yet (integrator adds the column to the type +
  // WRITABLE list) — read it defensively off the active business row.
  const reConfig = ((real as unknown as { re_config?: ReConfig } | null)?.re_config) ?? null;
  const hasLicense = !!reConfig?.license?.trim();
  const [licEdit, setLicEdit] = useState(false);
  const [licBusy, setLicBusy] = useState(false);
  const [licForm, setLicForm] = useState({ license: '', specialty: 'residencial', langEs: true, langEn: false, zones: '' });
  const openLicForm = () => {
    setLicForm({
      license: reConfig?.license ?? '',
      specialty: reConfig?.specialty ?? 'residencial',
      langEs: reConfig?.langs ? reConfig.langs.includes('Español') : true,
      langEn: reConfig?.langs ? reConfig.langs.includes('English') : false,
      zones: reConfig?.zones ?? '',
    });
    setLicEdit(true);
  };
  const saveLicense = async () => {
    const lic = licForm.license.trim();
    if (!lic) { flash(L('Escribe tu número de licencia', 'Enter your license number')); return; }
    if (licBusy) return;
    setLicBusy(true);
    const langs = [licForm.langEs ? 'Español' : '', licForm.langEn ? 'English' : ''].filter(Boolean).join(' · ');
    const cfg: ReConfig = {
      ...(reConfig ?? {}),
      license: lic, specialty: licForm.specialty,
      langs: langs || 'Español', zones: licForm.zones.trim(),
    };
    const res = await admin.update({ re_config: cfg } as never);
    setLicBusy(false);
    if (res.error) { flash(L('No se pudo guardar la licencia', "Couldn't save the license")); return; }
    setLicEdit(false);
    flash(L('Licencia guardada', 'License saved'));
  };

  // ---------- demo seeds (sample agency: realistic Houston content) ----------
  const now = Date.now();
  const seedProps = useMemo<MyProp[]>(() => {
    const mk = (p: Partial<MyProp> & Pick<MyProp, 'id' | 'deal' | 'ptype' | 'title' | 'price' | 'status'>): MyProp => ({
      slug: p.id, beds: null, baths: null, sqft: null, address: null, hood: null, city: 'Houston, TX',
      lat: null, lng: null, photos: [], openHouse: null, views: 0, saves: 0,
      createdAt: new Date(now - 12 * 86400e3).toISOString(),
      bizSlug: null, bizName: null, bizLogo: null, bizTier: null, bizRating: null,
      distanceM: null, totalCount: 0, leadsCount: 0, toursCount: 0,
      ...p,
    });
    return [
      mk({
        id: 'demo-p1', deal: 'venta', ptype: 'casa', title: L('Casa remodelada en Oak Forest', 'Remodeled home in Oak Forest'),
        price: 459000, beds: 3, baths: 2, sqft: 1850, address: '1418 W 43rd St', hood: 'Oak Forest',
        status: 'published', views: 342, saves: 28, leadsCount: 3, toursCount: 2,
        openHouse: new Date(now + 3 * 86400e3).toISOString(),
      }),
      mk({
        id: 'demo-p2', deal: 'renta', ptype: 'departamento', title: L('Depa moderno en Gulfton', 'Modern apartment in Gulfton'),
        price: 1350, beds: 2, baths: 1, sqft: 920, address: '6200 Rampart St', hood: 'Gulfton',
        status: 'published', views: 210, saves: 14, leadsCount: 2, toursCount: 1,
      }),
      mk({
        id: 'demo-p3', deal: 'venta', ptype: 'townhouse', title: L('Townhouse nuevo en Montrose', 'New townhouse in Montrose'),
        price: 600000, beds: 3, baths: 3, sqft: 2100, address: '2311 Converse St', hood: 'Montrose',
        status: 'draft', views: 0, saves: 0,
      }),
    ];
  }, [L, now]);
  const seedLeads = useMemo<MyLead[]>(() => [
    {
      id: 'demo-l1', propertyId: 'demo-p1', name: 'Carlos Ramírez', phone: '(832) 555-0134', email: 'carlos.r@gmail.com',
      kind: 'mensaje', stage: 'new', offerAmount: null, income: null, moveIn: null,
      message: L('¿Sigue disponible? Me interesa verla este fin de semana.', 'Is it still available? I would love to see it this weekend.'),
      createdAt: new Date(now - 20 * 60e3).toISOString(), propertyTitle: L('Casa remodelada en Oak Forest', 'Remodeled home in Oak Forest'),
    },
    {
      id: 'demo-l2', propertyId: 'demo-p1', name: 'María Torres', phone: '(713) 555-0188', email: 'maria.torres@outlook.com',
      kind: 'oferta', stage: 'offer', offerAmount: 445000, income: null, moveIn: null,
      message: L('Oferta en efectivo, cierre flexible.', 'Cash offer, flexible closing.'),
      createdAt: new Date(now - 26 * 3600e3).toISOString(), propertyTitle: L('Casa remodelada en Oak Forest', 'Remodeled home in Oak Forest'),
    },
    {
      id: 'demo-l3', propertyId: 'demo-p2', name: 'Luis Peña', phone: '(281) 555-0102', email: null,
      kind: 'solicitud', stage: 'contacted', offerAmount: null, income: '$4,200/mes', moveIn: L('En 30 días', 'Within 30 days'),
      message: L('Solicitud de renta — familia de 3.', 'Rental application — family of 3.'),
      createdAt: new Date(now - 2 * 86400e3).toISOString(), propertyTitle: L('Depa moderno en Gulfton', 'Modern apartment in Gulfton'),
    },
    {
      id: 'demo-l4', propertyId: 'demo-p2', name: 'Ana García', phone: '(832) 555-0177', email: 'ana.g@yahoo.com',
      kind: 'mensaje', stage: 'tour', offerAmount: null, income: null, moveIn: null,
      message: L('Ya agendé mi visita por video, ¡gracias!', 'Booked my video tour, thanks!'),
      createdAt: new Date(now - 4 * 86400e3).toISOString(), propertyTitle: L('Depa moderno en Gulfton', 'Modern apartment in Gulfton'),
    },
  ], [L, now]);
  const seedTours = useMemo<MyTour[]>(() => {
    const at = (days: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); };
    return [
      {
        id: 'demo-t1', propertyId: 'demo-p1', name: 'Carlos Ramírez', phone: '(832) 555-0134', mode: 'presencial',
        at: at(0, 16, 30), message: null, status: 'pendiente', createdAt: new Date(now - 3600e3).toISOString(),
        propertyTitle: L('Casa remodelada en Oak Forest', 'Remodeled home in Oak Forest'),
      },
      {
        id: 'demo-t2', propertyId: 'demo-p2', name: 'Ana García', phone: '(832) 555-0177', mode: 'video',
        at: at(1, 11, 0), message: null, status: 'confirmada', createdAt: new Date(now - 86400e3).toISOString(),
        propertyTitle: L('Depa moderno en Gulfton', 'Modern apartment in Gulfton'),
      },
      {
        id: 'demo-t3', propertyId: 'demo-p1', name: 'María Torres', phone: '(713) 555-0188', mode: 'presencial',
        at: at(3, 10, 0), message: null, status: 'pendiente', createdAt: new Date(now - 5 * 3600e3).toISOString(),
        propertyTitle: L('Casa remodelada en Oak Forest', 'Remodeled home in Oak Forest'),
      },
    ];
  }, [L, now]);

  // ---------- data: demo seeds vs real Supabase loads ----------
  const [propRows, setPropRows] = useState<MyProp[] | null>(null);
  const [leadRows, setLeadRows] = useState<MyLead[] | null>(null);
  const [tourRows, setTourRows] = useState<MyTour[] | null>(null);

  // fetchMyProperties has no owner filter (RLS also returns everyone's published
  // rows), so intersect with the signed-in owner's own property ids.
  const loadAll = async () => {
    if (!supabase || !user) return;
    const [own, props, leads, tours] = await Promise.all([
      supabase.from('properties').select('id').eq('owner_id', user.id).limit(500),
      fetchMyProperties(), fetchMyLeads(), fetchMyTours(),
    ]);
    const ids = new Set((Array.isArray(own.data) ? own.data : []).map((r) => String((r as { id: string }).id)));
    setPropRows(props.filter((p) => ids.has(p.id)));
    setLeadRows(leads);
    setTourRows(tours);
  };
  useEffect(() => {
    if (!persistable || !user) {
      setPropRows(seedProps); setLeadRows(seedLeads); setTourRows(seedTours);
      return;
    }
    let cancelled = false;
    setPropRows(null); setLeadRows(null); setTourRows(null);
    (async () => {
      if (cancelled) return;
      await loadAll();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistable, user?.id, real?.id, es]);

  const listings = propRows ?? [];
  const leads = leadRows ?? [];
  const tours = tourRows ?? [];
  const loading = persistable && propRows === null;

  // ---------- derived KPIs (REAL numbers — never fabricated for a real biz) ----------
  const activeCount = listings.filter((p) => p.status === 'published').length;
  const newLeads = leads.filter((l) => l.stage === 'new').length;
  const pendingTours = tours.filter((t) => t.status === 'pendiente').length;
  const totalViews = listings.reduce((n, p) => n + p.views, 0);

  const attention: { id: string; icon: 'tour' | 'lead'; title: string; sub: string; go: () => void }[] = [
    ...tours.filter((t) => t.status === 'pendiente').slice(0, 2).map((t) => ({
      id: `t-${t.id}`, icon: 'tour' as const,
      title: L(`Confirmar visita de ${t.name}`, `Confirm ${t.name}'s tour`),
      sub: `${fmtDay(t.at, es)} · ${fmtClock(t.at)} · ${t.propertyTitle}`,
      go: () => { setTourDay(dayKeyOf(t.at) || dayKey(new Date())); setView('tours'); },
    })),
    ...leads.filter((l) => l.stage === 'new').slice(0, 2).map((l) => ({
      id: `l-${l.id}`, icon: 'lead' as const,
      title: L(`Lead nuevo · ${l.name}`, `New lead · ${l.name}`),
      sub: `${timeAgo(l.createdAt, es)} · ${l.propertyTitle}`,
      go: () => { setLeadId(l.id); setLeadBack('list'); setView('lead'); },
    })),
  ];

  // ---------- shared UI helpers ----------
  const chip = (on: boolean) =>
    `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;
  const fieldCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary';
  const labelCls = 'mb-1.5 block text-[11px] font-extrabold text-ink-soft';

  const statusBadge = (s: ReStatus) => {
    const m = STATUS_META[s] ?? STATUS_META.draft;
    return <span className={`rounded-[7px] px-2 py-1 text-[9px] font-extrabold ${m.cls}`}>{L(m.es, m.en)}</span>;
  };
  const specs = (p: { beds: number | null; baths: number | null; sqft: number | null }) => (
    <div className="mt-1.5 flex items-center gap-3 text-[10.5px] font-bold text-ink-2">
      {p.beds != null && <span className="flex items-center gap-1"><Bed size={13} stroke={2} className="text-muted-2" />{p.beds} {L('rec', 'bd')}</span>}
      {p.baths != null && <span className="flex items-center gap-1"><Bath size={13} stroke={2} className="text-muted-2" />{p.baths} {L('baños', 'ba')}</span>}
      {p.sqft != null && <span className="flex items-center gap-1"><Ruler size={13} stroke={2} className="text-muted-2" />{p.sqft.toLocaleString()} ft²</span>}
    </div>
  );
  const thumbStyle = (p: MyProp) =>
    p.photos[0]
      ? { backgroundImage: `url(${p.photos[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: tileBg(p.deal) };

  // ==================================================================
  // WIZARD state + actions
  // ==================================================================
  const [draft, setDraft] = useState<PropDraft>(() => newPropDraft(''));
  const [wizStep, setWizStep] = useState(0);
  const [wizMax, setWizMax] = useState(0);
  const [wizBusy, setWizBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [featInput, setFeatInput] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const upD = (patch: Partial<PropDraft>) => setDraft((d) => ({ ...d, ...patch }));
  // Address autocomplete → real coords, so the listing shows on the consumer map
  // (same free Nominatim/Photon pipeline as the Events wizard).
  const [addrResults, setAddrResults] = useState<Address[]>([]);
  const [addrSearching, setAddrSearching] = useState(false);
  useEffect(() => {
    const q = draft.address.trim();
    if (draft.lat != null || q.length < 6) { setAddrResults([]); return; }
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setAddrSearching(true);
      try { setAddrResults(await searchAddress(q + (draft.city.trim() && !q.toLowerCase().includes(draft.city.split(',')[0].toLowerCase()) ? `, ${draft.city}` : ''), null, ctrl.signal)); }
      catch { /* aborted/offline */ }
      setAddrSearching(false);
    }, 450);
    return () => { ctrl.abort(); window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.address, draft.lat]);
  const chooseAddr = (a: Address) => { setAddrResults([]); upD({ address: a.formatted, lat: a.lat, lng: a.lng, ...(a.city && !draft.city.trim() ? { city: a.city } : {}) }); };

  const startWizard = () => {
    setDraft(newPropDraft(real?.city ?? 'Houston, TX'));
    setFeatInput(''); setWizStep(0); setWizMax(0); setView('wizard');
  };
  const startEdit = async (p: MyProp) => {
    const base: PropDraft = {
      ...newPropDraft(p.city ?? real?.city ?? ''),
      id: p.id, status: p.status, deal: p.deal, ptype: p.ptype,
      title: p.title, address: p.address ?? '', hood: p.hood ?? '', city: p.city ?? real?.city ?? '',
      price: p.price ? String(p.price) : '', beds: p.beds ?? 0, baths: p.baths ?? 0,
      sqft: p.sqft ? String(p.sqft) : '', photos: [...p.photos],
      openHouse: p.openHouse ? toLocalInput(p.openHouse) : '',
    };
    // Extended fields (desc/feats/policies/rental) aren't on the card — owner
    // RLS allows a direct read even for drafts.
    if (persistable && supabase) {
      const { data } = await supabase.from('properties')
        .select('desc_es,lot_sqft,year_built,hoa,feats,policies,rental')
        .eq('id', p.id).maybeSingle();
      if (data) {
        const r = data as Record<string, unknown>;
        const pol = (r.policies ?? {}) as { pets?: boolean; noCredit?: boolean; cosigner?: boolean };
        const rent = (r.rental ?? {}) as { deposit?: number; available?: string; lease?: string };
        base.desc = String(r.desc_es ?? '');
        base.lotSqft = r.lot_sqft != null ? String(r.lot_sqft) : '';
        base.year = r.year_built != null ? String(r.year_built) : '';
        base.hoa = r.hoa != null ? String(r.hoa) : '';
        base.pets = pol.pets === true; base.noCredit = pol.noCredit === true; base.cosigner = pol.cosigner === true;
        base.deposit = rent.deposit != null ? String(rent.deposit) : '';
        base.available = rent.available ?? ''; base.lease = rent.lease ?? '';
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
    const remaining = 6 - draft.photos.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, remaining));
    if (!picked.length) return;
    setPhotoBusy(true);
    try {
      const urls: string[] = [];
      for (const f of picked) {
        urls.push(!persistable || !user || !supabase ? URL.createObjectURL(f) : await uploadImage(f, user.id, 1600));
      }
      setDraft((d) => ({ ...d, photos: [...d.photos, ...urls].slice(0, 6) }));
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

  const isRent = draft.deal !== 'venta';
  const step0Ok = !!draft.title.trim() && !!draft.address.trim();
  const step1Ok = Number(draft.price) > 0;
  const stepValid = wizStep === 0 ? step0Ok : wizStep === 1 ? step1Ok : true;
  // Editing something already live keeps its status; anything else publishes.
  const finalStatus: ReStatus = draft.id && draft.status !== 'draft' ? draft.status : 'published';
  const publishReady = step0Ok && step1Ok;
  const publishBlocked = finalStatus === 'published' && !hasLicense;

  const buildPayload = (status: ReStatus): Record<string, unknown> => ({
    status, deal: draft.deal, ptype: draft.ptype,
    title: draft.title.trim(), desc_es: draft.desc.trim(),
    price: Number(draft.price) || 0,
    // beds don't apply to commercial/land; baths don't apply to land ('' → null)
    beds: draft.deal === 'comercial' || draft.ptype === 'terreno' ? '' : draft.beds,
    baths: draft.ptype === 'terreno' ? '' : draft.baths,
    sqft: draft.sqft.trim(), lot_sqft: draft.lotSqft.trim(),
    year_built: draft.year.trim(), hoa: draft.deal === 'venta' ? draft.hoa.trim() : '',
    address: draft.address.trim(), hood: draft.hood.trim(), city: draft.city.trim(),
    photos: draft.photos,
    feats: draft.feats.map((f) => ({ es: f, en: f })),
    policies: { pets: draft.pets, noCredit: draft.noCredit, cosigner: draft.cosigner },
    rental: isRent
      ? {
          ...(Number(draft.deposit) > 0 ? { deposit: Number(draft.deposit) } : {}),
          ...(draft.available ? { available: draft.available } : {}),
          ...(draft.lease.trim() ? { lease: draft.lease.trim() } : {}),
        }
      : {},
    open_house: draft.openHouse ? new Date(draft.openHouse).toISOString() : '',
    ...(draft.lat != null && draft.lng != null ? { lat: draft.lat, lng: draft.lng } : {}),
    ...(persistable && real ? { business_id: real.id } : {}),
  });

  // Save (publish or draft). Returns true only when the write truly succeeded —
  // never show success for a listing that isn't saved (Events honesty rule).
  const saveProperty = async (status: ReStatus): Promise<boolean> => {
    if (!persistable) {
      // Demo: local-only mutation, clearly sample data.
      const local: MyProp = {
        id: draft.id ?? `demo-p${Date.now()}`, slug: '',
        deal: draft.deal, ptype: draft.ptype, title: draft.title.trim() || L('Propiedad', 'Listing'),
        price: Number(draft.price) || 0,
        beds: draft.deal === 'comercial' || draft.ptype === 'terreno' ? null : draft.beds,
        baths: draft.ptype === 'terreno' ? null : draft.baths,
        sqft: draft.sqft ? Number(draft.sqft) : null,
        address: draft.address.trim() || null, hood: draft.hood.trim() || null, city: draft.city.trim() || null,
        lat: null, lng: null, photos: draft.photos,
        openHouse: draft.openHouse ? new Date(draft.openHouse).toISOString() : null,
        status, views: 0, saves: 0, createdAt: new Date().toISOString(),
        bizSlug: null, bizName: null, bizLogo: null, bizTier: null, bizRating: null,
        distanceM: null, totalCount: 0, leadsCount: 0, toursCount: 0,
      };
      setPropRows((rows) => {
        const xs = rows ?? [];
        return draft.id ? xs.map((x) => (x.id === draft.id ? { ...x, ...local, views: x.views, saves: x.saves, leadsCount: x.leadsCount, toursCount: x.toursCount } : x)) : [local, ...xs];
      });
      return true;
    }
    const res = await upsertProperty(draft.id, buildPayload(status));
    if (res.error) {
      flash(/license required/i.test(res.error)
        ? L('Agrega tu número de licencia para publicar', 'Add your license number to publish')
        : L('No se pudo guardar la propiedad. Intenta de nuevo.', "Couldn't save the listing. Try again."));
      return false;
    }
    await loadAll();
    return true;
  };

  const saveDraft = async () => {
    if (!draft.title.trim()) { flash(L('Ponle un título para guardar el borrador', 'Add a title to save the draft')); return; }
    if (draftBusy || wizBusy) return;
    setDraftBusy(true);
    const ok = await saveProperty('draft');
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
    const ok = await saveProperty(finalStatus);
    setWizBusy(false);
    if (!ok) return;
    if (draft.id && draft.status !== 'draft') { flash(L('Cambios guardados', 'Changes saved')); setView('list'); }
    else setView('success');
  };
  const wizBack = () => { if (wizStep === 0) setView('list'); else setWizStep((s) => s - 1); };

  // ---------- detail actions ----------
  const detailProp = detailId ? listings.find((p) => p.id === detailId) ?? null : null;
  const [statusBusy, setStatusBusy] = useState(false);
  const changeStatus = async (p: MyProp, status: ReStatus) => {
    if (status === p.status || statusBusy) return;
    if (!persistable) {
      setPropRows((rows) => (rows ?? []).map((x) => (x.id === p.id ? { ...x, status } : x)));
      flash(L('Estado actualizado', 'Status updated'));
      return;
    }
    setStatusBusy(true);
    const res = await upsertProperty(p.id, { status });
    setStatusBusy(false);
    if (res.error) {
      flash(/license required/i.test(res.error)
        ? L('Agrega tu número de licencia para publicar', 'Add your license number to publish')
        : L('No se pudo cambiar el estado', "Couldn't change the status"));
      return;
    }
    setPropRows((rows) => (rows ?? []).map((x) => (x.id === p.id ? { ...x, status } : x)));
    flash(L('Estado actualizado', 'Status updated'));
    void loadAll();
  };

  // ---------- lead actions ----------
  const detailLead = leadId ? leads.find((l) => l.id === leadId) ?? null : null;
  const moveStage = async (l: MyLead, stage: ReLeadStage) => {
    if (stage === l.stage) return;
    const prev = leadRows;
    setLeadRows((rows) => (rows ?? []).map((x) => (x.id === l.id ? { ...x, stage } : x)));
    if (persistable) {
      const err = await setLeadStage(l.id, stage);
      if (err) { setLeadRows(prev); flash(L('No se pudo mover el lead', "Couldn't move the lead")); return; }
    }
    flash(L('Etapa actualizada', 'Stage updated'));
  };

  // ---------- tour actions ----------
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [reschedAt, setReschedAt] = useState('');
  const tourAction = async (t: MyTour, status: ReTourStatus, at?: string) => {
    const prev = tourRows;
    setTourRows((rows) => (rows ?? []).map((x) => (x.id === t.id ? { ...x, status, at: at ?? x.at } : x)));
    if (persistable) {
      const err = await setTourStatus(t.id, status, at);
      if (err) { setTourRows(prev); flash(L('No se pudo actualizar la visita', "Couldn't update the tour")); return; }
    }
    if (at) { setTourDay(dayKeyOf(at) || tourDay); }
    setReschedId(null); setReschedAt('');
    flash(at ? L('Visita reprogramada', 'Tour rescheduled')
      : status === 'confirmada' ? L('Visita confirmada', 'Tour confirmed')
      : status === 'completada' ? L('Visita completada', 'Tour completed')
      : L('Visita actualizada', 'Tour updated'));
  };

  // ==================================================================
  // LICENSE gate UI (banner + inline form + settings row)
  // ==================================================================
  const licenseForm = (
    <div className="mt-3 flex flex-col gap-3 border-t border-hair pt-3">
      <div>
        <label className={labelCls}>{L('Número de licencia (TREC)', 'License number (TREC)')} *</label>
        <input value={licForm.license} onChange={(e) => setLicForm((f) => ({ ...f, license: e.target.value }))} placeholder="TREC #745210" className={fieldCls} />
      </div>
      <div>
        <label className={labelCls}>{L('Especialidad', 'Specialty')}</label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((s) => (
            <button key={s.id} onClick={() => setLicForm((f) => ({ ...f, specialty: s.id }))} className={chip(licForm.specialty === s.id)}>{L(s.es, s.en)}</button>
          ))}
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
        <input value={licForm.zones} onChange={(e) => setLicForm((f) => ({ ...f, zones: e.target.value }))} placeholder={L('Ej. Oak Forest, Heights, Katy', 'e.g. Oak Forest, Heights, Katy')} className={fieldCls} />
      </div>
      <div className="flex gap-2">
        <button onClick={saveLicense} disabled={licBusy} className="flex-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm disabled:opacity-50">
          {licBusy ? L('Guardando…', 'Saving…') : L('Guardar licencia', 'Save license')}
        </button>
        <button onClick={() => setLicEdit(false)} className="cursor-pointer rounded-btn border border-hair bg-white px-4 py-2.5 text-[12px] font-extrabold text-ink-soft">{L('Cancelar', 'Cancel')}</button>
      </div>
    </div>
  );
  const licenseBanner = !hasLicense && (
    <div className="rounded-card-sm bg-amber-bg p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-white"><Certificate size={18} stroke={2} className="text-amber-ink" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-extrabold text-ink">{L('Agrega tu número de licencia para publicar', 'Add your license number to publish')}</div>
          <div className="mt-0.5 text-[11.5px] font-semibold leading-snug text-amber-ink">{L('Los compradores confían en agentes verificados. Puedes guardar borradores mientras tanto.', 'Buyers trust verified agents. You can save drafts in the meantime.')}</div>
        </div>
        {!licEdit && (
          <button onClick={openLicForm} className="flex-none cursor-pointer rounded-[10px] bg-ink px-3.5 py-2 text-[12px] font-extrabold text-white">{L('Agregar', 'Add')}</button>
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
            {L('Licencia', 'License')} · {reConfig?.license}
            <Check size={14} stroke={3} className="text-green" />
          </div>
          <div className="mt-0.5 truncate text-[10.5px] font-semibold text-muted-2">
            {L(SPECIALTIES.find((s) => s.id === reConfig?.specialty)?.es ?? 'Residencial', SPECIALTIES.find((s) => s.id === reConfig?.specialty)?.en ?? 'Residential')}
            {reConfig?.langs ? ` · ${reConfig.langs}` : ''}{reConfig?.zones ? ` · ${reConfig.zones}` : ''}
          </div>
        </div>
        {!licEdit && <button onClick={openLicForm} className="flex-none cursor-pointer rounded-btn border border-hair bg-white px-3.5 py-2 text-[11.5px] font-extrabold text-ink">{L('Editar', 'Edit')}</button>}
      </div>
      {licEdit && licenseForm}
    </div>
  );

  // ==================================================================
  // LIST (default view — Resumen)
  // ==================================================================
  const kpis: { label: string; value: string; onTap?: () => void }[] = [
    { label: L('Listados activos', 'Active listings'), value: String(activeCount), onTap: () => setListFilter('published') },
    { label: L('Leads nuevos', 'New leads'), value: String(newLeads), onTap: () => { setLeadFilter('new'); setView('leads'); } },
    { label: L('Tours pendientes', 'Pending tours'), value: String(pendingTours), onTap: () => setView('tours') },
    { label: L('Vistas totales', 'Total views'), value: totalViews.toLocaleString() },
  ];

  const listFilters: { id: 'all' | ReStatus; es: string; en: string }[] = [
    { id: 'all', es: 'Todos', en: 'All' },
    { id: 'published', es: 'Publicados', en: 'Published' },
    { id: 'pending', es: 'En trámite', en: 'Pending' },
    { id: 'rented', es: 'Rentados', en: 'Rented' },
    { id: 'sold', es: 'Vendidos', en: 'Sold' },
    { id: 'draft', es: 'Borradores', en: 'Drafts' },
  ];
  const filteredProps = listFilter === 'all' ? listings : listings.filter((p) => p.status === listFilter);

  const propCard = (p: MyProp) => (
    <button key={p.id} onClick={() => { setDetailId(p.id); setView('detail'); }} className="cursor-pointer overflow-hidden rounded-card-sm border border-hair bg-white text-left shadow-card">
      <div className="flex gap-3 p-3">
        <div className="relative h-[84px] w-[84px] flex-none overflow-hidden rounded-tile" style={thumbStyle(p)}>
          <span className="absolute left-1.5 top-1.5">{statusBadge(p.status)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold text-ink">{fmtPrice(p.price, p.deal, es)}</div>
          <div className="mt-0.5 truncate text-[12px] font-bold text-ink-soft">{p.title}</div>
          <div className="mt-0.5 truncate text-[10.5px] font-semibold text-muted-2">
            {p.address ?? '—'}{p.hood ? ` · ${p.hood}` : ''}
          </div>
          {specs(p)}
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-hair px-3 py-2 text-[10px] font-bold text-muted-2">
        <span className="flex items-center gap-1"><Eye size={12} stroke={2.2} />{p.views} {L('vistas', 'views')}</span>
        <span className="flex items-center gap-1"><Heart size={12} stroke={2.2} />{p.saves}</span>
        <span className="flex items-center gap-1"><Users size={12} stroke={2.2} />{p.leadsCount} leads</span>
        <span className="flex items-center gap-1"><CalendarEvent size={12} stroke={2.2} />{p.toursCount} {L('visitas', 'tours')}</span>
      </div>
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
              <button key={a.id} onClick={a.go} className={`flex cursor-pointer items-center gap-2.5 py-2.5 text-left ${i < attention.length - 1 ? 'border-b border-hair' : ''}`}>
                <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] ${a.icon === 'tour' ? 'bg-amber-bg' : 'bg-pink-bg'}`}>
                  {a.icon === 'tour' ? <CalendarEvent size={15} stroke={2.2} className="text-amber-ink" /> : <Users size={15} stroke={2.2} className="text-pink-dark" />}
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

      {/* quick nav: pipeline + agenda */}
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={() => { setLeadFilter('all'); setView('leads'); }} className={`${cardCls} flex cursor-pointer items-center gap-2.5 p-3 text-left`}>
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-lilac"><Users size={17} stroke={2.2} className="text-primary-dark" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-extrabold text-ink">{L('Leads', 'Leads')}</span>
            <span className="block text-[10px] font-semibold text-muted-2">{loading ? '…' : `${leads.length} ${L('en tu pipeline', 'in your pipeline')}`}</span>
          </span>
          <ChevronRight size={15} stroke={2.4} className="flex-none text-muted-2" />
        </button>
        <button onClick={() => setView('tours')} className={`${cardCls} flex cursor-pointer items-center gap-2.5 p-3 text-left`}>
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-blue-bg"><CalendarEvent size={17} stroke={2.2} className="text-blue" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-extrabold text-ink">{L('Agenda', 'Calendar')}</span>
            <span className="block text-[10px] font-semibold text-muted-2">{loading ? '…' : `${tours.length} ${L('visitas', 'tours')}`}</span>
          </span>
          <ChevronRight size={15} stroke={2.4} className="flex-none text-muted-2" />
        </button>
      </div>

      {/* Listings */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-[15px] font-extrabold text-ink">{L('Mis listados', 'My listings')}</div>
          <button onClick={startWizard} className="flex cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-3.5 py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm">
            <Plus size={14} stroke={2.6} />{L('Publicar propiedad', 'Publish listing')}
          </button>
        </div>
        <div className="no-scrollbar mb-3 flex min-w-0 gap-2 overflow-x-auto pb-0.5">
          {listFilters.map((f) => <button key={f.id} onClick={() => setListFilter(f.id)} className={chip(listFilter === f.id)}>{L(f.es, f.en)}</button>)}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className={`${cardCls} h-[132px] animate-pulse bg-lilac-2`} />
            ))}
          </div>
        ) : filteredProps.length === 0 ? (
          <div className="rounded-card-sm border border-hair bg-white px-6 py-12 text-center shadow-card">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-tile bg-lilac-3"><Home size={22} stroke={2} className="text-primary-dark" /></span>
            <div className="text-[13.5px] font-extrabold text-ink">
              {listings.length === 0 ? L('Aún no tienes propiedades', 'No listings yet') : L('Nada con este filtro', 'Nothing with this filter')}
            </div>
            <div className="mt-1 text-[11.5px] font-medium text-muted-2">
              {listings.length === 0
                ? L('Publica tu primera propiedad y llega a compradores cerca de ti.', 'Publish your first listing and reach buyers near you.')
                : L('Cambia el filtro o publica una propiedad nueva.', 'Change the filter or publish a new listing.')}
            </div>
            {listings.length === 0 && (
              <button onClick={startWizard} className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-4 py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm">
                <Plus size={15} stroke={2.6} />{L('Publicar propiedad', 'Publish listing')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{filteredProps.map(propCard)}</div>
        )}
      </div>

      {licenseCard}
    </div>
  );

  // ==================================================================
  // LISTING DETAIL
  // ==================================================================
  const detailPage = detailProp && (() => {
    const p = detailProp;
    const pLeads = leads.filter((l) => l.propertyId === p.id);
    const pTours = tours.filter((t) => t.propertyId === p.id);
    const perf = [
      { Icon: Eye, label: L('Vistas', 'Views'), value: p.views.toLocaleString(), bg: 'bg-lilac', c: 'text-primary-dark' },
      { Icon: Heart, label: L('Guardados', 'Saves'), value: String(p.saves), bg: 'bg-pink-bg', c: 'text-pink-dark' },
      { Icon: Users, label: L('Leads', 'Leads'), value: String(p.leadsCount || pLeads.length), bg: 'bg-green-bg', c: 'text-green-dark' },
      { Icon: CalendarEvent, label: L('Visitas', 'Tours'), value: String(p.toursCount || pTours.length), bg: 'bg-blue-bg', c: 'text-blue' },
    ];
    return (
      <ModulePage
        title={p.title}
        subtitle={L('Detalle del listado', 'Listing detail')}
        onBack={() => setView('list')}
        maxW={760}
        action={
          <button onClick={() => void startEdit(p)} className="cursor-pointer rounded-btn border border-hair bg-white px-3.5 py-2 text-[12px] font-extrabold text-ink">{L('Editar', 'Edit')}</button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-card-sm border border-hair bg-white shadow-card">
            <div className="relative h-[150px]" style={thumbStyle(p)}>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 40%,rgba(0,0,0,.5))' }} />
              <span className="absolute left-2.5 top-2.5">{statusBadge(p.status)}</span>
              <div className="absolute bottom-2.5 left-3 right-3">
                <div className="text-[19px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{fmtPriceFull(p.price, p.deal, es)}</div>
                <div className="truncate text-[11px] font-semibold text-white/85">{p.address ?? '—'}{p.hood ? ` · ${p.hood}` : ''}{p.city ? ` · ${p.city}` : ''}</div>
              </div>
            </div>
            <div className="p-3.5">{specs(p)}</div>
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
            <div className="mb-2 text-[12.5px] font-extrabold text-ink">{L('Estado del listado', 'Listing status')}</div>
            <div className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-0.5">
              {SETTABLE_STATUS.map((s) => (
                <button key={s} onClick={() => void changeStatus(p, s)} disabled={statusBusy} className={`${chip(p.status === s)} disabled:opacity-60`}>
                  {L(STATUS_META[s].es, STATUS_META[s].en)}
                </button>
              ))}
            </div>
            {!hasLicense && p.status !== 'published' && (
              <div className="mt-2 text-[10px] font-semibold text-amber-ink">{L('Para publicar necesitas tu número de licencia (arriba en Bienes Raíces).', 'Publishing requires your license number (top of Real Estate).')}</div>
            )}
          </div>

          {/* leads for this property */}
          <div className={`${cardCls} p-3.5`}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[12.5px] font-extrabold text-ink">{L('Leads de esta propiedad', 'Leads for this listing')}</div>
              {pLeads.length > 0 && (
                <button onClick={() => { setLeadFilter('all'); setView('leads'); }} className="cursor-pointer text-[11px] font-extrabold text-primary-dark">{L('Ver todos', 'See all')}</button>
              )}
            </div>
            {pLeads.length === 0 ? (
              <div className="py-4 text-center text-[11.5px] font-semibold text-muted-2">{L('Todavía no hay leads para esta propiedad.', 'No leads for this listing yet.')}</div>
            ) : (
              <div className="flex flex-col">
                {pLeads.slice(0, 5).map((l, i) => {
                  const st = stageMeta(l.stage);
                  return (
                    <button key={l.id} onClick={() => { setLeadId(l.id); setLeadBack('detail'); setView('lead'); }} className={`flex cursor-pointer items-center gap-2.5 py-2.5 text-left ${i < Math.min(pLeads.length, 5) - 1 ? 'border-b border-hair' : ''}`}>
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
            <button onClick={() => void startEdit(p)} className="flex-1 cursor-pointer rounded-btn-lg bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm">{L('Editar propiedad', 'Edit listing')}</button>
            <a href={`/bienes-raices?p=${p.slug}`} target="_blank" rel="noreferrer" className="flex flex-none cursor-pointer items-center gap-1.5 rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3 text-[13px] font-extrabold text-ink">
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
  const leadFilters: { id: 'all' | ReLeadStage; es: string; en: string }[] = [
    { id: 'all', es: 'Todos', en: 'All' },
    { id: 'new', es: 'Nuevos', en: 'New' },
    { id: 'contacted', es: 'Contactados', en: 'Contacted' },
    { id: 'tour', es: 'Con visita', en: 'Tours' },
    { id: 'offer', es: 'Oferta', en: 'Offers' },
    { id: 'closed', es: 'Cerrados', en: 'Closed' },
  ];
  const filteredLeads = leadFilter === 'all' ? leads : leads.filter((l) => l.stage === leadFilter);
  const kindPill = (l: MyLead) => {
    const [label, cls] =
      l.kind === 'oferta'
        ? [`${L('Oferta', 'Offer')} · $${(l.offerAmount ?? 0).toLocaleString()}`, 'bg-amber-bg text-amber-ink']
        : l.kind === 'solicitud'
          ? [L('Solicitud', 'Application'), 'bg-blue-bg text-blue']
          : [L('Mensaje', 'Message'), 'bg-lilac-2 text-ink-2'];
    return <span className={`rounded-md px-2 py-1 text-[9px] font-extrabold ${cls}`}>{label}</span>;
  };

  const leadsPage = (
    <ModulePage title={L('Leads y consultas', 'Leads & inquiries')} subtitle={L('Tu pipeline de clientes', 'Your client pipeline')} onBack={() => setView('list')} maxW={760}>
      <div className="no-scrollbar mb-3 flex min-w-0 gap-2 overflow-x-auto pb-0.5">
        {leadFilters.map((f) => <button key={f.id} onClick={() => setLeadFilter(f.id)} className={chip(leadFilter === f.id)}>{L(f.es, f.en)}</button>)}
      </div>
      {persistable && leadRows === null ? (
        <div className="grid gap-2.5">{[0, 1, 2].map((i) => <div key={i} className={`${cardCls} h-[92px] animate-pulse bg-lilac-2`} />)}</div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-card-sm border border-hair bg-white px-6 py-12 text-center shadow-card">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-tile bg-lilac-3"><Users size={22} stroke={2} className="text-primary-dark" /></span>
          <div className="text-[13.5px] font-extrabold text-ink">{leads.length === 0 ? L('Aún no tienes leads', 'No leads yet') : L('Nada en esta etapa', 'Nothing in this stage')}</div>
          <div className="mt-1 text-[11.5px] font-medium text-muted-2">
            {leads.length === 0
              ? L('Cuando alguien pregunte, haga una oferta o aplique a una propiedad tuya, aparecerá aquí.', 'When someone asks, makes an offer or applies to one of your listings, it shows here.')
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
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      {kindPill(l)}
                      <span className={`rounded-md px-2 py-1 text-[9px] font-extrabold ${st.cls}`}>{L(st.es, st.en)}</span>
                    </span>
                    <span className="mt-1 block truncate text-[10.5px] font-semibold text-muted-2">{l.propertyTitle}</span>
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
                  <button onClick={() => { setLeadId(l.id); setLeadBack('leads'); setView('lead'); }} className="flex-1 cursor-pointer rounded-btn bg-primary py-2 text-[11px] font-extrabold text-white">{L('Abrir', 'Open')}</button>
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
    const info: [string, string][] = [
      [L('Propiedad', 'Property'), l.propertyTitle || '—'],
      ...(l.offerAmount != null ? [[L('Oferta', 'Offer'), `$${l.offerAmount.toLocaleString()}`] as [string, string]] : []),
      ...(l.income ? [[L('Ingresos', 'Income'), l.income] as [string, string]] : []),
      ...(l.moveIn ? [[L('Fecha de mudanza', 'Move-in'), l.moveIn] as [string, string]] : []),
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
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
            {info.map(([k, v], i) => (
              <div key={k} className={`flex items-center justify-between gap-3 py-2.5 ${i < info.length - 1 ? 'border-b border-hair' : ''}`}>
                <span className="flex-none text-[10.5px] font-semibold text-muted-2">{k}</span>
                <span className="min-w-0 truncate text-[11.5px] font-bold text-ink">{v}</span>
              </div>
            ))}
          </div>

          <div className={`${cardCls} p-3.5`}>
            <div className="mb-2 text-[12.5px] font-extrabold text-ink">{L('Mover a etapa', 'Move to stage')}</div>
            <div className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-0.5">
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
  // TOURS agenda
  // ==================================================================
  const agendaDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  }), []);
  const dayTours = tours
    .filter((t) => dayKeyOf(t.at) === tourDay)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const toursPage = (
    <ModulePage title={L('Agenda de visitas', 'Tour calendar')} subtitle={L('Confirma y organiza tus tours', 'Confirm and organize your tours')} onBack={() => setView('list')} maxW={760}>
      <div className="no-scrollbar mb-4 flex min-w-0 gap-2 overflow-x-auto pb-0.5">
        {agendaDays.map((d) => {
          const key = dayKey(d);
          const on = key === tourDay;
          const has = tours.some((t) => dayKeyOf(t.at) === key);
          return (
            <button key={key} onClick={() => setTourDay(key)} className={`flex w-14 flex-none cursor-pointer flex-col items-center rounded-btn-lg py-2.5 ${on ? 'bg-primary text-white shadow-cta-sm' : 'border border-lilac-line bg-white text-ink'}`}>
              <span className={`text-[9px] font-extrabold uppercase ${on ? 'text-white/80' : 'text-muted-2'}`}>{(es ? DOW_ES : DOW_EN)[d.getDay()]}</span>
              <span className="text-[15px] font-extrabold leading-tight">{d.getDate()}</span>
              <span className={`mt-0.5 h-1 w-1 rounded-full ${has ? (on ? 'bg-white' : 'bg-primary') : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>

      {persistable && tourRows === null ? (
        <div className="grid gap-2.5">{[0, 1].map((i) => <div key={i} className={`${cardCls} h-[92px] animate-pulse bg-lilac-2`} />)}</div>
      ) : dayTours.length === 0 ? (
        <div className="rounded-card-sm border border-hair bg-white px-6 py-12 text-center shadow-card">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-tile bg-lilac-3"><CalendarEvent size={22} stroke={2} className="text-primary-dark" /></span>
          <div className="text-[13.5px] font-extrabold text-ink">{L('Sin visitas este día', 'No tours this day')}</div>
          <div className="mt-1 text-[11.5px] font-medium text-muted-2">{L('Los tours que agenden tus clientes aparecerán aquí.', 'Tours your clients book will show here.')}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {dayTours.map((t) => {
            const st = TOUR_STATUS[t.status] ?? TOUR_STATUS.pendiente;
            return (
              <div key={t.id} className={`${cardCls} p-3.5`}>
                <div className="flex items-start gap-3">
                  <div className="flex-none text-center">
                    <div className="text-[14px] font-extrabold text-ink">{fmtClock(t.at)}</div>
                    <div className="text-[9px] font-bold text-muted-2">45 min</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 truncate text-[12.5px] font-extrabold text-ink">{t.name}</span>
                      <span className={`flex-none rounded-md px-2 py-1 text-[9px] font-extrabold ${st.cls}`}>{L(st.es, st.en)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[10.5px] font-semibold text-muted-2">{t.propertyTitle}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[9.5px] font-extrabold ${t.mode === 'video' ? 'bg-blue-bg text-blue' : 'bg-lilac text-primary-dark'}`}>
                        {t.mode === 'video' ? <Video size={11} stroke={2.4} /> : <MapPin size={11} stroke={2.4} />}
                        {t.mode === 'video' ? L('Video', 'Video') : L('Presencial', 'In person')}
                      </span>
                      {t.phone && <a href={`tel:${t.phone}`} className="flex items-center gap-1 rounded-full bg-lilac-2 px-2.5 py-1 text-[9.5px] font-extrabold text-ink-soft"><Phone size={11} stroke={2.4} />{L('Llamar', 'Call')}</a>}
                    </div>
                  </div>
                </div>

                {(t.status === 'pendiente' || t.status === 'confirmada') && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-hair pt-3">
                    {t.status === 'pendiente' && (
                      <button onClick={() => void tourAction(t, 'confirmada')} className="flex-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[11.5px] font-extrabold text-white shadow-cta-sm">{L('Confirmar', 'Confirm')}</button>
                    )}
                    {t.status === 'confirmada' && (
                      <button onClick={() => void tourAction(t, 'completada')} className="flex-1 cursor-pointer rounded-btn bg-green py-2.5 text-[11.5px] font-extrabold text-white">{L('Completada', 'Completed')}</button>
                    )}
                    <button onClick={() => { setReschedId(reschedId === t.id ? null : t.id); setReschedAt(toLocalInput(t.at)); }} className="flex-1 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white py-2.5 text-[11.5px] font-extrabold text-ink">{L('Reprogramar', 'Reschedule')}</button>
                  </div>
                )}
                {reschedId === t.id && (
                  <div className="mt-2.5 rounded-btn-lg border-[1.5px] border-primary bg-lilac-3 p-3">
                    <label className={labelCls}>{L('Nueva fecha y hora', 'New date & time')}</label>
                    <input type="datetime-local" value={reschedAt} onChange={(e) => setReschedAt(e.target.value)} className={fieldCls} />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => { if (!reschedAt) return; void tourAction(t, 'pendiente', new Date(reschedAt).toISOString()); }}
                        disabled={!reschedAt}
                        className="flex-1 cursor-pointer rounded-btn bg-primary py-2.5 text-[11.5px] font-extrabold text-white disabled:opacity-40"
                      >
                        {L('Proponer horario', 'Propose time')}
                      </button>
                      <button onClick={() => { setReschedId(null); setReschedAt(''); }} className="cursor-pointer rounded-btn border border-hair bg-white px-4 py-2.5 text-[11.5px] font-extrabold text-ink-soft">{L('Cancelar', 'Cancel')}</button>
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
  // WIZARD UI (Tipo → Detalles → Fotos → Revisar)
  // ==================================================================
  const stepDefs: string[] = [L('Tipo', 'Type'), L('Detalles', 'Details'), L('Fotos', 'Photos'), L('Revisar', 'Review')];
  const dealLabel = (d: ReDeal) => { const x = RE_DEALS.find((r) => r.id === d); return x ? L(x.es, x.en) : d; };
  const ptypeLabel = (t: RePtype) => { const x = RE_TYPES.find((r) => r.id === t); return x ? L(x.es, x.en) : t; };

  const stepper = (label: string, val: number, set: (n: number) => void, step = 1, max = 12) => (
    <div className="flex-1">
      <label className={labelCls}>{label}</label>
      <div className="flex items-center justify-between rounded-field border-[1.5px] border-lilac-line bg-white px-2 py-1.5">
        <button onClick={() => set(Math.max(0, Math.round((val - step) * 10) / 10))} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[9px] bg-lilac-2 text-[15px] font-extrabold text-ink" aria-label={L('Menos', 'Less')}>−</button>
        <span className="text-[14px] font-extrabold text-ink">{val}</span>
        <button onClick={() => set(Math.min(max, Math.round((val + step) * 10) / 10))} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[9px] bg-lilac-2 text-[15px] font-extrabold text-ink" aria-label={L('Más', 'More')}>+</button>
      </div>
    </div>
  );

  const wizStep0 = (
    <div className="flex flex-col gap-3.5">
      <div>
        <label className={labelCls}>{L('Operación', 'Deal type')} *</label>
        <div className="grid grid-cols-4 gap-1.5 rounded-btn-lg bg-lilac-2 p-1">
          {RE_DEALS.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                const allowed = PTYPE_FOR_DEAL[d.id];
                upD({ deal: d.id, ptype: allowed.includes(draft.ptype) ? draft.ptype : allowed[0] });
              }}
              className={`cursor-pointer rounded-btn py-2 text-[11px] font-extrabold ${draft.deal === d.id ? 'bg-white text-primary-dark shadow-card' : 'text-ink-2'}`}
            >
              {L(d.es, d.en)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>{L('Tipo de propiedad', 'Property type')} *</label>
        <div className="flex flex-wrap gap-2">
          {PTYPE_FOR_DEAL[draft.deal].map((t) => (
            <button key={t} onClick={() => upD({ ptype: t })} className={chip(draft.ptype === t)}>{ptypeLabel(t)}</button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>{L('Título del anuncio', 'Listing title')} *</label>
        <input value={draft.title} onChange={(e) => upD({ title: e.target.value })} placeholder={L('Ej: Casa remodelada en Oak Forest', 'e.g. Remodeled home in Oak Forest')} className={fieldCls} />
      </div>
      <div>
        <label className={labelCls}>{L('Dirección', 'Address')} *</label>
        <div className="relative">
          <input value={draft.address} onChange={(e) => upD({ address: e.target.value, lat: null, lng: null })} placeholder={L('Calle, número, ciudad', 'Street, number, city')} className={fieldCls} />
          {addrResults.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-[200px] w-full overflow-y-auto rounded-field border border-hair-strong bg-white p-1 shadow-pop">
              {addrResults.map((a, i) => (
                <button key={`${a.formatted}-${i}`} type="button" onClick={() => chooseAddr(a)} className="w-full cursor-pointer rounded-field p-2.5 text-left text-[12.5px] font-bold text-ink-soft hover:bg-app">
                  {a.formatted}
                  {a.verified && <span className="ml-1.5 rounded bg-green-bg px-1.5 py-px text-[9px] font-extrabold text-green-dark">✓ {L('Verificada', 'Verified')}</span>}
                </button>
              ))}
            </div>
          )}
          <div className="mt-1 text-[10px] font-semibold text-muted-2">
            {addrSearching ? L('Buscando dirección…', 'Searching address…')
              : draft.lat != null ? L('📍 Ubicación fijada — saldrá en el mapa del cliente.', '📍 Location set — it will show on the buyer map.')
              : L('Elige una sugerencia para fijar el mapa.', 'Pick a suggestion to pin the map.')}
          </div>
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="flex-1">
          <label className={labelCls}>{L('Colonia / zona', 'Neighborhood')}</label>
          <input value={draft.hood} onChange={(e) => upD({ hood: e.target.value })} placeholder={L('Ej. Oak Forest', 'e.g. Oak Forest')} className={fieldCls} />
        </div>
        <div className="flex-1">
          <label className={labelCls}>{L('Ciudad', 'City')}</label>
          <input value={draft.city} onChange={(e) => upD({ city: e.target.value })} placeholder="Houston, TX" className={fieldCls} />
        </div>
      </div>
    </div>
  );

  const wizStep1 = (
    <div className="flex flex-col gap-3.5">
      <div>
        <label className={labelCls}>{draft.deal === 'venta' ? L('Precio de venta', 'Sale price') : L('Renta mensual', 'Monthly rent')} *</label>
        <div className="flex items-center gap-1.5 rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 focus-within:border-primary">
          <span className="text-[18px] font-extrabold text-muted-2">$</span>
          <input value={draft.price} onChange={(e) => upD({ price: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder={draft.deal === 'venta' ? '450,000' : '1,350'} className="min-w-0 flex-1 bg-transparent py-3 text-[19px] font-extrabold text-ink outline-none placeholder:text-muted-faint" />
          {draft.deal !== 'venta' && <span className="flex-none text-[12px] font-extrabold text-muted-2">{L('/mes', '/mo')}</span>}
        </div>
      </div>

      {draft.ptype !== 'terreno' && (
        <div className="flex gap-2.5">
          {draft.deal !== 'comercial' && stepper(L('Recámaras', 'Beds'), draft.beds, (n) => upD({ beds: n }))}
          {stepper(L('Baños', 'Baths'), draft.baths, (n) => upD({ baths: n }), 0.5, 10)}
        </div>
      )}
      <div className="flex gap-2.5">
        <div className="flex-1">
          <label className={labelCls}>{L('Superficie (ft²)', 'Area (ft²)')}</label>
          <input value={draft.sqft} onChange={(e) => upD({ sqft: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="1,850" className={fieldCls} />
        </div>
        {draft.deal === 'venta' ? (
          <div className="flex-1">
            <label className={labelCls}>{L('Terreno (ft²)', 'Lot (ft²)')}</label>
            <input value={draft.lotSqft} onChange={(e) => upD({ lotSqft: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="6,000" className={fieldCls} />
          </div>
        ) : (
          <div className="flex-1">
            <label className={labelCls}>{L('Año', 'Year built')}</label>
            <input value={draft.year} onChange={(e) => upD({ year: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="2005" className={fieldCls} />
          </div>
        )}
      </div>
      {draft.deal === 'venta' && (
        <div className="flex gap-2.5">
          <div className="flex-1">
            <label className={labelCls}>{L('Año', 'Year built')}</label>
            <input value={draft.year} onChange={(e) => upD({ year: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="2005" className={fieldCls} />
          </div>
          <div className="flex-1">
            <label className={labelCls}>{L('HOA $/mes', 'HOA $/mo')}</label>
            <input value={draft.hoa} onChange={(e) => upD({ hoa: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="0" className={fieldCls} />
          </div>
        </div>
      )}

      {isRent && (
        <div className="rounded-btn-lg bg-lilac-3 p-3">
          <div className="mb-2 text-[11.5px] font-extrabold text-ink">{L('Condiciones de renta', 'Rental terms')}</div>
          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className={labelCls}>{L('Depósito $', 'Deposit $')}</label>
              <input value={draft.deposit} onChange={(e) => upD({ deposit: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="1,350" className={fieldCls} />
            </div>
            <div className="flex-1">
              <label className={labelCls}>{L('Disponible desde', 'Available from')}</label>
              <input type="date" value={draft.available} onChange={(e) => upD({ available: e.target.value })} className={fieldCls} />
            </div>
          </div>
          <div className="mt-2.5">
            <label className={labelCls}>{L('Contrato', 'Lease')}</label>
            <input value={draft.lease} onChange={(e) => upD({ lease: e.target.value })} placeholder={L('Ej. 12 meses', 'e.g. 12 months')} className={fieldCls} />
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>{L('Descripción', 'Description')}</label>
        <textarea value={draft.desc} onChange={(e) => upD({ desc: e.target.value })} rows={3} placeholder={L('Describe lo mejor de la propiedad…', 'Describe the best of the property…')} className={`${fieldCls} resize-none text-[12px] font-medium leading-relaxed`} />
      </div>

      <div>
        <label className={labelCls}>{L('Políticas', 'Policies')}</label>
        <div className="flex flex-wrap gap-2">
          {([
            ['pets', draft.pets, L('Mascotas OK', 'Pets OK')],
            ['noCredit', draft.noCredit, L('Sin verificación de crédito', 'No credit check')],
            ['cosigner', draft.cosigner, L('Acepta aval', 'Cosigner accepted')],
          ] as const).map(([k, on, lb]) => (
            <button key={k} onClick={() => upD({ [k]: !on } as Partial<PropDraft>)} className={chip(on)}>{on ? '✓ ' : ''}{lb}</button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>{L('Casa abierta (opcional)', 'Open house (optional)')}</label>
        <input type="datetime-local" value={draft.openHouse} onChange={(e) => upD({ openHouse: e.target.value })} className={fieldCls} />
      </div>

      <div>
        <label className={labelCls}>{L('Características', 'Features')}</label>
        {draft.feats.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {draft.feats.map((f) => (
              <span key={f} className="flex items-center gap-1.5 rounded-full bg-lilac px-3 py-1.5 text-[11px] font-extrabold text-primary-dark">
                {f}
                <button onClick={() => upD({ feats: draft.feats.filter((x) => x !== f) })} className="cursor-pointer" aria-label={L('Quitar', 'Remove')}><X size={12} stroke={2.6} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input value={featInput} onChange={(e) => setFeatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeat(); } }} placeholder={L('Ej. Cocina remodelada', 'e.g. Remodeled kitchen')} className={`${fieldCls} flex-1`} />
          <button onClick={addFeat} className="flex-none cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 px-4 text-[12px] font-extrabold text-primary-dark">+ {L('Agregar', 'Add')}</button>
        </div>
      </div>
    </div>
  );

  const wizStep2 = (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-medium leading-relaxed text-muted">{L('Agrega al menos 1 foto (máx. 6). La primera es la portada.', 'Add at least 1 photo (max 6). The first is the cover.')}</p>
      <input ref={photoInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = e.target.files; void addPhotos(f); e.target.value = ''; }} />
      <div className="grid grid-cols-3 gap-2">
        {draft.photos.map((url, i) => (
          <div key={url} className="relative aspect-square overflow-hidden rounded-tile border border-hair" style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-0.5 text-[8.5px] font-extrabold text-white">{L('Portada', 'Cover')}</span>}
            <button onClick={() => removePhoto(url)} className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white" aria-label={L('Quitar foto', 'Remove photo')}>
              <Trash2 size={12} stroke={2.2} />
            </button>
          </div>
        ))}
        {draft.photos.length < 6 && (
          <button onClick={() => photoInputRef.current?.click()} disabled={photoBusy} className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-tile border-[1.5px] border-dashed border-lilac-ring bg-lilac-3 text-primary-dark disabled:opacity-60">
            <ImagePlus size={20} stroke={2} />
            <span className="text-[10px] font-extrabold">{photoBusy ? L('Subiendo…', 'Uploading…') : L('Agregar foto', 'Add photo')}</span>
          </button>
        )}
      </div>
    </div>
  );

  const reviewRows: [string, string, boolean][] = [
    [L('Operación', 'Deal'), `${dealLabel(draft.deal)} · ${ptypeLabel(draft.ptype)}`, true],
    [L('Título', 'Title'), draft.title.trim() || '—', !!draft.title.trim()],
    [L('Precio', 'Price'), Number(draft.price) > 0 ? fmtPriceFull(Number(draft.price), draft.deal, es) : '—', Number(draft.price) > 0],
    [L('Dirección', 'Address'), draft.address.trim() || '—', !!draft.address.trim()],
    [L('Fotos', 'Photos'), `${draft.photos.length} ${L('de', 'of')} 6`, draft.photos.length >= 1],
    ...(draft.openHouse ? [[L('Casa abierta', 'Open house'), `${fmtDay(new Date(draft.openHouse).toISOString(), es)} · ${fmtClock(new Date(draft.openHouse).toISOString())}`, true] as [string, string, boolean]] : []),
  ];
  const wizStep3 = (
    <div className="flex flex-col gap-3.5">
      {/* live preview */}
      <div className="overflow-hidden rounded-card-sm border border-hair bg-white shadow-card">
        <div className="relative h-[120px]" style={draft.photos[0] ? { backgroundImage: `url(${draft.photos[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: tileBg(draft.deal) }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 40%,rgba(0,0,0,.5))' }} />
          <span className="absolute left-2.5 top-2.5 rounded-[7px] bg-white px-2 py-1 text-[9px] font-extrabold text-primary-dark">{dealLabel(draft.deal)}</span>
          <div className="absolute bottom-2.5 left-3 right-3">
            <div className="text-[17px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{Number(draft.price) > 0 ? fmtPriceFull(Number(draft.price), draft.deal, es) : L('Precio por definir', 'Price TBD')}</div>
            <div className="truncate text-[10.5px] font-semibold text-white/85">{draft.title.trim() || L('Título del anuncio', 'Listing title')}</div>
          </div>
        </div>
        <div className="p-3">
          <div className="truncate text-[10.5px] font-semibold text-muted-2">{draft.address.trim() || '—'}{draft.hood.trim() ? ` · ${draft.hood.trim()}` : ''}</div>
          {draft.ptype !== 'terreno' && specs({ beds: draft.deal === 'comercial' ? null : draft.beds, baths: draft.baths, sqft: draft.sqft ? Number(draft.sqft) : null })}
        </div>
      </div>

      <div className="overflow-hidden rounded-field border border-hair bg-white">
        {reviewRows.map(([k, v, ok], i) => (
          <div key={k} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < reviewRows.length - 1 ? 'border-b border-hair' : ''}`}>
            <span className="w-[84px] flex-none text-[10.5px] font-semibold text-muted-2">{k}</span>
            <span className={`min-w-0 flex-1 truncate text-[11.5px] font-bold ${ok ? 'text-ink' : 'text-muted-faint'}`}>{v}</span>
            {ok && <Check size={13} stroke={3} className="flex-none text-green" />}
          </div>
        ))}
      </div>

      {publishBlocked ? (
        <div className="flex items-start gap-2.5 rounded-field bg-amber-bg p-3">
          <Certificate size={16} stroke={2.2} className="mt-0.5 flex-none text-amber-ink" />
          <div className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-amber-ink">
            {L('Agrega tu número de licencia para publicar (arriba en Bienes Raíces). Mientras tanto puedes guardar como borrador.', 'Add your license number to publish (top of Real Estate). Meanwhile you can save it as a draft.')}
          </div>
        </div>
      ) : (
        <p className="text-[10.5px] font-medium leading-snug text-muted-2">
          {L('Al publicar, tu propiedad aparecerá en la búsqueda y el mapa de ToLatino.', 'On publish, your listing appears in ToLatino search and map.')}
        </p>
      )}
    </div>
  );

  const finalLabel = draft.id && draft.status !== 'draft' ? L('Guardar cambios', 'Save changes') : L('Publicar', 'Publish');
  const wizardPage = (
    <ModulePage
      title={draft.id ? L('Editar propiedad', 'Edit listing') : L('Publicar propiedad', 'Publish listing')}
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
      <div className="no-scrollbar mb-4 flex min-w-0 gap-2 overflow-x-auto pb-0.5">
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
          {wizStep === 0 ? L('¿Qué vas a publicar?', 'What are you publishing?')
            : wizStep === 1 ? L('Detalles de la propiedad', 'Property details')
            : wizStep === 2 ? L('Fotos de la propiedad', 'Property photos')
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
    <ModulePage title={L('¡Propiedad publicada!', 'Listing published!')} onBack={() => setView('list')}>
      <div className="flex flex-col items-center px-2 pb-8 pt-6 text-center">
        <div className="mb-3.5 flex h-16 w-16 items-center justify-center rounded-card bg-green-bg">
          <Check size={32} stroke={2.6} className="text-green" />
        </div>
        <div className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{draft.title.trim() || L('Tu propiedad', 'Your listing')} {L('está activa', 'is live')}</div>
        <div className="mt-2 max-w-[320px] text-[13px] font-medium leading-relaxed text-muted">
          {L('Tu propiedad ya es visible para compradores en ToLatino. Te avisaremos de cada lead.', 'Your listing is now visible to buyers on ToLatino. We will notify you of every lead.')}
        </div>

        <div className="mt-5 w-full max-w-[420px] overflow-hidden rounded-card-sm border border-hair bg-white text-left shadow-card">
          <div className="relative h-[104px]" style={draft.photos[0] ? { backgroundImage: `url(${draft.photos[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: tileBg(draft.deal) }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.45))' }} />
            <div className="absolute bottom-2.5 left-3 text-[15px] font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">{draft.title.trim() || L('Propiedad', 'Listing')}</div>
          </div>
          <div className="flex items-center justify-between p-3.5">
            <div className="text-[12.5px] font-extrabold text-ink">{Number(draft.price) > 0 ? fmtPriceFull(Number(draft.price), draft.deal, es) : ''}</div>
            <span className="flex-none rounded-lg bg-green-bg px-3 py-1.5 text-[10.5px] font-extrabold text-green-dark">{L('Publicado', 'Published')}</span>
          </div>
        </div>

        <div className="mt-5 flex w-full max-w-[420px] flex-col gap-2.5">
          <button
            onClick={() => {
              const url = typeof window !== 'undefined' ? `${window.location.origin}/bienes-raices` : '';
              if (typeof navigator !== 'undefined' && navigator.clipboard && url) void navigator.clipboard.writeText(url);
              flash(L('Enlace copiado', 'Link copied'));
            }}
            className="w-full cursor-pointer rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta"
          >
            {L('Compartir mis propiedades', 'Share my listings')}
          </button>
          <button onClick={() => setView('list')} className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3.5 text-[13.5px] font-extrabold text-ink">{L('Ver mis listados', 'View my listings')}</button>
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
  if (view === 'tours') return <>{toursPage}<Toast msg={toast} /></>;

  return (
    <div className="relative">
      {listBody}
      <Toast msg={toast} />
    </div>
  );
}
