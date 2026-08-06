'use client';

// ═══════════════════════ SUPER ADMIN · consola v2 ═══════════════════════════
// Handoff 06-super-admin (v2, 14 secciones). Escritorio-primero (la única
// superficie del proyecto que lo es — el founder opera desde la compu; en ≤lg
// el sidebar pasa a drawer para el teléfono). SOLO tokens del design system.
//
// Motor: RPCs SECURITY DEFINER (migraciones 0120–0128) que validan rol en el
// servidor y auditan. Sin fila en `admins`, la pantalla es 404 y ningún RPC
// devuelve datos. El rol NO se elige a mano: viene de la sesión y decide qué
// secciones se ven (las no permitidas se atenúan → "Sin acceso").
//
// Toda acción destructiva pasa por UNA hoja con razón obligatoria (`ask(...)`),
// que el servidor exige de nuevo — la UI solo evita el viaje.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconActivity as Activity, IconAlertTriangle as Alert, IconArrowLeft as ArrowLeft,
  IconBell as Bell, IconBuildingStore as Store, IconCar as Car, IconCash as Cash,
  IconCertificate as Certificate, IconChartBar as Chart, IconCheck as Check,
  IconChevronRight as ChevronRight, IconClipboardList as Clipboard, IconFlag as Flag,
  IconHome as Home, IconHome2 as House, IconMap2 as Map, IconMenu2 as Menu,
  IconMessage2 as Message, IconPackage as Package, IconSettings as Settings,
  IconShieldLock as Shield, IconSpeakerphone as Speaker, IconTag as Tag,
  IconTicket as Ticket, IconUsers as Users, IconBriefcase as Briefcase,
  IconBus as Bus, IconX as X, IconSearch as Search, IconStar as Star,
} from '@tabler/icons-react';
import type { Icon as TablerIcon } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { LogoMark, SkeletonList } from '@/components/ui';
import { Toast } from '@/screens/negocio/modules/_page';
import { Pill, Panel, Stat, FilterChip, ChipRow, Empty, BlockTitle, Toggle, type Tone } from '@/screens/admin/ui';
import {
  fetchAdminMe, fetchAdminDashboard, fetchAdminUsers, fetchAdminUser, adminSuspendUser,
  adminUnsuspendUser, fetchAdminBusinesses, fetchAdminBusiness, adminSuspendBusiness,
  adminSetTier, fetchLicenseQueue, adminVerifyLicense, fetchAdminAudit,
  fetchReports, adminHandleReport, ENTITY_LABEL, DELETABLE,
  fetchAdminClaims, adminUpdateClaim, claimAddMessage, CLAIM_STATUS, CLAIM_KIND,
  fetchPayments, fetchPendingMonitor, adminRetryPending, adminRefundPayment,
  fetchGlobalOrders, adminSetOrderStatus, TX_STATUSES, TX_STATUS_LABEL, TX_KIND,
  fetchZones, ZONE_STATE, fetchStream, fetchStreamStats, adminPinPost,
  fetchContent, adminFeatureContent, adminModerateContent, CONTENT_TYPE,
  fetchCategories, adminReorderCategory, adminRenameCategory, fetchAmenities, adminRenameAmenity,
  fetchCities, fetchSuggestions, adminResolveSuggestion,
  fetchBroadcastReach, adminSendBroadcast, fetchBroadcasts,
  fetchGrowth, fetchFunnel, fetchTopBiz, fetchHealth, fetchFlags, adminSetFlag,
  fetchTeam, adminInviteAdmin, adminSetTeamRole, adminRemoveAdmin,
  fetchModuleKpis, fetchModuleRows,
  ROLE_LABEL, money, compact, timeAgo,
  type AdminRole, type AdminMe, type AdminDash, type AdminUserRow, type AdminUserDetail,
  type AdminBizRow, type AdminBizDetail, type AdminLicenseRow, type AdminAuditRow,
  type ReportRow, type ClaimRow, type PaymentRow, type PendingRow, type GlobalTxRow,
  type ZoneRow, type StreamPost, type StreamStats, type ContentRow, type CatRow, type AmenityRow,
  type CityRow, type SuggestionRow, type BroadcastRow, type GrowthRow, type FunnelRow,
  type TopBizRow, type HealthRow, type FlagRow, type TeamRow, type ModuleKpi, type ModuleRow,
} from '@/lib/admin';

// ── secciones + permisos por rol ─────────────────────────────────────────────
type Section =
  | 'inicio' | 'zonas' | 'usuarios' | 'negocios' | 'licencias'
  | 'stream' | 'moderacion' | 'reclamos' | 'dinero' | 'pedidos'
  | 'contenido' | 'catalogo' | 'notificaciones' | 'analiticas'
  | 'mod:eventos' | 'mod:bienes_raices' | 'mod:autos' | 'mod:trabajos' | 'mod:transporte';

type NavItem = { id: Section; es: string; en: string; Icon: TablerIcon };
type NavGroup = { es: string; en: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { es: 'Centro de mando', en: 'Command center', items: [
    { id: 'inicio', es: 'Inicio', en: 'Home', Icon: Home },
    { id: 'zonas', es: 'Zonas activas', en: 'Active zones', Icon: Map },
  ] },
  { es: 'Personas', en: 'People', items: [
    { id: 'usuarios', es: 'Usuarios', en: 'Users', Icon: Users },
    { id: 'negocios', es: 'Negocios', en: 'Businesses', Icon: Store },
    { id: 'licencias', es: 'Licencias', en: 'Licenses', Icon: Certificate },
  ] },
  { es: 'Confianza', en: 'Trust', items: [
    { id: 'stream', es: 'Stream', en: 'Stream', Icon: Activity },
    { id: 'moderacion', es: 'Moderación', en: 'Moderation', Icon: Flag },
    { id: 'reclamos', es: 'Reclamos', en: 'Claims', Icon: Message },
  ] },
  { es: 'Operación', en: 'Operations', items: [
    { id: 'dinero', es: 'Dinero', en: 'Money', Icon: Cash },
    { id: 'pedidos', es: 'Pedidos', en: 'Orders', Icon: Package },
    { id: 'contenido', es: 'Contenido', en: 'Content', Icon: Clipboard },
    { id: 'catalogo', es: 'Catálogo', en: 'Catalog', Icon: Tag },
  ] },
  { es: 'Plataforma', en: 'Platform', items: [
    { id: 'notificaciones', es: 'Notificaciones', en: 'Notifications', Icon: Speaker },
    { id: 'analiticas', es: 'Analíticas y sistema', en: 'Analytics & system', Icon: Chart },
  ] },
  { es: 'Módulos', en: 'Modules', items: [
    { id: 'mod:eventos', es: 'Eventos y boletos', en: 'Events & tickets', Icon: Ticket },
    { id: 'mod:bienes_raices', es: 'Bienes Raíces', en: 'Real estate', Icon: House },
    { id: 'mod:autos', es: 'Dealer de carros', en: 'Car dealer', Icon: Car },
    { id: 'mod:trabajos', es: 'Trabajos', en: 'Jobs', Icon: Briefcase },
    { id: 'mod:transporte', es: 'Transporte', en: 'Transport', Icon: Bus },
  ] },
];

// Permisos (handoff). superadmin ve todo; los módulos los ven todos.
const ALLOW: Record<Exclude<Section, `mod:${string}`>, AdminRole[]> = {
  inicio: ['superadmin', 'finanzas', 'moderador', 'soporte'],
  zonas: ['superadmin', 'finanzas', 'moderador', 'soporte'],
  usuarios: ['superadmin', 'moderador', 'soporte'],
  negocios: ['superadmin', 'finanzas', 'soporte'],
  licencias: ['superadmin', 'moderador'],
  stream: ['superadmin', 'moderador', 'soporte'],
  moderacion: ['superadmin', 'moderador'],
  reclamos: ['superadmin', 'soporte'],
  dinero: ['superadmin', 'finanzas'],
  pedidos: ['superadmin', 'finanzas', 'soporte'],
  contenido: ['superadmin', 'moderador'],
  catalogo: ['superadmin', 'moderador'],
  notificaciones: ['superadmin', 'moderador', 'finanzas'],
  analiticas: ['superadmin', 'finanzas'],
};
const canSee = (role: AdminRole, id: Section): boolean => {
  if (role === 'superadmin') return true;
  if (id.startsWith('mod:')) return true;
  return (ALLOW[id as Exclude<Section, `mod:${string}`>] ?? []).includes(role);
};

const TIER_TONE: Record<string, Tone> = { free: 'gray', verified: 'green', premium: 'amber' };
const MOD_LABEL: Record<string, { es: string; en: string; vertical: string; pilot: boolean; tabs: [string, string, string][] }> = {
  'mod:eventos': { es: 'Eventos y boletos', en: 'Events & tickets', vertical: 'eventos', pilot: false,
    tabs: [['eventos', 'Eventos', 'Events'], ['boletos', 'Boletos', 'Tickets'], ['organizadores', 'Organizadores', 'Organizers']] },
  'mod:bienes_raices': { es: 'Bienes Raíces', en: 'Real estate', vertical: 'bienes_raices', pilot: false,
    tabs: [['propiedades', 'Propiedades', 'Listings'], ['tours', 'Tours', 'Tours'], ['leads', 'Clientes / leads', 'Leads']] },
  'mod:autos': { es: 'Dealer de carros', en: 'Car dealer', vertical: 'autos', pilot: false,
    tabs: [['inventario', 'Inventario', 'Inventory'], ['pruebas', 'Pruebas de manejo', 'Test drives'], ['leads', 'Leads', 'Leads']] },
  'mod:trabajos': { es: 'Trabajos', en: 'Jobs', vertical: 'trabajos', pilot: true,
    tabs: [['vacantes', 'Vacantes', 'Openings'], ['postulantes', 'Postulantes', 'Applicants'], ['empleadores', 'Empleadores', 'Employers']] },
  'mod:transporte': { es: 'Transporte', en: 'Transport', vertical: 'transporte', pilot: true,
    tabs: [['rutas', 'Rutas y viajes', 'Routes & trips'], ['conductores', 'Conductores', 'Drivers'], ['solicitudes', 'Solicitudes', 'Requests']] },
};

// razón de una acción → error (o null). days para suspensiones.
type ActRun = (reason: string, days: number) => Promise<string | null>;
type ActState = {
  title: string; sub?: string; warn?: string; tone?: 'danger' | 'primary';
  needsDuration?: boolean; reasonRequired?: boolean; confirmLabel?: string;
  run: ActRun; after?: () => void;
};

export function AdminScreen() {
  const { L, lang } = useLang();
  const es = lang === 'es';
  const { user, loading: authLoading } = useAuth();

  const [me, setMe] = useState<AdminMe | null>(null);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState<Section>('inicio');
  const [navOpen, setNavOpen] = useState(false);
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2400); };

  // guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setMe(null); setChecking(false); return; }
    let off = false;
    void fetchAdminMe().then((m) => { if (!off) { setMe(m); setChecking(false); } });
    return () => { off = true; };
  }, [user, authLoading]);

  const role = me?.role ?? 'soporte';
  const allowed = useMemo(() => canSee(role, section), [role, section]);

  // ── data state ──
  const [dash, setDash] = useState<AdminDash | null>(null);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [uq, setUq] = useState(''); const [uState, setUState] = useState('all'); const [uPage, setUPage] = useState(0);
  const [biz, setBiz] = useState<AdminBizRow[] | null>(null);
  const [bq, setBq] = useState(''); const [bTier, setBTier] = useState('all'); const [bState, setBState] = useState('all'); const [bPage, setBPage] = useState(0);
  const [lic, setLic] = useState<AdminLicenseRow[] | null>(null);
  const [audit, setAudit] = useState<AdminAuditRow[] | null>(null);
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [rStatus, setRStatus] = useState('pendiente'); const [rType, setRType] = useState('all');
  const [claims, setClaims] = useState<ClaimRow[] | null>(null); const [cStatus, setCStatus] = useState('all');
  const [pays, setPays] = useState<PaymentRow[] | null>(null);
  const [pq, setPq] = useState(''); const [pKind, setPKind] = useState('all'); const [pStatus, setPStatus] = useState('all'); const [pPage, setPPage] = useState(0);
  const [stuck, setStuck] = useState<PendingRow[] | null>(null);
  const [txs, setTxs] = useState<GlobalTxRow[] | null>(null);
  const [oq, setOq] = useState(''); const [oKind, setOKind] = useState('all'); const [oStatus, setOStatus] = useState('all'); const [oPage, setOPage] = useState(0);
  // Fase 3
  const [zones, setZones] = useState<ZoneRow[] | null>(null); const [zSort, setZSort] = useState('gmv');
  const [stream, setStream] = useState<StreamPost[] | null>(null); const [sStats, setSStats] = useState<StreamStats | null>(null);
  const [sType, setSType] = useState('all'); const [sState, setSState] = useState('all');
  const [content, setContent] = useState<ContentRow[] | null>(null); const [cType, setCType] = useState('all'); const [cq, setCq] = useState('');
  const [catTab, setCatTab] = useState('categorias');
  const [cats, setCats] = useState<CatRow[] | null>(null); const [amen, setAmen] = useState<AmenityRow[] | null>(null);
  const [cities, setCities] = useState<CityRow[] | null>(null); const [cityQ, setCityQ] = useState('');
  const [sugs, setSugs] = useState<SuggestionRow[] | null>(null);
  const [notifTab, setNotifTab] = useState('compose');
  const [nTitle, setNTitle] = useState(''); const [nBody, setNBody] = useState('');
  const [nCity, setNCity] = useState('all'); const [nRole, setNRole] = useState('all'); const [nVert, setNVert] = useState('all');
  const [reach, setReach] = useState(0); const [nHist, setNHist] = useState<BroadcastRow[] | null>(null); const [sending, setSending] = useState(false);
  const [growth, setGrowth] = useState<GrowthRow[] | null>(null); const [funnel, setFunnel] = useState<FunnelRow[] | null>(null);
  const [topBiz, setTopBiz] = useState<TopBizRow[] | null>(null); const [health, setHealth] = useState<HealthRow[] | null>(null);
  const [flags, setFlags] = useState<FlagRow[] | null>(null); const [team, setTeam] = useState<TeamRow[] | null>(null);
  const [modTab, setModTab] = useState('');
  const [modKpis, setModKpis] = useState<ModuleKpi[] | null>(null); const [modRows, setModRows] = useState<ModuleRow[] | null>(null);

  // ── loaders ──
  const reloadDash = useCallback(() => { void fetchAdminDashboard().then(setDash); }, []);
  const reloadUsers = useCallback(() => { setUsers(null); void fetchAdminUsers(uq, uState, 30, uPage * 30).then(setUsers); }, [uq, uState, uPage]);
  const reloadBiz = useCallback(() => { setBiz(null); void fetchAdminBusinesses({ q: bq, tier: bTier, state: bState, limit: 30, offset: bPage * 30 }).then(setBiz); }, [bq, bTier, bState, bPage]);
  const reloadLic = useCallback(() => { setLic(null); void fetchLicenseQueue().then(setLic); }, []);
  const reloadAudit = useCallback(() => { setAudit(null); void fetchAdminAudit({ limit: 60 }).then(setAudit); }, []);
  const reloadReports = useCallback(() => { setReports(null); void fetchReports(rStatus, rType).then(setReports); }, [rStatus, rType]);
  const reloadClaims = useCallback(() => { setClaims(null); void fetchAdminClaims(cStatus).then(setClaims); }, [cStatus]);
  const reloadPays = useCallback(() => { setPays(null); setStuck(null); void fetchPayments({ q: pq, kind: pKind, status: pStatus, limit: 40, offset: pPage * 40 }).then(setPays); void fetchPendingMonitor().then(setStuck); }, [pq, pKind, pStatus, pPage]);
  const reloadTxs = useCallback(() => { setTxs(null); void fetchGlobalOrders({ q: oq, kind: oKind, status: oStatus, limit: 40, offset: oPage * 40 }).then(setTxs); }, [oq, oKind, oStatus, oPage]);
  const reloadZones = useCallback(() => { setZones(null); void fetchZones(zSort).then(setZones); }, [zSort]);
  const reloadStream = useCallback(() => { setStream(null); void fetchStream(sType, sState).then(setStream); void fetchStreamStats().then(setSStats); }, [sType, sState]);
  const reloadContent = useCallback(() => { setContent(null); void fetchContent(cType, cq).then(setContent); }, [cType, cq]);
  const reloadCatalog = useCallback(() => {
    if (catTab === 'categorias') { setCats(null); void fetchCategories().then(setCats); }
    else if (catTab === 'amenidades') { setAmen(null); void fetchAmenities().then(setAmen); }
    else if (catTab === 'ciudades') { setCities(null); void fetchCities(cityQ).then(setCities); }
    else { setSugs(null); void fetchSuggestions('pending').then(setSugs); }
  }, [catTab, cityQ]);
  const reloadNotifs = useCallback(() => { if (notifTab === 'history') { setNHist(null); void fetchBroadcasts().then(setNHist); } }, [notifTab]);
  const reloadAnalytics = useCallback(() => {
    void fetchGrowth().then(setGrowth); void fetchFunnel().then(setFunnel); void fetchTopBiz().then(setTopBiz);
    void fetchHealth().then(setHealth); void fetchFlags().then(setFlags); void fetchTeam().then(setTeam);
  }, []);
  const reloadModule = useCallback(() => {
    const m = MOD_LABEL[section]; if (!m) return;
    const tab = modTab || m.tabs[0][0];
    setModRows(null); void fetchModuleKpis(m.vertical).then(setModKpis); void fetchModuleRows(m.vertical, tab).then(setModRows);
  }, [section, modTab]);

  useEffect(() => {
    if (!me || !allowed) return;
    switch (section) {
      case 'inicio': reloadDash(); break;
      case 'usuarios': reloadUsers(); break;
      case 'negocios': reloadBiz(); break;
      case 'licencias': reloadLic(); break;
      case 'moderacion': reloadReports(); break;
      case 'reclamos': reloadClaims(); break;
      case 'dinero': reloadPays(); break;
      case 'pedidos': reloadTxs(); break;
      case 'zonas': reloadZones(); break;
      case 'stream': reloadStream(); break;
      case 'contenido': reloadContent(); break;
      case 'catalogo': reloadCatalog(); break;
      case 'notificaciones': reloadNotifs(); break;
      case 'analiticas': reloadAnalytics(); reloadAudit(); break;
      default: if (section.startsWith('mod:')) reloadModule();
    }
  }, [me, allowed, section, reloadDash, reloadUsers, reloadBiz, reloadLic, reloadReports, reloadClaims, reloadPays, reloadTxs, reloadZones, reloadStream, reloadContent, reloadCatalog, reloadNotifs, reloadAnalytics, reloadAudit, reloadModule]);

  // recompute reach when segment changes
  useEffect(() => { if (section === 'notificaciones') void fetchBroadcastReach(nCity === 'all' ? undefined : nCity, nRole).then(setReach); }, [section, nCity, nRole]);

  // debounced text searches (header + section boxes share the same setters)
  const uTimer = useRef<number | undefined>(undefined); const bTimer = useRef<number | undefined>(undefined);
  const onUq = (v: string) => { setUq(v); setUPage(0); window.clearTimeout(uTimer.current); uTimer.current = window.setTimeout(() => setUsers(null), 10); };
  const onBq = (v: string) => { setBq(v); setBPage(0); window.clearTimeout(bTimer.current); bTimer.current = window.setTimeout(() => setBiz(null), 10); };
  const [pqRaw, setPqRaw] = useState(''); useEffect(() => { const t = window.setTimeout(() => { setPq(pqRaw); setPPage(0); }, 350); return () => window.clearTimeout(t); }, [pqRaw]);
  const [oqRaw, setOqRaw] = useState(''); useEffect(() => { const t = window.setTimeout(() => { setOq(oqRaw); setOPage(0); }, 350); return () => window.clearTimeout(t); }, [oqRaw]);
  const [cqRaw, setCqRaw] = useState(''); useEffect(() => { const t = window.setTimeout(() => setCq(cqRaw), 350); return () => window.clearTimeout(t); }, [cqRaw]);

  // detail overlays
  const [uDetail, setUDetail] = useState<AdminUserDetail | null>(null); const [uOpen, setUOpen] = useState(false);
  const [bDetail, setBDetail] = useState<AdminBizDetail | null>(null); const [bOpen, setBOpen] = useState(false);
  const openUser = async (id: string) => { setUOpen(true); setUDetail(null); const d = await fetchAdminUser(id); if (!d) { flash(L('No se pudo cargar', 'Could not load')); setUOpen(false); return; } setUDetail(d); };
  const openBiz = async (id: string) => { setBOpen(true); setBDetail(null); const d = await fetchAdminBusiness(id); if (!d) { flash(L('No se pudo cargar', 'Could not load')); setBOpen(false); return; } setBDetail(d); };

  // claim thread
  const [claim, setClaim] = useState<ClaimRow | null>(null); const [cmsg, setCmsg] = useState('');

  // ── unified action sheet ──
  const [act, setAct] = useState<ActState | null>(null);
  const [reason, setReason] = useState(''); const [days, setDays] = useState(7); const [busy, setBusy] = useState(false);
  const ask = (a: ActState) => { setReason(''); setDays(7); setAct(a); };
  const runAct = async () => {
    if (!act || busy) return;
    if (act.reasonRequired && !reason.trim()) return;
    setBusy(true);
    const err = await act.run(reason.trim(), days);
    setBusy(false);
    if (err) { flash(/raz|oblig|escribe|razón/i.test(err) ? L('Falta la razón', 'Reason required') : err.length < 80 ? err : L('No se pudo aplicar', 'Could not apply')); return; }
    flash(L('Listo — en la bitácora', 'Done — logged'));
    act.after?.(); setAct(null); reloadDash();
  };

  const sendClaimMsg = async () => {
    if (!claim || !cmsg.trim() || busy) return;
    setBusy(true); const err = await claimAddMessage(claim.id, cmsg.trim()); setBusy(false);
    if (err) { flash(L('No se pudo enviar', "Couldn't send")); return; }
    setCmsg(''); const fresh = await fetchAdminClaims(cStatus); setClaims(fresh); setClaim(fresh.find((c) => c.id === claim.id) ?? null);
  };
  const retryPending = async (id: string) => { const r = await adminRetryPending(id); flash(r.msg || L('Sin respuesta', 'No response')); reloadPays(); reloadDash(); };

  // ══════════════════════════ GUARD ══════════════════════════
  if (authLoading || checking) {
    return <div className="flex min-h-[60vh] items-center justify-center px-5"><div className="text-[13px] font-bold text-muted-2">{L('Verificando acceso…', 'Verifying access…')}</div></div>;
  }
  if (!me) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-lilac-2"><Shield size={28} stroke={2} className="text-primary-dark" /></span>
        <h1 className="mt-5 text-[22px] font-extrabold text-ink">{L('Página no encontrada', 'Page not found')}</h1>
        <p className="mt-2 max-w-[380px] text-[13px] font-medium leading-relaxed text-muted">{L('La dirección que buscas no existe o no tienes acceso.', "The page doesn't exist or you don't have access.")}</p>
        <a href="/" className="mt-6 cursor-pointer rounded-btn-lg bg-primary px-6 py-3 text-[13.5px] font-extrabold text-white shadow-cta">{L('Ir al inicio', 'Go home')}</a>
      </div>
    );
  }

  const allNav = NAV.flatMap((g) => g.items);
  const cur = allNav.find((n) => n.id === section);
  const modCur = MOD_LABEL[section];
  const pageTitle = modCur ? L(modCur.es, modCur.en) : L(cur?.es ?? '', cur?.en ?? '');
  const badgeFor = (id: Section): number => {
    const a = dash?.alerts; if (!a) return 0;
    return id === 'licencias' ? a.licenses_pending : id === 'moderacion' ? a.reports_pending
      : id === 'reclamos' ? a.claims_open : id === 'dinero' ? a.stuck_fulfilling : 0;
  };

  // ── sidebar ──
  const nav = (
    <nav className="flex flex-col gap-3.5 p-3">
      {NAV.map((g) => (
        <div key={g.es}>
          <div className="px-2.5 pb-1.5 text-[9px] font-extrabold uppercase tracking-[.09em] text-white/40">{L(g.es, g.en)}</div>
          <div className="flex flex-col gap-0.5">
            {g.items.map((n) => {
              const on = section === n.id;
              const locked = !canSee(role, n.id);
              const badge = badgeFor(n.id);
              return (
                <button key={n.id} disabled={locked}
                  onClick={() => { setSection(n.id); if (n.id.startsWith('mod:')) setModTab(MOD_LABEL[n.id].tabs[0][0]); setNavOpen(false); }}
                  className={`flex min-h-[40px] w-full items-center gap-2.5 rounded-btn px-2.5 text-left text-[12.5px] font-extrabold transition-colors ${
                    on ? 'bg-primary text-white' : locked ? 'cursor-not-allowed text-white/25' : 'cursor-pointer text-white/70 hover:bg-white/10'}`}>
                  <n.Icon size={16} stroke={2.2} className="flex-none" />
                  <span className="flex-1 truncate">{L(n.es, n.en)}</span>
                  {!locked && !!badge && !on && <span className="flex-none rounded-full bg-pink px-1.5 py-0.5 text-[9px] font-extrabold text-white">{badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  // header search: only sections with a text search show it
  const searchBind: Partial<Record<Section, [string, (v: string) => void, string]>> = {
    usuarios: [uq, onUq, L('Buscar correo o nombre…', 'Search email or name…')],
    negocios: [bq, onBq, L('Buscar negocio, slug o dueño…', 'Search business, slug or owner…')],
    dinero: [pqRaw, setPqRaw, L('Buscar ref, negocio o correo…', 'Search ref, business or email…')],
    pedidos: [oqRaw, setOqRaw, L('Buscar código, negocio o correo…', 'Search code, business or email…')],
    contenido: [cqRaw, setCqRaw, L('Buscar contenido…', 'Search content…')],
  };
  const hs = searchBind[section];

  // ════════════════════════ RENDER ════════════════════════
  return (
    <div className="min-h-screen bg-dash lg:flex">
      {/* sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-[236px] flex-none flex-col bg-ink lg:flex">
        <div className="flex items-baseline gap-1 border-b border-white/10 px-5 py-4">
          <span className="text-[19px] font-extrabold tracking-[-.02em] text-white">To&rsquo;</span>
          <span className="text-[19px] font-extrabold tracking-[-.02em] text-primary-soft">Latino</span>
          {/* Sobre la barra oscura el morado de marca no contrasta: el logotipo
              va en el mismo tono claro que la palabra. */}
          <LogoMark size={17} color="#9B85FF" className="ml-1 self-center" />
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto">{nav}</div>
        <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-3">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-white">{(me.email[0] ?? '?').toUpperCase()}</span>
          <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-extrabold text-white">{me.email}</div><div className="text-[9.5px] font-bold text-white/50">{L(ROLE_LABEL[me.role].es, ROLE_LABEL[me.role].en)}</div></div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* header */}
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3 lg:px-6">
          <button onClick={() => setNavOpen(true)} aria-label={L('Menú', 'Menu')} className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-btn bg-ink lg:hidden"><Menu size={18} stroke={2.4} className="text-white" /></button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-extrabold tracking-[-.02em] text-ink">{pageTitle}</div>
          </div>
          {hs && (
            <div className="flex min-w-[180px] flex-none items-center gap-2 rounded-field bg-app px-3 py-2">
              <Search size={14} stroke={2.2} className="text-muted-2" />
              <input value={hs[0]} onChange={(e) => hs[1](e.target.value)} placeholder={hs[2]} className="w-full min-w-0 bg-transparent text-[12.5px] font-semibold text-ink outline-none placeholder:text-muted-2" />
            </div>
          )}
          <span className="flex-none rounded-full bg-primary px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-white">{L(ROLE_LABEL[me.role].es, ROLE_LABEL[me.role].en)}</span>
        </header>

        <main className="mx-auto max-w-[1180px] px-4 py-5 lg:px-6">
          {!allowed ? (
            <Empty title={L('Sin acceso a esta sección', 'No access to this section')} sub={L('Tu rol no incluye esta área. Habla con un superadmin si la necesitas.', 'Your role does not include this area. Ask a superadmin if you need it.')} />
          ) : (
            <SectionBody />
          )}
        </main>
      </div>

      {/* drawer (mobile) */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label={L('Cerrar', 'Close')} onClick={() => setNavOpen(false)} className="absolute inset-0 cursor-pointer bg-[rgba(20,15,40,.55)]" />
          <div className="absolute left-0 top-0 flex h-full w-[262px] flex-col bg-ink shadow-pop">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
              <div className="flex items-baseline gap-1"><span className="text-[16px] font-extrabold text-white">To&rsquo;</span><span className="text-[16px] font-extrabold text-primary-soft">Latino</span><LogoMark size={14} color="#9B85FF" className="ml-0.5 self-center" /></div>
              <button onClick={() => setNavOpen(false)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10"><X size={15} stroke={2.4} className="text-white" /></button>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto">{nav}</div>
          </div>
        </div>
      )}

      {/* claim thread */}
      {claim && <ClaimThread />}
      {/* user / biz detail */}
      {uOpen && <UserDetailSheet />}
      {bOpen && <BizDetailSheet />}
      {/* action sheet */}
      {act && <ActionSheet />}

      <Toast msg={toast} />
    </div>
  );

  // ═══════════════ section body (closure over all state) ═══════════════
  function SectionBody() {
    if (section.startsWith('mod:')) return <Modulos />;
    switch (section) {
      case 'inicio': return <Inicio />;
      case 'zonas': return <Zonas />;
      case 'usuarios': return <Usuarios />;
      case 'negocios': return <Negocios />;
      case 'licencias': return <Licencias />;
      case 'stream': return <StreamSec />;
      case 'moderacion': return <Moderacion />;
      case 'reclamos': return <Reclamos />;
      case 'dinero': return <Dinero />;
      case 'pedidos': return <Pedidos />;
      case 'contenido': return <Contenido />;
      case 'catalogo': return <Catalogo />;
      case 'notificaciones': return <Notificaciones />;
      case 'analiticas': return <Analiticas />;
      default: return null;
    }
  }

  // ─────────── INICIO ───────────
  function Inicio() {
    if (!dash) return <SkeletonList count={4} className="grid grid-cols-2 gap-3 lg:grid-cols-4" />;
    const a = dash.alerts;
    const alerts = ([
      { k: 'stuck', n: a.stuck_fulfilling, es: 'pagos cobrados sin entregar', en: 'payments charged, undelivered', go: 'dinero' as Section, tone: 'pink' as Tone },
      { k: 'lic', n: a.licenses_pending, es: 'licencias por verificar', en: 'licenses to verify', go: 'licencias' as Section, tone: 'amber' as Tone },
      { k: 'rep', n: a.reports_pending, es: 'reportes sin revisar', en: 'reports pending', go: 'moderacion' as Section, tone: 'amber' as Tone },
      { k: 'cla', n: a.claims_open, es: 'reclamos abiertos', en: 'open claims', go: 'reclamos' as Section, tone: 'purple' as Tone },
      { k: 'bsu', n: a.businesses_suspended, es: 'negocios suspendidos', en: 'suspended businesses', go: 'negocios' as Section, tone: 'pink' as Tone },
    ] as { k: string; n: number; es: string; en: string; go: Section; tone: Tone }[]).filter((x) => x.n > 0 && canSee(role, x.go));
    return (
      <div className="flex flex-col gap-4">
        {alerts.length > 0 && (
          <div className="flex flex-col gap-2">
            {alerts.map((x) => (
              <div key={x.k} className="flex items-center gap-3 rounded-card-sm border border-line bg-white p-3.5 shadow-card" style={{ borderLeftWidth: 4 }}>
                <span className="text-[19px] font-extrabold tabular-nums text-ink">{x.n}</span>
                <span className="min-w-0 flex-1 text-[12.5px] font-bold text-ink-2">{L(x.es, x.en)}</span>
                <button onClick={() => setSection(x.go)} className="flex-none cursor-pointer rounded-btn bg-primary px-3.5 py-2 text-[11.5px] font-extrabold text-white shadow-cta-sm">{L('Resolver', 'Resolve')}</button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Stat value={compact(dash.users.total)} label={`${L('Usuarios', 'Users')} · +${dash.users.new7}/7d`} />
          <Stat value={compact(dash.businesses.total)} label={`${L('Negocios', 'Businesses')} · ${dash.businesses.verified + dash.businesses.premium} ${L('pago', 'paid')}`} />
          <Stat value={money(dash.money.gmv_today)} label={L('GMV hoy', 'GMV today')} tone="green" />
          <Stat value={money(dash.money.gmv_30)} label={`${L('GMV 30d', 'GMV 30d')} · ${dash.money.tx_30} tx`} tone="green" />
          <Stat value={money(dash.money.fees_30)} label={L('Comisión 30d', 'Commission 30d')} tone="amber" />
          <Stat value={compact(dash.content.posts7 + dash.content.properties + dash.content.vehicles)} label={L('Contenido vivo', 'Live content')} tone="purple" />
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Panel className="p-4">
            <BlockTitle>{L('Pagos recientes', 'Recent payments')}</BlockTitle>
            {dash.recent_payments.length === 0 ? <div className="py-4 text-center text-[12px] font-semibold text-muted-2">{L('Sin pagos', 'No payments')}</div> : (
              <div className="divide-y divide-hair">
                {dash.recent_payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5 py-2">
                    <span className={`h-2 w-2 flex-none rounded-full ${p.status === 'refunded' ? 'bg-pink-dark' : 'bg-green'}`} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-extrabold text-ink">{p.business ?? '—'}</span><span className="block text-[10px] font-semibold text-muted-2">{p.kind} · {timeAgo(p.created_at, es)}</span></span>
                    <span className="flex-none text-[12.5px] font-extrabold text-ink">{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel className="p-4">
            <BlockTitle>{L('Transacciones de hoy', "Today's transactions")}</BlockTitle>
            <div className="grid grid-cols-2 gap-2">
              {[[L('Pedidos', 'Orders'), dash.tx.orders_today], [L('Reservas', 'Bookings'), dash.tx.bookings_today], [L('Rentas', 'Rentals'), dash.tx.rentals_today], [L('Boletos', 'Tickets'), dash.tx.tickets_today]].map(([lb, v]) => (
                <div key={String(lb)} className="flex items-center justify-between rounded-field bg-app px-3 py-2.5"><span className="text-[11px] font-bold text-muted-2">{String(lb)}</span><span className="text-[13px] font-extrabold text-ink">{String(v)}</span></div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  // ─────────── ZONAS ───────────
  function Zonas() {
    const opp = (zones ?? []).slice().sort((a, b) => b.opportunity - a.opportunity).slice(0, 3);
    return (
      <div className="flex flex-col gap-4">
        <Panel className="border-l-4 border-l-amber p-4">
          <BlockTitle sub={L('Dónde hay demanda esperando negocios — ataca esto primero.', 'Where demand is waiting for businesses — attack this first.')}>{L('Mayor oportunidad', 'Biggest opportunity')}</BlockTitle>
          <div className="flex flex-wrap gap-2.5">
            {opp.length === 0 ? <div className="text-[12px] font-semibold text-muted-2">{L('Cargando…', 'Loading…')}</div> : opp.map((z) => (
              <div key={z.zone} className="min-w-[180px] flex-1 rounded-field bg-amber-bg px-3.5 py-3">
                <div className="text-[13px] font-extrabold text-amber-ink">{z.zone}</div>
                <div className="mt-1 text-[11px] font-semibold leading-tight text-amber-ink/80">{z.users} {L('usuarios', 'users')} · {z.businesses} {L('negocios', 'biz')} · ratio {z.ratio}</div>
              </div>
            ))}
          </div>
        </Panel>
        <ChipRow>{[['gmv', L('Por GMV', 'By GMV')], ['users', L('Por usuarios', 'By users')], ['density', L('Por densidad', 'By density')], ['opportunity', L('Por oportunidad', 'By opportunity')]].map(([k, lb]) => <FilterChip key={k} active={zSort === k} onClick={() => setZSort(k)}>{lb}</FilterChip>)}</ChipRow>
        {zones === null ? <SkeletonList count={6} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" /> : zones.length === 0 ? <Empty title={L('Sin zonas', 'No zones')} /> : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {zones.map((z) => {
              const st = ZONE_STATE[z.state];
              const ratioTone = z.ratio > 300 ? 'text-pink-dark' : z.ratio > 150 ? 'text-amber-ink' : 'text-green-dark';
              return (
                <Panel key={z.zone} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="truncate text-[15px] font-extrabold text-ink">{z.zone}</div></div>
                    <Pill tone={z.state === 'hot' ? 'pink' : z.state === 'growing' ? 'green' : z.state === 'cooling' ? 'blue' : z.state === 'dormant' ? 'amber' : 'gray'}>{L(st.es, st.en)}</Pill>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <div><div className="text-[14px] font-extrabold text-ink">{z.businesses}</div><div className="text-[9px] font-bold text-muted-2">{L('negocios', 'biz')}</div></div>
                    <div><div className="text-[14px] font-extrabold text-ink">{z.users}</div><div className="text-[9px] font-bold text-muted-2">{L('usuarios', 'users')}</div></div>
                    <div><div className="text-[14px] font-extrabold text-green-dark">{money(z.gmv30)}</div><div className="text-[9px] font-bold text-muted-2">GMV 30d</div></div>
                    <div><div className={`text-[14px] font-extrabold ${z.trend7 >= 0 ? 'text-green-dark' : 'text-pink-dark'}`}>{z.trend7 >= 0 ? '+' : ''}{z.trend7}%</div><div className="text-[9px] font-bold text-muted-2">7d</div></div>
                  </div>
                  <div className={`mt-3 border-t border-hair pt-2.5 text-[11px] font-extrabold ${ratioTone}`}>{z.ratio} {L('usuarios por negocio', 'users per business')}</div>
                  <div className="mt-2.5 flex gap-2">
                    <button onClick={() => { setBState('all'); setBTier('all'); onBq(z.zone.split(',')[0]); setSection('negocios'); }} className="min-h-[38px] flex-1 cursor-pointer rounded-btn bg-primary text-[11.5px] font-extrabold text-white shadow-cta-sm">{L('Ver negocios', 'See businesses')}</button>
                    <button onClick={() => { setNCity(z.zone); setNTitle(''); setNBody(''); setNotifTab('compose'); setSection('notificaciones'); }} className="min-h-[38px] flex-none cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white px-3 text-[11.5px] font-extrabold text-ink-2">{L('Campaña', 'Campaign')}</button>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────── USUARIOS ───────────
  function Usuarios() {
    return (
      <div className="flex flex-col gap-3">
        <ChipRow>{[['all', L('Todos', 'All')], ['owners', L('Dueños', 'Owners')], ['suspended', L('Suspendidos', 'Suspended')]].map(([k, lb]) => <FilterChip key={k} active={uState === k} onClick={() => { setUState(k); setUPage(0); }}>{lb}</FilterChip>)}</ChipRow>
        {users === null ? <SkeletonList count={6} /> : users.length === 0 ? <Empty title={L('Sin resultados', 'No results')} sub={L('Prueba otro correo o nombre.', 'Try another email or name.')} /> : (
          <>
            <div className="text-[11px] font-bold text-muted-2"><span className="text-primary-dark">{users[0]?.total_count ?? 0}</span> {L('usuarios', 'users')}</div>
            <Panel className="overflow-hidden">
              <div className="hidden grid-cols-[2fr_1fr_1fr_90px_90px] gap-3 border-b border-hair bg-app px-4 py-2.5 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-muted-2 md:grid"><span>{L('Usuario', 'User')}</span><span>{L('Ciudad', 'City')}</span><span>{L('Alta', 'Joined')}</span><span>{L('Estado', 'Status')}</span><span></span></div>
              {users.map((u) => {
                const susp = !!u.suspended_until && new Date(u.suspended_until) > new Date();
                return (
                  <div key={u.id} className="grid grid-cols-1 items-center gap-2 border-b border-hair px-4 py-2.5 last:border-0 md:grid-cols-[2fr_1fr_1fr_90px_90px] md:gap-3">
                    <button onClick={() => void openUser(u.id)} className="flex min-w-0 cursor-pointer items-center gap-2.5 text-left">
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold text-white" style={{ background: u.avatar_color ?? '#7B61FF' }}>{u.initials ?? (u.email[0] ?? '?').toUpperCase()}</span>
                      <span className="min-w-0"><span className="block truncate text-[12.5px] font-extrabold text-ink">{u.display_name ?? L('Sin nombre', 'No name')}</span><span className="block truncate text-[10.5px] font-semibold text-muted-2">{u.email}</span></span>
                    </button>
                    <span className="text-[11.5px] font-semibold text-ink-soft">{u.city_label ?? '—'}</span>
                    <span className="text-[11px] font-semibold text-muted-2">{timeAgo(u.created_at, es)}</span>
                    <span>{susp ? <Pill tone="pink">{L('Suspendido', 'Suspended')}</Pill> : <Pill tone="green">{L('Activo', 'Active')}</Pill>}</span>
                    <button onClick={() => void openUser(u.id)} className="hidden cursor-pointer items-center justify-end md:flex"><ChevronRight size={16} className="text-muted-2" /></button>
                  </div>
                );
              })}
            </Panel>
            <Pager page={uPage} total={users[0]?.total_count ?? 0} size={30} onPage={setUPage} />
          </>
        )}
      </div>
    );
  }

  // ─────────── NEGOCIOS ───────────
  function Negocios() {
    return (
      <div className="flex flex-col gap-3">
        <ChipRow>{[['all', L('Todos', 'All')], ['free', 'Free'], ['verified', 'Verified'], ['premium', 'Premium']].map(([k, lb]) => <FilterChip key={k} active={bTier === k} onClick={() => { setBTier(k); setBPage(0); }}>{lb}</FilterChip>)}</ChipRow>
        <ChipRow>{[['all', L('Cualquier estado', 'Any state')], ['suspended', L('Suspendidos', 'Suspended')], ['connect', L('Con Stripe', 'With Stripe')], ['no_connect', L('Sin Stripe', 'No Stripe')]].map(([k, lb]) => <FilterChip key={k} active={bState === k} onClick={() => { setBState(k); setBPage(0); }}>{lb}</FilterChip>)}</ChipRow>
        {biz === null ? <SkeletonList count={6} /> : biz.length === 0 ? <Empty title={L('Sin resultados', 'No results')} /> : (
          <>
            <div className="text-[11px] font-bold text-muted-2"><span className="text-primary-dark">{biz[0]?.total_count ?? 0}</span> {L('negocios', 'businesses')}</div>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {biz.map((b) => (
                <button key={b.id} onClick={() => void openBiz(b.id)} className="flex cursor-pointer flex-col rounded-card-sm border border-line bg-white p-3.5 text-left shadow-card">
                  <div className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-ink">{b.name}</span>
                    <Pill tone={TIER_TONE[b.tier] ?? 'gray'}>{b.tier}</Pill>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {b.suspended && <Pill tone="pink">{L('Suspendido', 'Suspended')}</Pill>}
                    {b.connect ? <Pill tone="green">Stripe ✓</Pill> : <Pill tone="gray">{L('sin Stripe', 'no Stripe')}</Pill>}
                  </div>
                  <div className="mt-1.5 truncate text-[10.5px] font-semibold text-muted-2">{b.category_id} · {b.city ?? '—'} · {b.owner_email ?? '—'}</div>
                </button>
              ))}
            </div>
            <Pager page={bPage} total={biz[0]?.total_count ?? 0} size={30} onPage={setBPage} />
          </>
        )}
      </div>
    );
  }

  // ─────────── LICENCIAS ───────────
  function Licencias() {
    return (
      <div className="flex flex-col gap-3">
        <Panel className="p-4 text-[11.5px] font-medium leading-relaxed text-ink-3">{L('Agentes inmobiliarios y dealers necesitan licencia para publicar. Verifícala contra el registro estatal antes de aprobar — la insignia le dice al comprador que confíe.', 'Agents and dealers need a license to publish. Verify against the state registry before approving — the badge tells buyers to trust them.')}</Panel>
        {lic === null ? <SkeletonList count={4} /> : lic.length === 0 ? <Empty title={L('Cola limpia', 'Queue clear')} sub={L('Cuando alguien registre licencia, aparece aquí.', 'When someone registers a license, it shows here.')} /> : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {lic.map((l) => (
              <Panel key={l.id} className="p-4">
                <div className="flex items-center gap-1.5"><span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-ink">{l.name}</span><Pill tone={l.verified_license ? 'green' : 'amber'}>{l.verified_license ? L('Verificada', 'Verified') : L('Pendiente', 'Pending')}</Pill></div>
                <div className="mt-2 rounded-field bg-app px-3 py-2"><div className="text-[9px] font-bold uppercase text-muted-2">{L('Licencia', 'License')}</div><div className="font-mono text-[13px] font-extrabold tracking-[.04em] text-ink">{l.license}</div></div>
                <div className="mt-1.5 text-[11px] font-semibold text-muted-2">{l.category_id === 'RealEstate' ? L('Bienes Raíces', 'Real Estate') : L('Dealer', 'Dealer')} · {l.city ?? '—'} · {l.owner_email}</div>
                <div className="mt-2.5 flex gap-2">
                  {!l.verified_license ? (
                    <>
                      <button onClick={() => ask({ title: L('Aprobar licencia', 'Approve license'), sub: l.name, run: (r) => adminVerifyLicense(l.id, true, r || undefined), after: reloadLic })} className="min-h-[40px] flex-1 cursor-pointer rounded-btn bg-primary text-[12px] font-extrabold text-white shadow-cta-sm">{L('Aprobar', 'Approve')}</button>
                      <button onClick={() => ask({ title: L('Rechazar licencia', 'Reject license'), sub: l.name, tone: 'danger', reasonRequired: true, run: (r) => adminVerifyLicense(l.id, false, r), after: reloadLic })} className="min-h-[40px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white text-[12px] font-extrabold text-ink-2">{L('Rechazar', 'Reject')}</button>
                    </>
                  ) : (
                    <button onClick={() => ask({ title: L('Quitar verificación', 'Remove verification'), sub: l.name, tone: 'danger', reasonRequired: true, run: (r) => adminVerifyLicense(l.id, false, r), after: reloadLic })} className="min-h-[40px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white text-[12px] font-extrabold text-ink-2">{L('Quitar verificación', 'Remove verification')}</button>
                  )}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─────────── MODERACIÓN ───────────
  function Moderacion() {
    return (
      <div className="flex flex-col gap-3">
        <ChipRow>{[['pendiente', L('Pendientes', 'Pending')], ['accionado', L('Accionados', 'Actioned')], ['revisado', L('Revisados', 'Reviewed')], ['descartado', L('Descartados', 'Dismissed')], ['all', L('Todos', 'All')]].map(([k, lb]) => <FilterChip key={k} active={rStatus === k} onClick={() => setRStatus(k)}>{lb}</FilterChip>)}</ChipRow>
        <ChipRow>{([['all', L('Todo tipo', 'Any type')], ...Object.entries(ENTITY_LABEL).map(([k, v]) => [k, L(v.es, v.en)] as [string, string])] as [string, string][]).map(([k, lb]) => <FilterChip key={k} active={rType === k} onClick={() => setRType(k)}>{lb}</FilterChip>)}</ChipRow>
        {reports === null ? <SkeletonList count={4} /> : reports.length === 0 ? <Empty title={L('Nada por moderar', 'Nothing to moderate')} sub={L('Cuando alguien reporte, aparece aquí con el texto completo.', 'When someone reports, it shows here with the full text.')} /> : (
          <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
            {reports.map((r) => {
              const lb = ENTITY_LABEL[r.entity_type]; const del = DELETABLE.has(r.entity_type); const open = r.status === 'pendiente';
              return (
                <Panel key={r.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone="purple">{lb ? L(lb.es, lb.en) : r.entity_type}</Pill>
                    {r.content_hidden && <Pill tone="pink">{L('Oculto', 'Hidden')}</Pill>}
                    {r.report_count > 1 && <Pill tone="amber">{r.report_count} {L('reportes', 'reports')}</Pill>}
                    {!open && <Pill tone="green">{r.status}</Pill>}
                    <span className="ml-auto text-[10px] font-semibold text-muted-2">{timeAgo(r.created_at, es)}</span>
                  </div>
                  <div className="mt-2 text-[12.5px] font-extrabold text-ink">{r.reason}</div>
                  {r.detail && <div className="mt-0.5 text-[11.5px] font-medium text-ink-3">{r.detail}</div>}
                  <div className="mt-2 rounded-field bg-app px-3 py-2.5"><div className="text-[9px] font-bold uppercase tracking-[.04em] text-muted-2">{L('Contenido reportado', 'Reported content')}{r.content_author ? ` · ${r.content_author}` : ''}</div><div className="mt-1 whitespace-pre-wrap break-words text-[12px] font-medium leading-relaxed text-ink-2">{r.content_preview ?? L('(ya no existe)', '(no longer exists)')}</div></div>
                  <div className="mt-1.5 truncate text-[10.5px] font-medium text-muted-2">{L('Reportado por', 'Reported by')} {r.reporter_email ?? '—'}</div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {r.content_hidden
                      ? <button onClick={() => ask({ title: L('Mostrar de nuevo', 'Unhide'), sub: r.reason, run: (rr) => adminHandleReport(r.id, 'unhide', rr || undefined), after: reloadReports })} className="min-h-[40px] flex-1 cursor-pointer rounded-btn bg-primary text-[12px] font-extrabold text-white shadow-cta-sm">{L('Mostrar', 'Unhide')}</button>
                      : <button onClick={() => ask({ title: L('Ocultar contenido', 'Hide content'), sub: r.reason, tone: 'danger', reasonRequired: true, run: (rr) => adminHandleReport(r.id, 'hide', rr), after: reloadReports })} className="min-h-[40px] flex-1 cursor-pointer rounded-btn bg-primary text-[12px] font-extrabold text-white shadow-cta-sm">{L('Ocultar', 'Hide')}</button>}
                    {del && <button onClick={() => ask({ title: L('Eliminar contenido', 'Delete content'), sub: r.reason, warn: L('Se borra para siempre. Para solo sacarlo de la vista, usa Ocultar.', 'Deleted forever. To just hide it, use Hide.'), tone: 'danger', reasonRequired: true, run: (rr) => adminHandleReport(r.id, 'delete', rr), after: reloadReports })} className="min-h-[40px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-pink-dark bg-white text-[12px] font-extrabold text-pink-dark">{L('Eliminar', 'Delete')}</button>}
                    {open && <button onClick={() => ask({ title: L('Descartar reporte', 'Dismiss report'), sub: r.reason, run: (rr) => adminHandleReport(r.id, 'dismiss', rr || undefined), after: reloadReports })} className="min-h-[40px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white text-[12px] font-extrabold text-ink-2">{L('Descartar', 'Dismiss')}</button>}
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────── RECLAMOS ───────────
  function Reclamos() {
    return (
      <div className="flex flex-col gap-3">
        <ChipRow>{[['all', L('Todos', 'All')], ['abierto', L('Abiertos', 'Open')], ['en_revision', L('En revisión', 'In review')], ['resuelto', L('Resueltos', 'Resolved')], ['rechazado', L('Rechazados', 'Rejected')]].map(([k, lb]) => <FilterChip key={k} active={cStatus === k} onClick={() => setCStatus(k)}>{lb}</FilterChip>)}</ChipRow>
        {claims === null ? <SkeletonList count={4} /> : claims.length === 0 ? <Empty title={L('Sin reclamos', 'No claims')} sub={L('Nadie ha tenido que abrir un caso.', 'Nobody has had to open a case.')} /> : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {claims.map((c) => {
              const st = CLAIM_STATUS[c.status] ?? CLAIM_STATUS.abierto; const kd = CLAIM_KIND[c.kind];
              const late = (c.status === 'abierto' || c.status === 'en_revision') && c.hours_open > 24;
              return (
                <button key={c.id} onClick={() => { setClaim(c); setCmsg(''); }} className={`flex cursor-pointer flex-col rounded-card-sm border bg-white p-3.5 text-left shadow-card ${late ? 'border-pink-dark' : 'border-line'}`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone={c.status === 'resuelto' ? 'green' : c.status === 'rechazado' ? 'pink' : c.status === 'en_revision' ? 'purple' : 'amber'}>{L(st.es, st.en)}</Pill>
                    {kd && <Pill tone="gray">{L(kd.es, kd.en)}</Pill>}
                    {c.ref_code && <span className="font-mono text-[10px] font-extrabold tracking-[.04em] text-muted-2">{c.ref_code}</span>}
                    <span className={`ml-auto text-[10px] font-extrabold ${late ? 'text-pink-dark' : 'text-muted-2'}`}>{c.hours_open}h</span>
                  </div>
                  <div className="mt-1.5 line-clamp-2 text-[12.5px] font-extrabold text-ink">{c.reason}</div>
                  <div className="mt-0.5 truncate text-[11px] font-semibold text-muted-2">{c.business_name ?? '—'} · {c.messages?.length ?? 0} {L('mensajes', 'messages')}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────── DINERO ───────────
  function Dinero() {
    return (
      <div className="flex flex-col gap-3">
        {stuck !== null && stuck.length > 0 && (
          <Panel className="border-l-4 border-l-pink-dark p-4">
            <BlockTitle sub={L('Le cobramos al cliente pero la orden no se creó. Reintenta; si no, reembolsa en la tabla de abajo.', "We charged but no order was created. Retry; if not, refund below.")}>{L('Cobrado sin entregar', 'Charged, undelivered')}</BlockTitle>
            <div className="flex flex-col gap-2">
              {stuck.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-2.5 rounded-field border border-line px-3 py-2.5">
                  <Pill tone="pink">{s.status}</Pill><Pill tone="purple">{s.kind}</Pill>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-extrabold text-ink">{s.business_name ?? '—'}</span>
                  <span className="text-[13px] font-extrabold text-ink">{money(s.amount)}</span>
                  <span className="text-[10px] font-extrabold text-pink-dark">{Math.round(s.minutes_stuck)}min</span>
                  <button onClick={() => void retryPending(s.id)} className="cursor-pointer rounded-btn bg-primary px-3.5 py-2 text-[11.5px] font-extrabold text-white shadow-cta-sm">{L('Reintentar', 'Retry')}</button>
                </div>
              ))}
            </div>
          </Panel>
        )}
        <ChipRow>{[['all', L('Todo', 'All')], ['order', L('Pedidos', 'Orders')], ['booking', L('Reservas', 'Bookings')], ['rental', L('Rentas', 'Rentals')], ['ticket', L('Boletos', 'Tickets')]].map(([k, lb]) => <FilterChip key={k} active={pKind === k} onClick={() => { setPKind(k); setPPage(0); }}>{lb}</FilterChip>)}</ChipRow>
        <ChipRow>{[['all', L('Cualquier estado', 'Any status')], ['paid', L('Pagados', 'Paid')], ['refunded', L('Reembolsados', 'Refunded')]].map(([k, lb]) => <FilterChip key={k} active={pStatus === k} onClick={() => { setPStatus(k); setPPage(0); }}>{lb}</FilterChip>)}</ChipRow>
        {pays === null ? <SkeletonList count={6} /> : pays.length === 0 ? <Empty title={L('Sin pagos', 'No payments')} /> : (
          <>
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-2"><span><span className="text-primary-dark">{pays[0]?.total_count ?? 0}</span> {L('pagos', 'payments')}</span><span>{L('Total filtrado', 'Filtered total')}: <span className="text-ink">{money(pays[0]?.sum_amount ?? 0)}</span></span></div>
            <Panel className="overflow-hidden">
              <div className="hidden grid-cols-[1.4fr_1.6fr_0.9fr_0.8fr_1fr_90px] gap-3 border-b border-hair bg-app px-4 py-2.5 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-muted-2 md:grid"><span>Ref</span><span>{L('Negocio', 'Business')}</span><span>{L('Monto', 'Amount')}</span><span>{L('Comisión', 'Fee')}</span><span>{L('Estado', 'Status')}</span><span></span></div>
              {pays.map((p) => (
                <div key={p.id} className="grid grid-cols-1 items-center gap-2 border-b border-hair px-4 py-2.5 last:border-0 md:grid-cols-[1.4fr_1.6fr_0.9fr_0.8fr_1fr_90px] md:gap-3">
                  <div className="min-w-0"><div className="font-mono text-[11px] font-bold text-ink-soft">{p.ref ?? '—'}</div><Pill tone="purple">{p.kind}</Pill></div>
                  <div className="min-w-0"><div className="truncate text-[12px] font-extrabold text-ink">{p.business_name ?? '—'}</div><div className="truncate text-[10px] font-semibold text-muted-2">{p.buyer_email ?? '—'}</div></div>
                  <span className={`text-[12.5px] font-extrabold ${p.status === 'refunded' ? 'text-pink-dark line-through' : 'text-ink'}`}>{money(p.amount)}</span>
                  <span className="text-[11.5px] font-bold text-primary-dark">{money(p.fee)}</span>
                  <span>{p.status === 'refunded' ? <Pill tone="pink">{L('Reembolsado', 'Refunded')}</Pill> : <Pill tone="green">{L('Pagado', 'Paid')}</Pill>}</span>
                  {p.status === 'paid' && p.intent
                    ? <button onClick={() => ask({ title: L('Reembolsar pago', 'Refund payment'), sub: `${p.business_name ?? ''} · ${money(p.amount)}`, warn: L('El dinero vuelve a la tarjeta en 5–10 días. Se revierte la transferencia al negocio y la comisión. No se puede deshacer.', "Money returns in 5–10 days. Business payout and commission reversed. Cannot be undone."), tone: 'danger', reasonRequired: true, confirmLabel: L('Reembolsar', 'Refund'), run: (r) => adminRefundPayment(p.id, r), after: reloadPays })} className="cursor-pointer rounded-btn border-[1.5px] border-pink-dark bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-pink-dark">{L('Reembolsar', 'Refund')}</button>
                    : <span />}
                </div>
              ))}
            </Panel>
            <Pager page={pPage} total={pays[0]?.total_count ?? 0} size={40} onPage={setPPage} />
          </>
        )}
      </div>
    );
  }

  // ─────────── PEDIDOS ───────────
  function Pedidos() {
    return (
      <div className="flex flex-col gap-3">
        <ChipRow>{[['all', L('Todo', 'All')], ...Object.entries(TX_KIND).map(([k, v]) => [k, L(v.es, v.en)] as [string, string])].map(([k, lb]) => <FilterChip key={k} active={oKind === k} onClick={() => { setOKind(k); setOStatus('all'); setOPage(0); }}>{lb}</FilterChip>)}</ChipRow>
        {oKind !== 'all' && <ChipRow>{[['all', L('Cualquier estado', 'Any status')], ...(TX_STATUSES[oKind] ?? []).map((s) => [s, L(TX_STATUS_LABEL[s]?.es ?? s, TX_STATUS_LABEL[s]?.en ?? s)] as [string, string])].map(([k, lb]) => <FilterChip key={k} active={oStatus === k} onClick={() => { setOStatus(k); setOPage(0); }}>{lb}</FilterChip>)}</ChipRow>}
        {txs === null ? <SkeletonList count={6} /> : txs.length === 0 ? <Empty title={L('Sin transacciones', 'No transactions')} /> : (
          <>
            <div className="text-[11px] font-bold text-muted-2"><span className="text-primary-dark">{txs[0]?.total_count ?? 0}</span> {L('transacciones', 'transactions')}</div>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {txs.map((t) => {
                const kd = TX_KIND[t.kind]; const sl = TX_STATUS_LABEL[t.status]; const dead = t.status === 'cancelled';
                return (
                  <Panel key={`${t.kind}-${t.id}`} className="p-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Pill tone="purple">{kd ? L(kd.es, kd.en) : t.kind}</Pill>
                      <Pill tone={dead ? 'pink' : 'green'}>{sl ? L(sl.es, sl.en) : t.status}</Pill>
                      {t.code && <span className="font-mono text-[10px] font-extrabold tracking-[.04em] text-muted-2">{t.code}</span>}
                      <span className="ml-auto text-[10px] font-semibold text-muted-2">{timeAgo(t.created_at, es)}</span>
                    </div>
                    <div className="mt-1.5 flex items-end gap-2"><span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-extrabold text-ink">{t.business_name ?? '—'}</span><span className="block truncate text-[10.5px] font-medium text-muted-2">{t.buyer_email ?? '—'}</span></span><span className="text-[14px] font-extrabold text-ink">{money(Number(t.total ?? 0))}</span></div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(TX_STATUSES[t.kind] ?? []).filter((s) => s !== t.status).map((s) => (
                        <button key={s} onClick={() => ask({ title: L('Cambiar estado', 'Change status'), sub: `${t.code ?? ''} · ${t.business_name ?? ''}`, warn: L('El cliente recibe aviso. NO devuelve dinero — para eso usa Dinero.', 'Customer is notified. Does NOT refund — use Money for that.'), reasonRequired: true, run: (r) => adminSetOrderStatus(t.kind, t.id, s, r), after: reloadTxs })} className="min-h-[34px] cursor-pointer rounded-btn border border-lilac-line bg-white px-2.5 text-[11px] font-extrabold text-ink-2">{L(TX_STATUS_LABEL[s]?.es ?? s, TX_STATUS_LABEL[s]?.en ?? s)}</button>
                      ))}
                    </div>
                  </Panel>
                );
              })}
            </div>
            <Pager page={oPage} total={txs[0]?.total_count ?? 0} size={40} onPage={setOPage} />
          </>
        )}
      </div>
    );
  }

  // ─────────── STREAM (moderar Comunidad en vivo) ───────────
  function StreamSec() {
    const TYPES: [string, string, string][] = [['all', 'Todos', 'All'], ['pregunta', 'Pregunta', 'Question'], ['aviso', 'Aviso', 'Notice'], ['venta', 'Venta', 'Sale'], ['promo', 'Promoción', 'Promo'], ['recomendacion', 'Recomendación', 'Recommend']];
    return (
      <div className="flex flex-col gap-3">
        {sStats && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat value={sStats.posts_today} label={L('Publicaciones hoy', 'Posts today')} />
            <Stat value={sStats.comments_today} label={L('Comentarios hoy', 'Comments today')} />
            <Stat value={sStats.flagged} label={L('Marcados', 'Flagged')} tone={sStats.flagged > 0 ? 'pink' : 'ink'} />
            <Stat value={`${sStats.auto_pct}%`} label={L('Auto-aprobado', 'Auto-approved')} tone="green" />
          </div>
        )}
        <ChipRow>{TYPES.map(([k, e, en]) => <FilterChip key={k} active={sType === k} onClick={() => setSType(k)}>{L(e, en)}</FilterChip>)}</ChipRow>
        <ChipRow>{[['all', L('Todo', 'All')], ['flagged', L('Marcados por señal', 'Flagged')], ['hidden', L('Ocultos', 'Hidden')], ['pinned', L('Fijados', 'Pinned')]].map(([k, lb]) => <FilterChip key={k} active={sState === k} onClick={() => setSState(k)}>{lb}</FilterChip>)}</ChipRow>
        {stream === null ? <SkeletonList count={4} /> : stream.length === 0 ? <Empty title={L('Nada en el stream', 'Nothing in the stream')} sub={L('No hay publicaciones con estos filtros.', 'No posts with these filters.')} /> : (
          <div className="flex max-w-[900px] flex-col gap-3">
            {stream.map((p) => (
              <Panel key={p.id} className={`p-4 ${p.hidden ? 'border-l-4 border-l-amber' : p.pinned ? 'border-l-4 border-l-primary' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: p.color || '#7B61FF' }}>{p.initials}</span>
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="text-[13px] font-extrabold text-ink">{p.author}</span>{p.pinned && <Pill tone="purple">★</Pill>}</div><div className="text-[10px] font-semibold text-muted-2">{[p.hood, p.city].filter(Boolean).join(' · ')} · {timeAgo(p.created_at, es)}</div></div>
                  <Pill tone="gray">{p.ptype}</Pill>
                  {p.hidden && <Pill tone="amber">{L('Oculto', 'Hidden')}</Pill>}
                </div>
                <div className="mt-3 whitespace-pre-wrap break-words text-[13px] font-medium leading-relaxed text-ink">{p.body}</div>
                {p.flag_label && <div className="mt-2 flex items-center gap-2 rounded-field bg-pink-bg px-3 py-2 text-pink-dark"><Alert size={15} stroke={2.2} className="flex-none" /><span className="flex-1 text-[11.5px] font-extrabold">{p.flag_label}</span><span className="text-[10.5px] font-bold opacity-80">{p.flag_score}% {L('confianza', 'confidence')}</span></div>}
                <div className="mt-2.5 flex items-center gap-4 text-[11px] font-bold text-muted-2"><span>♥ {p.likes}</span><span>💬 {p.comments}</span></div>
                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-hair pt-3">
                  <button onClick={() => ask({ title: p.featured ? L('Quitar destacado', 'Unfeature') : L('Destacar', 'Feature'), sub: p.author, run: (r) => adminFeatureContent('post', p.id, !p.featured, r || 'stream'), after: reloadStream })} className={`min-h-[36px] cursor-pointer rounded-btn px-3 text-[11px] font-extrabold ${p.featured ? 'bg-amber-bg text-amber-ink' : 'border-[1.5px] border-lilac-line bg-white text-ink-2'}`}>{p.featured ? '★ ' + L('Destacado', 'Featured') : L('Destacar', 'Feature')}</button>
                  <button onClick={() => ask({ title: p.pinned ? L('Dejar de fijar', 'Unpin') : L('Fijar en la zona', 'Pin in zone'), sub: p.author, run: (r) => adminPinPost(p.id, !p.pinned, r || 'stream'), after: reloadStream })} className="min-h-[36px] cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white px-3 text-[11px] font-extrabold text-ink-2">{p.pinned ? L('No fijar', 'Unpin') : L('Fijar', 'Pin')}</button>
                  <button onClick={() => ask({ title: p.hidden ? L('Mostrar', 'Unhide') : L('Ocultar', 'Hide'), sub: p.author, reasonRequired: !p.hidden, run: (r) => adminModerateContent('post', p.id, p.hidden ? 'unhide' : 'hide', r || 'stream'), after: reloadStream })} className="min-h-[36px] cursor-pointer rounded-btn border-[1.5px] border-amber bg-white px-3 text-[11px] font-extrabold text-amber-ink">{p.hidden ? L('Mostrar', 'Unhide') : L('Ocultar', 'Hide')}</button>
                  <button onClick={() => ask({ title: L('Eliminar', 'Delete'), sub: p.author, warn: L('Borra la publicación para siempre.', 'Deletes the post forever.'), tone: 'danger', reasonRequired: true, run: (r) => adminModerateContent('post', p.id, 'remove', r), after: reloadStream })} className="min-h-[36px] cursor-pointer rounded-btn bg-pink-dark px-3 text-[11px] font-extrabold text-white">{L('Eliminar', 'Delete')}</button>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─────────── CONTENIDO (7 verticales) ───────────
  function Contenido() {
    return (
      <div className="flex flex-col gap-3">
        <ChipRow>{[['all', L('Todo', 'All')], ...Object.entries(CONTENT_TYPE).map(([k, v]) => [k, L(v.es, v.en)] as [string, string])].map(([k, lb]) => <FilterChip key={k} active={cType === k} onClick={() => setCType(k)}>{lb}</FilterChip>)}</ChipRow>
        {content === null ? <SkeletonList count={5} /> : content.length === 0 ? <Empty title={L('Sin contenido', 'No content')} sub={L('Prueba otro tipo o búsqueda.', 'Try another type or search.')} /> : (
          <>
            <div className="text-[11px] font-bold text-muted-2"><span className="text-primary-dark">{content[0]?.total_count ?? 0}</span> {L('elementos', 'items')}</div>
            <div className="flex flex-col gap-2.5">
              {content.map((c) => {
                const lb = CONTENT_TYPE[c.ctype]; const removed = c.status === 'oculto' || c.status === 'draft' || c.status === 'archived';
                const canFeat = c.ctype !== 'reseña';
                return (
                  <Panel key={`${c.ctype}-${c.id}`} className="p-4">
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5"><Pill tone="purple">{lb ? L(lb.es, lb.en) : c.ctype}</Pill><span className="text-[13px] font-extrabold text-ink">{c.title || '—'}</span>{c.featured && <Pill tone="amber">★</Pill>}</div>
                        <div className="mt-1 text-[11px] font-semibold text-muted-2">{[c.author, c.loc, c.meta].filter(Boolean).join(' · ')} · {timeAgo(c.created_at, es)}</div>
                      </div>
                      <Pill tone={removed ? 'amber' : 'green'}>{c.status}</Pill>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      {canFeat && <button onClick={() => ask({ title: c.featured ? L('Quitar destacado', 'Unfeature') : L('Destacar en descubrimiento', 'Feature in discovery'), sub: c.title, run: (r) => adminFeatureContent(c.ctype, c.id, !c.featured, r || 'contenido'), after: reloadContent })} className={`min-h-[38px] cursor-pointer rounded-btn px-3 text-[11.5px] font-extrabold ${c.featured ? 'bg-amber-bg text-amber-ink' : 'border-[1.5px] border-lilac-line bg-white text-ink-2'}`}>{c.featured ? '★ ' + L('Destacado', 'Featured') : L('Destacar', 'Feature')}</button>}
                      <button onClick={() => ask({ title: removed ? L('Mostrar', 'Unhide') : L('Ocultar', 'Hide'), sub: c.title, reasonRequired: !removed, run: (r) => adminModerateContent(c.ctype, c.id, removed ? 'unhide' : 'hide', r || 'contenido'), after: reloadContent })} className="min-h-[38px] cursor-pointer rounded-btn border-[1.5px] border-amber bg-white px-3 text-[11.5px] font-extrabold text-amber-ink">{removed ? L('Mostrar', 'Unhide') : L('Ocultar', 'Hide')}</button>
                      {(c.ctype === 'post' || c.ctype === 'reseña') && <button onClick={() => ask({ title: L('Eliminar', 'Delete'), sub: c.title, warn: L('Se borra para siempre.', 'Deleted forever.'), tone: 'danger', reasonRequired: true, run: (r) => adminModerateContent(c.ctype, c.id, 'remove', r), after: reloadContent })} className="min-h-[38px] cursor-pointer rounded-btn bg-pink-dark px-3 text-[11.5px] font-extrabold text-white">{L('Eliminar', 'Delete')}</button>}
                    </div>
                  </Panel>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // ─────────── CATÁLOGO ───────────
  function Catalogo() {
    const tabs: [string, string, string][] = [['categorias', 'Categorías', 'Categories'], ['ciudades', 'Ciudades', 'Cities'], ['amenidades', 'Amenidades', 'Amenities'], ['sugerencias', 'Sugerencias', 'Suggestions']];
    return (
      <div className="flex flex-col gap-3">
        <ChipRow>{tabs.map(([k, e, en]) => <FilterChip key={k} active={catTab === k} onClick={() => setCatTab(k)}>{L(e, en)}</FilterChip>)}</ChipRow>
        {catTab === 'categorias' && (cats === null ? <SkeletonList count={5} /> : (
          <Panel className="max-w-[720px] overflow-hidden">
            {cats.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 border-b border-hair px-4 py-2.5 last:border-0">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-lilac-2 text-[11px] font-extrabold text-ink-2">{c.sort}</span>
                <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-extrabold text-ink">{c.name_es}</div><div className="truncate text-[10.5px] font-semibold text-muted-2">{c.name_en} · {c.businesses ?? 0} {L('negocios', 'biz')}</div></div>
                <div className="flex flex-none gap-1.5">
                  <button disabled={i === 0} onClick={() => adminReorderCategory(c.id, 'up').then(reloadCatalog)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-btn border-[1.5px] border-lilac-line bg-white disabled:opacity-30">↑</button>
                  <button disabled={i === cats.length - 1} onClick={() => adminReorderCategory(c.id, 'down').then(reloadCatalog)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-btn border-[1.5px] border-lilac-line bg-white disabled:opacity-30">↓</button>
                  <button onClick={() => ask({ title: L('Renombrar categoría', 'Rename category'), sub: c.name_es, reasonRequired: true, run: (r) => renameWith((es2, en2) => adminRenameCategory(c.id, es2, en2, r)) })} className="cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white px-3 text-[11px] font-extrabold text-primary-dark">{L('Renombrar', 'Rename')}</button>
                </div>
              </div>
            ))}
          </Panel>
        ))}
        {catTab === 'amenidades' && (amen === null ? <SkeletonList count={5} /> : (
          <Panel className="max-w-[720px] overflow-hidden">
            {amen.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-b border-hair px-4 py-2.5 last:border-0">
                <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-extrabold text-ink">{a.name_es}</div><div className="truncate text-[10.5px] font-semibold text-muted-2">{a.name_en}</div></div>
                <button onClick={() => ask({ title: L('Renombrar amenidad', 'Rename amenity'), sub: a.name_es, reasonRequired: true, run: (r) => renameWith((es2, en2) => adminRenameAmenity(a.id, es2, en2, r)) })} className="cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[11px] font-extrabold text-primary-dark">{L('Renombrar', 'Rename')}</button>
              </div>
            ))}
          </Panel>
        ))}
        {catTab === 'ciudades' && (
          <>
            <div className="flex max-w-[720px] items-center gap-2 rounded-field bg-white px-3 py-2 shadow-card"><Search size={14} className="text-muted-2" /><input value={cityQ} onChange={(e) => setCityQ(e.target.value)} placeholder={L('Buscar ciudad…', 'Search city…')} className="w-full bg-transparent text-[12.5px] font-semibold text-ink outline-none placeholder:text-muted-2" /></div>
            {cities === null ? <SkeletonList count={5} /> : (
              <Panel className="max-w-[720px] overflow-hidden">
                {cities.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 border-b border-hair px-4 py-2.5 last:border-0"><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-extrabold text-ink">{c.label}</div><div className="text-[10.5px] font-semibold text-muted-2">{c.businesses} {L('negocios', 'biz')} · {c.users} {L('usuarios', 'users')}{c.population ? ` · ${compact(c.population)} hab.` : ''}</div></div></div>
                ))}
              </Panel>
            )}
          </>
        )}
        {catTab === 'sugerencias' && (sugs === null ? <SkeletonList count={4} /> : sugs.length === 0 ? <Empty title={L('Sin sugerencias', 'No suggestions')} sub={L('Cuando un negocio proponga una subcategoría o amenidad, aparece aquí.', 'When a business suggests a subcategory or amenity, it shows here.')} /> : (
          <div className="flex max-w-[720px] flex-col gap-2.5">
            {sugs.map((s) => (
              <Panel key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="text-[13px] font-extrabold text-ink">{s.label_es}</span><Pill tone="purple">{s.kind}</Pill></div><div className="text-[10.5px] font-semibold text-muted-2">{s.business_name ?? '—'} · {s.category_id ?? ''}</div></div>
                <div className="flex flex-none gap-2">
                  <button onClick={() => ask({ title: L('Rechazar sugerencia', 'Reject suggestion'), sub: s.label_es, tone: 'danger', reasonRequired: true, run: (r) => adminResolveSuggestion(s.kind, s.id, false, r), after: reloadCatalog })} className="min-h-[38px] cursor-pointer rounded-btn border-[1.5px] border-pink-dark bg-white px-3.5 text-[11.5px] font-extrabold text-pink-dark">{L('Rechazar', 'Reject')}</button>
                  <button onClick={() => ask({ title: L('Aprobar sugerencia', 'Approve suggestion'), sub: s.label_es, run: (r) => adminResolveSuggestion(s.kind, s.id, true, r || 'ok'), after: reloadCatalog })} className="min-h-[38px] cursor-pointer rounded-btn bg-green px-4 text-[11.5px] font-extrabold text-white">{L('Aprobar', 'Approve')}</button>
                </div>
              </Panel>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // ─────────── NOTIFICACIONES ───────────
  function Notificaciones() {
    const send = async () => {
      if (!nTitle.trim() || !nBody.trim() || sending) return;
      setSending(true);
      const err = await adminSendBroadcast({ title: nTitle.trim(), body: nBody.trim(), city: nCity === 'all' ? undefined : nCity, role: nRole, vertical: nVert });
      setSending(false);
      if (err) { flash(err.length < 80 ? err : L('No se pudo enviar', "Couldn't send")); return; }
      setNTitle(''); setNBody(''); flash(L('Anuncio enviado', 'Announcement sent')); setNotifTab('history'); void fetchBroadcasts().then(setNHist);
    };
    const cityChips: [string, string][] = [['all', L('Todas', 'All')], ['Hazleton, PA', 'Hazleton'], ['Bronx, NY', 'Bronx'], ['The Bronx, NY', 'The Bronx']];
    const roleChips: [string, string][] = [['all', L('Todos', 'All')], ['citizen', L('Clientes', 'Citizens')], ['owner', L('Dueños', 'Owners')]];
    return (
      <div className="flex flex-col gap-3">
        <ChipRow>{[['compose', L('Redactar', 'Compose')], ['history', L('Historial', 'History')]].map(([k, lb]) => <FilterChip key={k} active={notifTab === k} onClick={() => setNotifTab(k)}>{lb}</FilterChip>)}</ChipRow>
        {notifTab === 'compose' ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Panel className="p-4">
              <BlockTitle>{L('Segmento', 'Segment')}</BlockTitle>
              <div className="mb-1.5 text-[10.5px] font-extrabold text-ink-soft">{L('Ciudad', 'City')}</div>
              <ChipRow>{cityChips.map(([k, lb]) => <FilterChip key={k} active={nCity === k} onClick={() => setNCity(k)}>{lb}</FilterChip>)}</ChipRow>
              <div className="mb-1.5 mt-3 text-[10.5px] font-extrabold text-ink-soft">{L('Rol', 'Role')}</div>
              <ChipRow>{roleChips.map(([k, lb]) => <FilterChip key={k} active={nRole === k} onClick={() => setNRole(k)}>{lb}</FilterChip>)}</ChipRow>
              <div className="mt-4 flex items-center gap-3 rounded-field bg-lilac px-4 py-3"><Users size={18} className="flex-none text-primary-dark" /><div><div className="text-[10px] font-extrabold uppercase tracking-[.04em] text-primary-dark">{L('Alcance', 'Audience')}</div><div className="text-[20px] font-extrabold tracking-[-.02em] text-primary-press">{compact(reach)} <span className="text-[12px] font-bold">{L('personas', 'people')}</span></div></div></div>
              <div className="mb-1.5 mt-4 text-[10.5px] font-extrabold text-ink-soft">{L('Título', 'Title')}</div>
              <input value={nTitle} onChange={(e) => setNTitle(e.target.value)} placeholder={L('Ej. ¡Nuevos negocios en tu zona!', 'e.g. New businesses in your area!')} className="w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[13px] font-semibold text-ink outline-none focus:border-primary" />
              <div className="mb-1.5 mt-3 text-[10.5px] font-extrabold text-ink-soft">{L('Mensaje', 'Message')}</div>
              <textarea value={nBody} onChange={(e) => setNBody(e.target.value)} rows={4} placeholder={L('Escríbelo en español; el inglés se deriva.', 'Write in Spanish; English is derived.')} className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[12.5px] font-medium text-ink outline-none focus:border-primary" />
              <button disabled={!nTitle.trim() || !nBody.trim() || sending} onClick={send} className="mt-4 min-h-[46px] w-full cursor-pointer rounded-btn-lg bg-primary text-[13.5px] font-extrabold text-white shadow-cta disabled:opacity-40">{sending ? L('Enviando…', 'Sending…') : L('Enviar ahora', 'Send now')}</button>
            </Panel>
            <Panel className="self-start p-4">
              <BlockTitle sub={L('Vista rápida', 'Quick view')}>{L('Cómo se verá', 'How it looks')}</BlockTitle>
              <div className="rounded-field border border-line bg-app px-3.5 py-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary"><Bell size={15} className="text-white" /></span><span className="text-[11px] font-extrabold text-ink">To&rsquo;Latino</span></div><div className="mt-2 text-[13px] font-extrabold text-ink">{nTitle || L('(título)', '(title)')}</div><div className="mt-0.5 text-[12px] font-medium text-ink-3">{nBody || L('(mensaje)', '(message)')}</div></div>
              <div className="mt-3 rounded-field bg-amber-bg px-3 py-2.5 text-[11px] font-semibold leading-relaxed text-amber-ink">{L('A gran escala el envío se hace en segundo plano; aquí llega de inmediato hasta un tope seguro.', 'At scale, delivery runs in the background; here it reaches up to a safe cap instantly.')}</div>
            </Panel>
          </div>
        ) : (
          nHist === null ? <SkeletonList count={3} /> : nHist.length === 0 ? <Empty title={L('Sin envíos', 'No sends')} sub={L('Cuando envíes un anuncio, aparece aquí con su alcance y apertura.', 'When you send an announcement, it shows here with reach and open rate.')} /> : (
            <div className="flex max-w-[820px] flex-col gap-2.5">
              {nHist.map((h) => (
                <Panel key={h.id} className="flex flex-wrap items-center gap-3 p-4">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-tile bg-lilac"><Bell size={17} className="text-primary-dark" /></span>
                  <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-extrabold text-ink">{h.title}</div><div className="text-[10.5px] font-semibold text-muted-2">{[String((h.segment as Record<string, unknown>)?.city ?? 'all'), String((h.segment as Record<string, unknown>)?.role ?? 'all')].join(' · ')} · {timeAgo(h.created_at, es)}</div></div>
                  <div className="text-right flex-none"><div className="text-[13px] font-extrabold text-ink">{compact(h.sent)}</div><div className="text-[10px] font-bold text-green-dark">{h.open_pct}% {L('apertura', 'open')}</div></div>
                </Panel>
              ))}
            </div>
          )
        )}
      </div>
    );
  }

  // ─────────── ANALÍTICAS + SISTEMA ───────────
  function Analiticas() {
    const gVert = (growth ?? []).filter((g) => g.kind === 'vertical');
    const gCity = (growth ?? []).filter((g) => g.kind === 'city');
    const maxPct = Math.max(1, ...(growth ?? []).map((g) => g.pct));
    const isSuper = role === 'superadmin';
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel className="p-4"><BlockTitle>{L('Crecimiento semanal por vertical', 'Weekly growth by vertical')}</BlockTitle>
            <div className="flex flex-col gap-3">{gVert.length === 0 ? <div className="text-[12px] font-semibold text-muted-2">{L('Cargando…', 'Loading…')}</div> : gVert.map((g) => <Bar key={g.label} label={g.label} pct={g.pct} max={maxPct} />)}</div>
          </Panel>
          <Panel className="p-4"><BlockTitle>{L('Crecimiento por ciudad', 'Growth by city')}</BlockTitle>
            <div className="flex flex-col gap-3">{gCity.length === 0 ? <div className="text-[12px] font-semibold text-muted-2">{L('Cargando…', 'Loading…')}</div> : gCity.map((g) => <Bar key={g.label} label={g.label} pct={g.pct} max={maxPct} tone="green" />)}</div>
            {topBiz && topBiz.length > 0 && <><div className="mt-4 mb-2 text-[13px] font-extrabold text-ink">{L('Top negocios · 30d', 'Top businesses · 30d')}</div><div className="flex flex-col gap-2">{topBiz.map((b) => <div key={b.id} className="flex items-center gap-2.5"><span className="w-4 text-[11px] font-extrabold text-muted-faint">{b.rank}</span><span className="min-w-0 flex-1 truncate text-[11.5px] font-bold text-ink">{b.name}</span><span className="text-[12px] font-extrabold text-green-dark">{money(b.gmv)}</span></div>)}</div></>}
          </Panel>
        </div>
        <Panel className="p-4"><BlockTitle sub={L('Con lo que medimos hoy. Los pasos intermedios (menú/carrito) llegan con el tracking de eventos.', 'From what we measure today. Intermediate steps (menu/cart) arrive with event tracking.')}>{L('Embudo de compra · 30d', 'Purchase funnel · 30d')}</BlockTitle>
          <div className="flex flex-col gap-2">{(funnel ?? []).map((f) => <div key={f.step} className="flex items-center gap-3"><div className="flex h-8 items-center rounded-md bg-primary px-3 text-[11px] font-extrabold text-white" style={{ width: `${Math.max(12, Number(f.pct))}%` }}>{f.pct}%</div><span className="text-[11.5px] font-bold text-ink-soft">{f.label} · {compact(Number(f.cnt))}</span></div>)}</div>
        </Panel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel className="p-4"><BlockTitle>{L('Salud del sistema', 'System health')}</BlockTitle>
            <div className="flex flex-col gap-2">{(health ?? []).map((h) => <div key={h.label} className="flex items-center gap-2.5 rounded-field bg-app px-3 py-2.5"><span className={`h-2.5 w-2.5 flex-none rounded-full ${h.ok ? 'bg-green' : 'bg-pink-dark'}`} /><span className="flex-1 text-[12px] font-bold text-ink-soft">{h.label}</span><span className={`text-[11px] font-extrabold ${h.ok ? 'text-green-dark' : 'text-pink-dark'}`}>{h.value}</span></div>)}</div>
          </Panel>
          <Panel className="p-4"><BlockTitle sub={isSuper ? L('Efecto real e inmediato en la app pública.', 'Real, immediate effect on the public app.') : L('Solo un superadmin puede cambiar interruptores.', 'Only a superadmin can flip switches.')}>{L('Interruptores', 'Kill switches')}</BlockTitle>
            <div className="flex flex-col gap-2">{(flags ?? []).map((f) => <div key={f.key} className="flex items-center gap-3 rounded-field bg-app px-3 py-2.5"><span className="flex-1 text-[12px] font-bold text-ink-soft">{es ? f.label_es : f.label_en}</span><Pill tone={f.enabled ? 'green' : 'gray'}>{f.enabled ? 'ON' : 'OFF'}</Pill>{isSuper ? <Toggle on={f.enabled} onClick={() => ask({ title: `${es ? f.label_es : f.label_en} → ${f.enabled ? 'OFF' : 'ON'}`, warn: f.key === 'maintenance' || f.key.startsWith('vertical') ? L('Esto cambia lo que ven TODOS los usuarios ahora mismo.', 'This changes what ALL users see right now.') : undefined, tone: f.enabled ? 'danger' : 'primary', reasonRequired: true, run: (r) => adminSetFlag(f.key, !f.enabled, r), after: reloadAnalytics })} /> : null}</div>)}</div>
          </Panel>
        </div>
        {isSuper && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel className="p-4"><BlockTitle>{L('Equipo admin', 'Admin team')}</BlockTitle>
              <div className="flex flex-col gap-2">{(team ?? []).map((m) => <div key={m.user_id} className="flex flex-wrap items-center gap-2.5 rounded-field border border-line px-3 py-2.5"><span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-white">{(m.email[0] ?? '?').toUpperCase()}</span><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-extrabold text-ink">{m.email}</div></div><Pill tone={m.is_owner ? 'amber' : 'purple'}>{m.is_owner ? L('Dueño', 'Owner') : L(ROLE_LABEL[m.role].es, ROLE_LABEL[m.role].en)}</Pill>{!m.is_owner && <button onClick={() => ask({ title: L('Quitar admin', 'Remove admin'), sub: m.email, tone: 'danger', reasonRequired: true, run: (r) => adminRemoveAdmin(m.user_id, r), after: reloadAnalytics })} className="cursor-pointer rounded-btn border-[1.5px] border-pink-dark bg-white px-2.5 py-1.5 text-[10.5px] font-extrabold text-pink-dark">{L('Quitar', 'Remove')}</button>}</div>)}</div>
            </Panel>
            <Panel className="p-4"><BlockTitle sub={L('Quién, qué, cuándo y por qué. Inmutable.', 'Who, what, when and why. Immutable.')}>{L('Bitácora', 'Audit log')}</BlockTitle>
              {audit === null ? <SkeletonList count={4} /> : <div className="flex flex-col gap-2">{(audit ?? []).slice(0, 14).map((a) => <div key={a.id} className="border-b border-hair pb-2 last:border-0"><div className="flex items-center gap-1.5"><span className="rounded bg-lilac-2 px-1.5 py-px font-mono text-[9px] font-extrabold text-primary-dark">{a.action}</span><span className="ml-auto text-[9.5px] font-semibold text-muted-2">{timeAgo(a.created_at, es)}</span></div><div className="mt-0.5 truncate text-[11px] font-bold text-ink-2">{a.actor_email ?? '—'}</div>{a.reason && <div className="text-[10.5px] font-medium italic text-muted">“{a.reason}”</div>}</div>)}</div>}
            </Panel>
          </div>
        )}
      </div>
    );
  }

  // ─────────── MÓDULOS ───────────
  function Modulos() {
    const m = MOD_LABEL[section]; if (!m) return null;
    const tab = modTab || m.tabs[0][0];
    const flag = (flags ?? []).find((f) => f.key === `vertical.${m.vertical}`);
    return (
      <div className="flex flex-col gap-4">
        <Panel className="flex flex-wrap items-center gap-3 p-4">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-tile bg-lilac text-[15px] font-extrabold text-primary-dark">◆</span>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-[17px] font-extrabold text-ink">{L(m.es, m.en)}</span>{m.pilot ? <Pill tone="amber">{L('Piloto', 'Pilot')}</Pill> : <Pill tone="green">{L('En vivo', 'Live')}</Pill>}</div><div className="mt-0.5 font-mono text-[11px] font-semibold text-muted-2">/{m.vertical}</div></div>
        </Panel>
        {m.pilot && (
          <div className="flex flex-wrap items-center gap-3 rounded-card-sm border border-amber bg-amber-bg px-4 py-3.5">
            <Alert size={18} className="flex-none text-amber-ink" />
            <div className="min-w-0 flex-1"><div className="text-[13px] font-extrabold text-amber-ink">{L('Módulo en piloto', 'Module in pilot')}</div><div className="text-[11px] font-semibold leading-snug text-amber-ink/80">{L('Esta vertical aún no está construida como producto. El control aparece aquí en cuanto se lance.', "This vertical isn't built as a product yet. Controls appear here once it launches.")}</div></div>
          </div>
        )}
        {!m.pilot && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{(modKpis ?? []).map((k, i) => <Stat key={i} value={k.value} label={k.label} />)}</div>
            <ChipRow>{m.tabs.map(([k, e, en]) => <FilterChip key={k} active={tab === k} onClick={() => setModTab(k)}>{L(e, en)}</FilterChip>)}</ChipRow>
            {modRows === null ? <SkeletonList count={4} /> : modRows.length === 0 ? <Empty title={L('Sin filas', 'No rows')} sub={L('Esta pestaña aún no tiene datos.', 'This tab has no data yet.')} /> : (
              <div className="flex flex-col gap-2.5">
                {modRows.map((r) => (
                  <Panel key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-tile text-[12px] font-extrabold text-white" style={{ background: r.color }}>{r.ini}</span>
                    <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-ink">{r.title}</span>{r.featured && <Pill tone="amber">★</Pill>}</div><div className="truncate text-[10.5px] font-semibold text-muted-2">{r.sub}</div></div>
                    {r.val && <span className="text-[13px] font-extrabold text-ink">{r.val}</span>}
                    <Pill tone={r.status === 'published' || r.status === 'confirmed' || r.status === 'true' ? 'green' : r.status === 'cancelled' || r.status === 'draft' ? 'pink' : 'gray'}>{r.status}</Pill>
                  </Panel>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // small helper: two-field rename prompt reusing the reason sheet's flow is
  // awkward, so rename uses window.prompt for the new bilingual name (admin-only,
  // desktop). Keeps the change auditable via its RPC's reason.
  async function renameWith(fn: (es: string, en: string) => Promise<string | null>): Promise<string | null> {
    const nes = window.prompt(L('Nuevo nombre (español)', 'New name (Spanish)') || ''); if (!nes) return L('cancelado', 'cancelled');
    const nen = window.prompt(L('Nuevo nombre (inglés)', 'New name (English)') || '') || nes;
    return fn(nes.trim(), nen.trim());
  }

  // bar for analytics
  function Bar({ label, pct, max, tone }: { label: string; pct: number; max: number; tone?: 'green' }) {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between"><span className="text-[11.5px] font-bold text-ink-soft">{label}</span><span className="text-[11.5px] font-extrabold text-ink">{pct}%</span></div>
        <div className="h-1.5 overflow-hidden rounded bg-lilac-2"><div className={`h-full rounded ${tone === 'green' ? 'bg-green' : 'bg-primary'}`} style={{ width: `${Math.min(100, (pct / max) * 100)}%` }} /></div>
      </div>
    );
  }

  // ── shared: pager ──
  function Pager({ page, total, size, onPage }: { page: number; total: number; size: number; onPage: (fn: (p: number) => number) => void }) {
    if (total <= size) return null;
    return (
      <div className="flex items-center justify-between gap-2">
        <button disabled={page === 0} onClick={() => onPage((p) => Math.max(0, p - 1))} className="min-h-[40px] flex-1 cursor-pointer rounded-btn border border-lilac-line bg-white text-[12px] font-extrabold text-ink-2 disabled:opacity-40">{L('Anterior', 'Previous')}</button>
        <span className="text-[11.5px] font-bold text-muted-2">{page + 1}</span>
        <button disabled={(page + 1) * size >= total} onClick={() => onPage((p) => p + 1)} className="min-h-[40px] flex-1 cursor-pointer rounded-btn border border-lilac-line bg-white text-[12px] font-extrabold text-ink-2 disabled:opacity-40">{L('Siguiente', 'Next')}</button>
      </div>
    );
  }

  // ── overlays ──
  function Sheet({ children, onClose, w = 520 }: { children: React.ReactNode; onClose: () => void; w?: number }) {
    return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(20,15,40,.55)] md:items-center md:p-6" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={{ ['--w' as string]: `${w}px` }} className="max-h-[90%] w-full overflow-y-auto rounded-t-panel bg-white p-5 shadow-modal md:w-[var(--w)] md:max-w-[calc(100%-28px)] md:rounded-card">{children}</div>
      </div>
    );
  }

  function ActionSheet() {
    if (!act) return null;
    const danger = act.tone === 'danger';
    return (
      <Sheet onClose={() => setAct(null)} w={440}>
        <div className="mb-4 flex items-start gap-3">
          <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-tile ${danger ? 'bg-pink-bg' : 'bg-lilac-2'}`}><Shield size={18} stroke={2.2} className={danger ? 'text-pink-dark' : 'text-primary-dark'} /></span>
          <div className="min-w-0 flex-1"><div className="text-[16px] font-extrabold tracking-[-.01em] text-ink">{act.title}</div>{act.sub && <div className="mt-0.5 truncate text-[12px] font-semibold text-muted-2">{act.sub}</div>}</div>
        </div>
        {act.warn && <div className="mb-3 rounded-field bg-amber-bg px-3 py-2.5 text-[11.5px] font-semibold leading-relaxed text-amber-ink">{act.warn}</div>}
        {act.needsDuration && (
          <div className="mb-3"><div className="mb-1.5 text-[11.5px] font-extrabold text-ink">{L('Duración', 'Duration')}</div><div className="flex gap-2">{[1, 7, 30, 365].map((d) => <button key={d} onClick={() => setDays(d)} className={`min-h-[40px] flex-1 cursor-pointer rounded-btn text-[11.5px] font-extrabold ${days === d ? 'bg-primary text-white' : 'border-[1.5px] border-lilac-line bg-white text-ink-2'}`}>{d === 365 ? L('1 año', '1 yr') : `${d}d`}</button>)}</div></div>
        )}
        <div className="mb-1.5 text-[11.5px] font-extrabold text-ink">{L('Razón', 'Reason')}{act.reasonRequired ? ' *' : ''}</div>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={L('Queda en la bitácora con tu nombre, fecha y razón.', 'Saved to the audit trail with your name, date and reason.')} className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium text-ink outline-none focus:border-primary" />
        <div className="mt-3 flex gap-2">
          <button onClick={() => setAct(null)} className="min-h-[44px] flex-none cursor-pointer rounded-btn-lg border border-lilac-line bg-white px-5 text-[13px] font-extrabold text-ink-2">{L('Cancelar', 'Cancel')}</button>
          <button disabled={busy || (!!act.reasonRequired && !reason.trim())} onClick={runAct} className={`min-h-[44px] flex-1 cursor-pointer rounded-btn-lg text-[13px] font-extrabold text-white shadow-cta-sm disabled:opacity-40 ${danger ? 'bg-pink-dark' : 'bg-primary'}`}>{busy ? L('Aplicando…', 'Applying…') : (act.confirmLabel ?? L('Confirmar', 'Confirm'))}</button>
        </div>
      </Sheet>
    );
  }

  function ClaimThread() {
    if (!claim) return null;
    const st = CLAIM_STATUS[claim.status] ?? CLAIM_STATUS.abierto; const closed = claim.status === 'resuelto' || claim.status === 'rechazado';
    return (
      <Sheet onClose={() => setClaim(null)} w={560}>
        <div className="mb-3 flex items-center justify-between"><div className="text-[16px] font-extrabold text-ink">{L('Reclamo', 'Claim')}</div><button onClick={() => setClaim(null)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-lilac-2"><X size={15} stroke={2.4} className="text-ink" /></button></div>
        <div className="flex flex-col gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5"><Pill tone={claim.status === 'resuelto' ? 'green' : claim.status === 'rechazado' ? 'pink' : claim.status === 'en_revision' ? 'purple' : 'amber'}>{L(st.es, st.en)}</Pill>{claim.ref_code && <span className="font-mono text-[10.5px] font-extrabold text-muted-2">{claim.ref_code}</span>}</div>
            <div className="mt-1.5 text-[15px] font-extrabold leading-snug text-ink">{claim.reason}</div>
            <div className="mt-0.5 text-[11.5px] font-semibold text-muted-2">{claim.business_name ?? '—'} · {claim.claimant_email} · {claim.hours_open}h</div>
          </div>
          {claim.business_id && <button onClick={() => { const id = claim.business_id as string; setClaim(null); void openBiz(id); }} className="flex min-h-[42px] cursor-pointer items-center gap-2 rounded-field bg-app px-3 py-2 text-left"><Store size={15} stroke={2.2} className="flex-none text-primary-dark" /><span className="flex-1 truncate text-[12px] font-bold text-ink">{L('Ver el negocio', 'Open the business')}</span><ChevronRight size={14} className="text-muted-2" /></button>}
          <div className="flex flex-col gap-2">
            {(claim.messages ?? []).map((m, i) => {
              const mine = m.side === 'admin';
              return <div key={i} className={`max-w-[86%] rounded-card-sm px-3 py-2 ${mine ? 'self-end bg-primary text-white' : m.side === 'negocio' ? 'self-start bg-lilac-2 text-ink' : 'self-start bg-app text-ink'}`}><div className={`text-[9.5px] font-extrabold uppercase tracking-[.04em] ${mine ? 'text-white/70' : 'text-muted-2'}`}>{m.side === 'admin' ? 'To’Latino' : m.side === 'negocio' ? L('Negocio', 'Business') : L('Cliente', 'Customer')} · {timeAgo(m.at, es)}</div><div className={`mt-0.5 whitespace-pre-wrap break-words text-[12.5px] font-medium leading-relaxed ${mine ? 'text-white' : 'text-ink-2'}`}>{m.text}</div></div>;
            })}
          </div>
          {closed && claim.resolution && <div className="rounded-field bg-green-bg px-3 py-2.5"><div className="text-[10px] font-extrabold uppercase tracking-[.04em] text-green-dark">{L('Resolución', 'Resolution')}</div><div className="mt-0.5 text-[12px] font-medium leading-relaxed text-ink-2">{claim.resolution}</div></div>}
          <div className="border-t border-hair pt-3"><textarea value={cmsg} onChange={(e) => setCmsg(e.target.value)} rows={2} placeholder={L('Escribe al cliente y al negocio…', 'Write to the customer and business…')} className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium text-ink outline-none focus:border-primary" /><button disabled={busy || !cmsg.trim()} onClick={sendClaimMsg} className="mt-2 min-h-[44px] w-full cursor-pointer rounded-btn-lg bg-primary text-[13px] font-extrabold text-white shadow-cta-sm disabled:opacity-40">{busy ? L('Enviando…', 'Sending…') : L('Enviar mensaje', 'Send message')}</button></div>
          {!closed && (
            <div className="flex flex-wrap gap-2 border-t border-hair pt-3">
              {claim.status === 'abierto' && <button onClick={() => ask({ title: L('Tomar el caso', 'Take the case'), sub: claim.reason, run: () => adminUpdateClaim({ id: claim.id, status: 'en_revision', assignMe: true }), after: () => { setClaim(null); reloadClaims(); } })} className="min-h-[42px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white text-[12px] font-extrabold text-ink-2">{L('Tomar el caso', 'Take the case')}</button>}
              <button onClick={() => ask({ title: L('Resolver reclamo', 'Resolve claim'), sub: claim.reason, reasonRequired: true, run: (r) => adminUpdateClaim({ id: claim.id, status: 'resuelto', assignMe: true, resolution: r }), after: () => { setClaim(null); reloadClaims(); } })} className="min-h-[42px] flex-1 cursor-pointer rounded-btn bg-primary text-[12px] font-extrabold text-white shadow-cta-sm">{L('Resolver', 'Resolve')}</button>
              <button onClick={() => ask({ title: L('Rechazar reclamo', 'Reject claim'), sub: claim.reason, tone: 'danger', reasonRequired: true, run: (r) => adminUpdateClaim({ id: claim.id, status: 'rechazado', assignMe: true, resolution: r }), after: () => { setClaim(null); reloadClaims(); } })} className="min-h-[42px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-pink-dark bg-white text-[12px] font-extrabold text-pink-dark">{L('Rechazar', 'Reject')}</button>
            </div>
          )}
        </div>
      </Sheet>
    );
  }

  function UserDetailSheet() {
    return (
      <Sheet onClose={() => setUOpen(false)} w={540}>
        <div className="mb-3 flex items-center justify-between"><div className="text-[16px] font-extrabold text-ink">{L('Usuario', 'User')}</div><button onClick={() => setUOpen(false)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-lilac-2"><X size={15} stroke={2.4} className="text-ink" /></button></div>
        {!uDetail ? <SkeletonList count={3} /> : (() => {
          const p = (uDetail.profile ?? {}) as Record<string, unknown>;
          const susp = !!p.suspended_until && new Date(String(p.suspended_until)) > new Date();
          return (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-[15px] font-extrabold text-white" style={{ background: String(p.avatar_color ?? '#7B61FF') }}>{String(p.initials ?? uDetail.email[0] ?? '?').toUpperCase()}</span>
                <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-extrabold text-ink">{String(p.display_name ?? L('Sin nombre', 'No name'))}</div><div className="truncate text-[11.5px] font-semibold text-muted-2">{uDetail.email}</div></div>
                {uDetail.admin_role && <Pill tone="purple">{uDetail.admin_role}</Pill>}
              </div>
              {susp && <div className="rounded-field bg-pink-bg px-3 py-2.5"><div className="text-[11.5px] font-extrabold text-pink-dark">{L('Cuenta suspendida', 'Account suspended')}</div><div className="mt-0.5 text-[11px] font-medium text-ink-3">{String(p.suspended_reason ?? '')}</div></div>}
              <div className="grid grid-cols-3 gap-2">{Object.entries(uDetail.counts).filter(([, v]) => v > 0).map(([k, v]) => <div key={k} className="rounded-field bg-app px-2 py-2 text-center"><div className="text-[15px] font-extrabold text-ink">{v}</div><div className="text-[9.5px] font-bold uppercase text-muted-2">{k}</div></div>)}</div>
              {uDetail.businesses.length > 0 && <div><div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Negocios', 'Businesses')}</div><div className="flex flex-col gap-1.5">{uDetail.businesses.map((b) => <button key={b.id} onClick={() => { setUOpen(false); void openBiz(b.id); }} className="flex min-h-[42px] cursor-pointer items-center gap-2 rounded-field bg-app px-2.5 py-2 text-left"><span className="min-w-0 flex-1 truncate text-[12px] font-bold text-ink">{b.name}</span><Pill tone={TIER_TONE[b.tier] ?? 'gray'}>{b.tier}</Pill><ChevronRight size={14} className="text-muted-2" /></button>)}</div></div>}
              <div className="mt-1 flex gap-2 border-t border-hair pt-3">
                {susp ? <button onClick={() => ask({ title: L('Reactivar cuenta', 'Restore account'), sub: uDetail.email, run: () => adminUnsuspendUser(uDetail.id), after: () => { reloadUsers(); void openUser(uDetail.id); } })} className="min-h-[44px] flex-1 cursor-pointer rounded-btn-lg bg-primary text-[13px] font-extrabold text-white shadow-cta-sm">{L('Reactivar cuenta', 'Restore account')}</button>
                  : uDetail.admin_role ? <div className="flex-1 rounded-field bg-lilac-2 px-3 py-2.5 text-center text-[11.5px] font-bold text-ink-2">{L('Es administrador — no se puede suspender', 'Is an admin — cannot be suspended')}</div>
                  : <button onClick={() => ask({ title: L('Suspender usuario', 'Suspend user'), sub: uDetail.email, tone: 'danger', needsDuration: true, reasonRequired: true, run: (r, d) => adminSuspendUser(uDetail.id, d, r), after: () => { reloadUsers(); void openUser(uDetail.id); } })} className="min-h-[44px] flex-1 cursor-pointer rounded-btn-lg border-[1.5px] border-pink-dark bg-white text-[13px] font-extrabold text-pink-dark">{L('Suspender', 'Suspend')}</button>}
              </div>
            </div>
          );
        })()}
      </Sheet>
    );
  }

  function BizDetailSheet() {
    return (
      <Sheet onClose={() => setBOpen(false)} w={560}>
        <div className="mb-3 flex items-center justify-between"><div className="text-[16px] font-extrabold text-ink">{L('Negocio', 'Business')}</div><button onClick={() => setBOpen(false)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-lilac-2"><X size={15} stroke={2.4} className="text-ink" /></button></div>
        {!bDetail ? <SkeletonList count={3} /> : (() => {
          const b = bDetail.business as Record<string, unknown>; const id = String(b.id); const suspended = b.suspended === true;
          return (
            <div className="flex flex-col gap-3">
              <div><div className="flex flex-wrap items-center gap-1.5"><span className="text-[16px] font-extrabold text-ink">{String(b.name)}</span><Pill tone={TIER_TONE[String(b.tier)] ?? 'gray'}>{String(b.tier)}</Pill>{suspended && <Pill tone="pink">{L('Suspendido', 'Suspended')}</Pill>}</div><div className="mt-0.5 text-[11.5px] font-semibold text-muted-2">{String(b.category_id)} · {String(b.city ?? '—')} · {bDetail.owner.email}</div></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-field bg-app px-2 py-2 text-center"><div className="text-[14px] font-extrabold text-ink">{money(bDetail.money.gross_30)}</div><div className="text-[9px] font-bold uppercase text-muted-2">{L('ventas 30d', 'sales 30d')}</div></div>
                <div className="rounded-field bg-app px-2 py-2 text-center"><div className="text-[14px] font-extrabold text-ink">{money(bDetail.money.fees_30)}</div><div className="text-[9px] font-bold uppercase text-muted-2">{L('comisión', 'commission')}</div></div>
                <div className="rounded-field bg-app px-2 py-2 text-center"><div className="text-[14px] font-extrabold text-ink">{bDetail.money.tx_30}</div><div className="text-[9px] font-bold uppercase text-muted-2">tx</div></div>
              </div>
              <div><div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Plan', 'Plan')}</div><div className="flex gap-2">{(['free', 'verified', 'premium'] as const).map((t) => <button key={t} disabled={String(b.tier) === t} onClick={() => ask({ title: L('Cambiar plan', 'Change plan'), sub: `${String(b.name)} → ${t}`, reasonRequired: true, run: (r) => adminSetTier(id, t, r), after: () => { reloadBiz(); void openBiz(id); } })} className={`min-h-[40px] flex-1 cursor-pointer rounded-btn text-[11.5px] font-extrabold ${String(b.tier) === t ? 'bg-primary text-white' : 'border-[1.5px] border-lilac-line bg-white text-ink-2'}`}>{t}</button>)}</div></div>
              <div className="flex flex-wrap gap-2 border-t border-hair pt-3">
                <a href={`/negocios?b=${String(b.slug)}`} target="_blank" rel="noreferrer" className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-btn border-[1.5px] border-lilac-line bg-white text-[12px] font-extrabold text-ink-2">{L('Ver como cliente', 'View as customer')}</a>
                {suspended ? <button onClick={() => ask({ title: L('Reactivar negocio', 'Restore business'), sub: String(b.name), run: () => adminSuspendBusiness(id, false, ''), after: () => { reloadBiz(); void openBiz(id); } })} className="min-h-[44px] flex-1 cursor-pointer rounded-btn bg-primary text-[12px] font-extrabold text-white shadow-cta-sm">{L('Reactivar', 'Restore')}</button>
                  : <button onClick={() => ask({ title: L('Suspender negocio', 'Suspend business'), sub: String(b.name), warn: L('Desaparece de la búsqueda y su página deja de abrir. El dueño recibe aviso.', 'Disappears from search and its page stops opening. Owner is notified.'), tone: 'danger', reasonRequired: true, run: (r) => adminSuspendBusiness(id, true, r), after: () => { reloadBiz(); void openBiz(id); } })} className="min-h-[44px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-pink-dark bg-white text-[12px] font-extrabold text-pink-dark">{L('Suspender', 'Suspend')}</button>}
              </div>
            </div>
          );
        })()}
      </Sheet>
    );
  }

}
