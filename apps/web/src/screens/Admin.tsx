'use client';

// Super Admin — Fases 1 y 2 (plan: docs/ADMIN-DASHBOARD-PLAN.md).
// F1: Inicio (mission control) · Usuarios · Negocios · Licencias · Bitácora.
// F2: Moderación (reportes) · Reclamos (hilo con el cliente) · Dinero (ledger,
//     pagos atascados, reembolso manual) · Pedidos (las 4 superficies en una).
// Guard: sin fila en `admins` la pantalla muestra 404 y ningún RPC devuelve datos
// (la verificación real vive en el servidor, no aquí). Mobile-first: el founder
// administra desde el teléfono; en ≥lg el nav pasa a barra lateral fija.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconAlertTriangle as Alert, IconArrowLeft as ArrowLeft, IconBuildingStore as Store,
  IconCash as Cash, IconCertificate as Certificate, IconChartBar as Chart,
  IconChevronRight as ChevronRight, IconClipboardList as Clipboard, IconFlag as Flag,
  IconHistory as History, IconHome as Home, IconMenu2 as Menu, IconMessage2 as Message,
  IconPackage as Package, IconSettings as Settings, IconShieldLock as Shield,
  IconUsers as Users, IconX as X,
} from '@tabler/icons-react';
import type { Icon as TablerIcon } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Card, Chip, Overlay, OverlayTitle, PrimaryBtn, SkeletonList } from '@/components/ui';
import { Toast } from '@/screens/negocio/modules/_page';
import {
  fetchAdminMe, fetchAdminDashboard, fetchAdminUsers, fetchAdminUser, adminSuspendUser,
  adminUnsuspendUser, fetchAdminBusinesses, fetchAdminBusiness, adminSuspendBusiness,
  adminSetTier, fetchLicenseQueue, adminVerifyLicense, fetchAdminAudit,
  ROLE_LABEL, money, compact, timeAgo,
  fetchReports, adminHandleReport, ENTITY_LABEL, DELETABLE,
  fetchAdminClaims, adminUpdateClaim, claimAddMessage, CLAIM_STATUS, CLAIM_KIND,
  fetchPayments, fetchPendingMonitor, adminRetryPending, adminRefundPayment,
  fetchGlobalOrders, adminSetOrderStatus, TX_STATUSES, TX_STATUS_LABEL, TX_KIND,
  type AdminMe, type AdminDash, type AdminUserRow, type AdminUserDetail,
  type AdminBizRow, type AdminBizDetail, type AdminLicenseRow, type AdminAuditRow,
  type ReportRow, type ReportAction, type ClaimRow, type PaymentRow, type PendingRow, type GlobalTxRow,
} from '@/lib/admin';

type Section = 'inicio' | 'usuarios' | 'negocios' | 'licencias' | 'bitacora'
  | 'moderacion' | 'reclamos' | 'dinero' | 'pedidos' | 'contenido' | 'catalogo' | 'sistema';

const NAV: { id: Section; es: string; en: string; Icon: TablerIcon; phase: 1 | 2 | 3 }[] = [
  { id: 'inicio',     es: 'Inicio',       en: 'Home',       Icon: Home,        phase: 1 },
  { id: 'usuarios',   es: 'Usuarios',     en: 'Users',      Icon: Users,       phase: 1 },
  { id: 'negocios',   es: 'Negocios',     en: 'Businesses', Icon: Store,       phase: 1 },
  { id: 'licencias',  es: 'Licencias',    en: 'Licenses',   Icon: Certificate, phase: 1 },
  { id: 'bitacora',   es: 'Bitácora',     en: 'Audit log',  Icon: History,     phase: 1 },
  { id: 'moderacion', es: 'Moderación',   en: 'Moderation', Icon: Flag,        phase: 2 },
  { id: 'reclamos',   es: 'Reclamos',     en: 'Claims',     Icon: Message,     phase: 2 },
  { id: 'dinero',     es: 'Dinero',       en: 'Money',      Icon: Cash,        phase: 2 },
  { id: 'pedidos',    es: 'Pedidos',      en: 'Orders',     Icon: Package,     phase: 2 },
  { id: 'contenido',  es: 'Contenido',    en: 'Content',    Icon: Clipboard,   phase: 3 },
  { id: 'catalogo',   es: 'Catálogo',     en: 'Catalog',    Icon: Chart,       phase: 3 },
  { id: 'sistema',    es: 'Sistema',      en: 'System',     Icon: Settings,    phase: 3 },
];

/** ¿Esta acción exige razón antes de dejar confirmar? Espeja lo que el servidor
 *  rechaza — el servidor sigue siendo la autoridad; esto solo evita el viaje. */
function reasonRequired(a: { kind: string; extra?: string }): boolean {
  if (a.kind === 'lic') return a.extra === 'reject';
  if (a.kind === 'report') return a.extra === 'hide' || a.extra === 'delete';
  if (a.kind === 'claim') return a.extra === 'resuelto' || a.extra === 'rechazado';
  return true; // user-susp, biz-susp, biz-tier, refund, tx
}

const TIERS = ['free', 'verified', 'premium'] as const;
const TIER_CLS: Record<string, string> = {
  free: 'bg-lilac-2 text-ink-2', verified: 'bg-green-bg text-green-dark', premium: 'bg-amber-bg text-amber-ink',
};

export function AdminScreen() {
  const { L } = useLang();
  const es = L('x', 'y') === 'x';
  const { user, loading: authLoading } = useAuth();

  const [me, setMe] = useState<AdminMe | null>(null);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState<Section>('inicio');
  const [navOpen, setNavOpen] = useState(false);
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2400); };

  // ── guard: ¿soy admin? (la verdad la tiene el servidor) ──
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setMe(null); setChecking(false); return; }
    let off = false;
    void fetchAdminMe().then((m) => { if (!off) { setMe(m); setChecking(false); } });
    return () => { off = true; };
  }, [user, authLoading]);

  // ── datos por sección ──
  const [dash, setDash] = useState<AdminDash | null>(null);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [uq, setUq] = useState(''); const [uState, setUState] = useState('all'); const [uPage, setUPage] = useState(0);
  const [biz, setBiz] = useState<AdminBizRow[] | null>(null);
  const [bq, setBq] = useState(''); const [bTier, setBTier] = useState('all'); const [bState, setBState] = useState('all'); const [bPage, setBPage] = useState(0);
  const [lic, setLic] = useState<AdminLicenseRow[] | null>(null);
  const [audit, setAudit] = useState<AdminAuditRow[] | null>(null);
  // Fase 2
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [rStatus, setRStatus] = useState('pendiente'); const [rType, setRType] = useState('all');
  const [claims, setClaims] = useState<ClaimRow[] | null>(null);
  const [cStatus, setCStatus] = useState('all');
  const [pays, setPays] = useState<PaymentRow[] | null>(null);
  const [pq, setPq] = useState(''); const [pKind, setPKind] = useState('all'); const [pStatus, setPStatus] = useState('all'); const [pPage, setPPage] = useState(0);
  const [stuck, setStuck] = useState<PendingRow[] | null>(null);
  const [txs, setTxs] = useState<GlobalTxRow[] | null>(null);
  const [oq, setOq] = useState(''); const [oKind, setOKind] = useState('all'); const [oStatus, setOStatus] = useState('all'); const [oPage, setOPage] = useState(0);

  const reloadDash = useCallback(() => { void fetchAdminDashboard().then(setDash); }, []);
  const reloadUsers = useCallback(() => {
    setUsers(null);
    void fetchAdminUsers(uq, uState, 30, uPage * 30).then(setUsers);
  }, [uq, uState, uPage]);
  const reloadBiz = useCallback(() => {
    setBiz(null);
    void fetchAdminBusinesses({ q: bq, tier: bTier, state: bState, limit: 30, offset: bPage * 30 }).then(setBiz);
  }, [bq, bTier, bState, bPage]);
  const reloadLic = useCallback(() => { setLic(null); void fetchLicenseQueue().then(setLic); }, []);
  const reloadAudit = useCallback(() => { setAudit(null); void fetchAdminAudit({ limit: 60 }).then(setAudit); }, []);
  const reloadReports = useCallback(() => { setReports(null); void fetchReports(rStatus, rType).then(setReports); }, [rStatus, rType]);
  const reloadClaims = useCallback(() => { setClaims(null); void fetchAdminClaims(cStatus).then(setClaims); }, [cStatus]);
  const reloadPays = useCallback(() => {
    setPays(null); setStuck(null);
    void fetchPayments({ q: pq, kind: pKind, status: pStatus, limit: 40, offset: pPage * 40 }).then(setPays);
    void fetchPendingMonitor().then(setStuck);
  }, [pq, pKind, pStatus, pPage]);
  const reloadTxs = useCallback(() => {
    setTxs(null);
    void fetchGlobalOrders({ q: oq, kind: oKind, status: oStatus, limit: 40, offset: oPage * 40 }).then(setTxs);
  }, [oq, oKind, oStatus, oPage]);

  useEffect(() => {
    if (!me) return;
    if (section === 'inicio') reloadDash();
    if (section === 'usuarios') reloadUsers();
    if (section === 'negocios') reloadBiz();
    if (section === 'licencias') reloadLic();
    if (section === 'bitacora') reloadAudit();
    if (section === 'moderacion') reloadReports();
    if (section === 'reclamos') reloadClaims();
    if (section === 'dinero') reloadPays();
    if (section === 'pedidos') reloadTxs();
  }, [me, section, reloadDash, reloadUsers, reloadBiz, reloadLic, reloadAudit, reloadReports, reloadClaims, reloadPays, reloadTxs]);

  // búsqueda con debounce
  const uTimer = useRef<number | undefined>(undefined);
  const onUq = (v: string) => {
    setUq(v); setUPage(0);
    window.clearTimeout(uTimer.current);
    uTimer.current = window.setTimeout(() => setUsers(null), 10);
  };
  const bTimer = useRef<number | undefined>(undefined);
  const onBq = (v: string) => {
    setBq(v); setBPage(0);
    window.clearTimeout(bTimer.current);
    bTimer.current = window.setTimeout(() => setBiz(null), 10);
  };
  // Fase 2: el ledger y los pedidos son tablas grandes — el texto se debouncea
  // para no lanzar una consulta por tecla.
  const [pqRaw, setPqRaw] = useState('');
  useEffect(() => { const t = window.setTimeout(() => { setPq(pqRaw); setPPage(0); }, 350); return () => window.clearTimeout(t); }, [pqRaw]);
  const [oqRaw, setOqRaw] = useState('');
  useEffect(() => { const t = window.setTimeout(() => { setOq(oqRaw); setOPage(0); }, 350); return () => window.clearTimeout(t); }, [oqRaw]);

  // ── detalles / acciones ──
  const [uDetail, setUDetail] = useState<AdminUserDetail | null>(null);
  const [uOpen, setUOpen] = useState(false);
  const [bDetail, setBDetail] = useState<AdminBizDetail | null>(null);
  const [bOpen, setBOpen] = useState(false);
  type ActKind = 'user-susp' | 'biz-susp' | 'biz-tier' | 'lic' | 'report' | 'refund' | 'tx' | 'claim';
  const [act, setAct] = useState<{ kind: ActKind; id: string; name: string; extra?: string } | null>(null);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  // hilo del reclamo abierto
  const [claim, setClaim] = useState<ClaimRow | null>(null);
  const [msg, setMsg] = useState('');

  const openUser = async (id: string) => {
    setUOpen(true); setUDetail(null);
    const d = await fetchAdminUser(id);
    if (!d) { flash(L('No se pudo cargar el usuario', 'Could not load user')); setUOpen(false); return; }
    setUDetail(d);
  };
  const openBiz = async (id: string) => {
    setBOpen(true); setBDetail(null);
    const d = await fetchAdminBusiness(id);
    if (!d) { flash(L('No se pudo cargar el negocio', 'Could not load business')); setBOpen(false); return; }
    setBDetail(d);
  };

  const runAction = async () => {
    if (!act || busy) return;
    setBusy(true);
    let err: string | null = null;
    if (act.kind === 'user-susp') err = await adminSuspendUser(act.id, days, reason.trim());
    if (act.kind === 'biz-susp') err = await adminSuspendBusiness(act.id, true, reason.trim());
    if (act.kind === 'biz-tier') err = await adminSetTier(act.id, act.extra ?? 'free', reason.trim());
    if (act.kind === 'lic') err = await adminVerifyLicense(act.id, act.extra === 'approve', reason.trim() || undefined);
    if (act.kind === 'report') err = await adminHandleReport(act.id, (act.extra ?? 'reviewed') as ReportAction, reason.trim() || undefined);
    if (act.kind === 'refund') err = await adminRefundPayment(act.id, reason.trim());
    if (act.kind === 'tx') {
      const [k, st] = (act.extra ?? '').split(':');
      err = await adminSetOrderStatus(k, act.id, st, reason.trim());
    }
    if (act.kind === 'claim') {
      const st = act.extra ?? 'en_revision';
      const closing = st === 'resuelto' || st === 'rechazado';
      err = await adminUpdateClaim({ id: act.id, status: st, assignMe: true, resolution: closing ? reason.trim() : undefined });
    }
    setBusy(false);
    if (err) {
      flash(/razón|obligatoria|cómo se resolvió|escribe/i.test(err)
        ? L('Falta la razón — escríbela', 'A reason is required')
        : L('No se pudo aplicar', 'Could not apply'));
      return;
    }
    flash(act.kind === 'refund'
      ? L('Reembolsado — el cliente recibió el aviso', 'Refunded — the customer was notified')
      : L('Listo — quedó en la bitácora', 'Done — logged in the audit trail'));
    setAct(null); setReason('');
    if (act.kind === 'user-susp') { reloadUsers(); if (uDetail?.id === act.id) void openUser(act.id); }
    if (act.kind.startsWith('biz')) { reloadBiz(); if (bDetail && (bDetail.business.id as string) === act.id) void openBiz(act.id); }
    if (act.kind === 'lic') reloadLic();
    if (act.kind === 'report') reloadReports();
    if (act.kind === 'refund') reloadPays();
    if (act.kind === 'tx') reloadTxs();
    if (act.kind === 'claim') { setClaim(null); reloadClaims(); }
    reloadDash();
  };

  const sendClaimMsg = async () => {
    if (!claim || !msg.trim() || busy) return;
    setBusy(true);
    const err = await claimAddMessage(claim.id, msg.trim());
    setBusy(false);
    if (err) { flash(L('No se pudo enviar', 'Could not send')); return; }
    // refresca el hilo desde el servidor (el mensaje lleva la hora del servidor)
    setMsg('');
    const fresh = await fetchAdminClaims(cStatus);
    setClaims(fresh);
    setClaim(fresh.find((c) => c.id === claim.id) ?? null);
  };

  const retryPending = async (id: string) => {
    const r = await adminRetryPending(id);
    flash(r.msg || L('Sin respuesta', 'No response'));
    reloadPays(); reloadDash();
  };

  const undoSuspendUser = async (id: string) => {
    const err = await adminUnsuspendUser(id);
    flash(err ? L('No se pudo reactivar', 'Could not restore') : L('Cuenta reactivada', 'Account restored'));
    if (!err) { reloadUsers(); void openUser(id); reloadDash(); }
  };
  const undoSuspendBiz = async (id: string) => {
    const err = await adminSuspendBusiness(id, false, '');
    flash(err ? L('No se pudo reactivar', 'Could not restore') : L('Negocio reactivado', 'Business restored'));
    if (!err) { reloadBiz(); void openBiz(id); reloadDash(); }
  };

  // ══════════════════════════ GUARD ══════════════════════════
  if (authLoading || checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5">
        <div className="text-[13px] font-bold text-muted-2">{L('Verificando acceso…', 'Verifying access…')}</div>
      </div>
    );
  }
  if (!me) {
    // 404 amable: no confirmamos ni negamos que /admin exista.
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-lilac-2">
          <Shield size={28} stroke={2} className="text-primary-dark" />
        </span>
        <h1 className="mt-5 text-[22px] font-extrabold text-ink">{L('Página no encontrada', 'Page not found')}</h1>
        <p className="mt-2 max-w-[380px] text-[13px] font-medium leading-relaxed text-muted">
          {L('La dirección que buscas no existe o no tienes acceso.', "The page you're looking for doesn't exist or you don't have access.")}
        </p>
        <a href="/" className="mt-6 cursor-pointer rounded-btn-lg bg-primary px-6 py-3 text-[13.5px] font-extrabold text-white shadow-cta">
          {L('Ir al inicio', 'Go home')}
        </a>
      </div>
    );
  }

  // ══════════════════════════ NAV ══════════════════════════
  const navList = (
    <nav className="flex flex-col gap-0.5 p-2">
      {NAV.map((n) => {
        const on = section === n.id;
        const soon = n.phase > 2;
        const badge = n.id === 'licencias' ? dash?.alerts.licenses_pending
          : n.id === 'moderacion' ? dash?.alerts.reports_pending
          : n.id === 'reclamos' ? dash?.alerts.claims_open
          : n.id === 'dinero' ? dash?.alerts.stuck_fulfilling : 0;
        return (
          <button
            key={n.id}
            onClick={() => { if (soon) { flash(L(`${es ? n.es : n.en} llega en la Fase ${n.phase}`, `${n.en} arrives in Phase ${n.phase}`)); return; } setSection(n.id); setNavOpen(false); }}
            className={`flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-btn px-3 py-2.5 text-left text-[13px] font-extrabold transition-colors ${
              on ? 'bg-primary text-white' : soon ? 'text-muted-2' : 'text-ink-2 hover:bg-lilac-3'}`}
          >
            <n.Icon size={17} stroke={2.2} className={on ? 'text-white' : soon ? 'text-muted-faint' : 'text-primary-dark'} />
            <span className="flex-1">{L(n.es, n.en)}</span>
            {soon && <span className="rounded-full bg-lilac-2 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase text-muted-2">F{n.phase}</span>}
            {!soon && !!badge && !on && (
              <span className="rounded-full bg-amber-bg px-1.5 py-0.5 text-[9px] font-extrabold text-amber-ink">{badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const sectionTitle = NAV.find((n) => n.id === section);

  // ══════════════════════════ SECCIONES ══════════════════════════
  const kpi = (label: string, value: string, sub?: string, tone: 'ink' | 'green' | 'amber' = 'ink') => (
    <Card className="p-3.5">
      <div className="text-[10.5px] font-bold uppercase tracking-[.04em] text-muted-2">{label}</div>
      <div className={`mt-1 text-[22px] font-extrabold tracking-[-.02em] ${tone === 'green' ? 'text-green-dark' : tone === 'amber' ? 'text-amber-ink' : 'text-ink'}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10.5px] font-semibold text-muted-2">{sub}</div>}
    </Card>
  );

  const inicio = (
    <div className="flex flex-col gap-4">
      {!dash ? <SkeletonList count={4} className="grid grid-cols-2 gap-2.5" /> : (
        <>
          {/* alertas accionables — solo las que importan ahora */}
          {(() => {
            const a = dash.alerts;
            const items: { k: string; n: number; es: string; en: string; go?: Section }[] = ([
              { k: 'stuck', n: a.stuck_fulfilling, es: 'pagos atascados sin entregar', en: 'payments stuck unfulfilled', go: 'dinero' },
              { k: 'lic', n: a.licenses_pending, es: 'licencias por verificar', en: 'licenses to verify', go: 'licencias' },
              { k: 'rep', n: a.reports_pending, es: 'reportes sin revisar', en: 'reports pending', go: 'moderacion' },
              { k: 'cla', n: a.claims_open, es: 'reclamos abiertos', en: 'open claims', go: 'reclamos' },
              { k: 'bsu', n: a.businesses_suspended, es: 'negocios suspendidos', en: 'suspended businesses', go: 'negocios' },
              { k: 'usu', n: a.users_suspended, es: 'usuarios suspendidos', en: 'suspended users', go: 'usuarios' },
            ] as { k: string; n: number; es: string; en: string; go?: Section }[]).filter((x) => x.n > 0);
            if (!items.length) return (
              <Card className="flex items-center gap-3 p-3.5">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-green-bg"><Shield size={17} stroke={2.2} className="text-green-dark" /></span>
                <div className="text-[12.5px] font-bold text-ink-2">{L('Todo en orden — nada requiere tu atención.', 'All clear — nothing needs your attention.')}</div>
              </Card>
            );
            return (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-ink">
                  <Alert size={15} stroke={2.4} className="text-amber-ink" /> {L('Requiere tu atención', 'Needs your attention')}
                </div>
                {items.map((x) => (
                  <button key={x.k} onClick={() => x.go && setSection(x.go)}
                    className={`flex min-h-[44px] items-center gap-3 rounded-card-sm border border-hair bg-white p-3 text-left shadow-card ${x.go ? 'cursor-pointer' : 'cursor-default'}`}>
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-tile bg-amber-bg text-[12.5px] font-extrabold text-amber-ink">{x.n}</span>
                    <span className="min-w-0 flex-1 text-[12.5px] font-bold text-ink-2">{L(x.es, x.en)}</span>
                    {x.go && <ChevronRight size={16} stroke={2.4} className="flex-none text-muted-2" />}
                  </button>
                ))}
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {kpi(L('Usuarios', 'Users'), compact(dash.users.total), `+${dash.users.new7} ${L('en 7 días', 'in 7 days')}`)}
            {kpi(L('Negocios', 'Businesses'), compact(dash.businesses.total), `${dash.businesses.verified + dash.businesses.premium} ${L('de pago', 'paid')}`)}
            {kpi(L('Ventas 30 días', 'Sales 30 days'), money(dash.money.gmv_30), `${dash.money.tx_30} ${L('transacciones', 'transactions')}`, 'green')}
            {kpi(L('Comisión 30 días', 'Commission 30 days'), money(dash.money.fees_30), L('ingreso de To’Latino', 'To’Latino revenue'), 'amber')}
          </div>

          <Card className="p-3.5">
            <div className="mb-2.5 text-[13px] font-extrabold text-ink">{L('Dinero', 'Money')}</div>
            <div className="grid grid-cols-3 gap-2">
              {[[L('Hoy', 'Today'), dash.money.gmv_today], [L('7 días', '7 days'), dash.money.gmv_7], [L('30 días', '30 days'), dash.money.gmv_30]].map(([lb, v]) => (
                <div key={String(lb)} className="rounded-field bg-app px-2.5 py-2">
                  <div className="text-[10px] font-bold text-muted-2">{String(lb)}</div>
                  <div className="mt-0.5 text-[14px] font-extrabold text-ink">{money(Number(v))}</div>
                </div>
              ))}
            </div>
            {dash.money.refunded_30 > 0 && (
              <div className="mt-2 text-[10.5px] font-semibold text-muted-2">{L('Reembolsado 30 días', 'Refunded 30 days')}: {money(dash.money.refunded_30)}</div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            <Card className="p-3.5">
              <div className="mb-2 text-[13px] font-extrabold text-ink">{L('Transacciones de hoy', "Today's transactions")}</div>
              <div className="grid grid-cols-2 gap-2">
                {[[L('Pedidos', 'Orders'), dash.tx.orders_today], [L('Reservas', 'Bookings'), dash.tx.bookings_today],
                  [L('Rentas', 'Rentals'), dash.tx.rentals_today], [L('Boletos', 'Tickets'), dash.tx.tickets_today]].map(([lb, v]) => (
                  <div key={String(lb)} className="flex items-center justify-between rounded-field bg-app px-2.5 py-2">
                    <span className="text-[11px] font-bold text-muted-2">{String(lb)}</span>
                    <span className="text-[13px] font-extrabold text-ink">{String(v)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-3.5">
              <div className="mb-2 text-[13px] font-extrabold text-ink">{L('Contenido vivo', 'Live content')}</div>
              <div className="grid grid-cols-2 gap-2">
                {[[L('Posts 7d', 'Posts 7d'), dash.content.posts7], [L('Eventos', 'Events'), dash.content.events_upcoming],
                  [L('Propiedades', 'Listings'), dash.content.properties], [L('Autos', 'Vehicles'), dash.content.vehicles]].map(([lb, v]) => (
                  <div key={String(lb)} className="flex items-center justify-between rounded-field bg-app px-2.5 py-2">
                    <span className="text-[11px] font-bold text-muted-2">{String(lb)}</span>
                    <span className="text-[13px] font-extrabold text-ink">{String(v)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-3.5">
            <div className="mb-2 text-[13px] font-extrabold text-ink">{L('Pagos recientes', 'Recent payments')}</div>
            {dash.recent_payments.length === 0 ? (
              <div className="py-4 text-center text-[12px] font-semibold text-muted-2">{L('Todavía no hay pagos.', 'No payments yet.')}</div>
            ) : (
              <div className="divide-y divide-[rgba(30,27,46,.06)]">
                {dash.recent_payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5 py-2">
                    <span className={`h-2 w-2 flex-none rounded-full ${p.status === 'paid' ? 'bg-green' : p.status === 'refunded' ? 'bg-pink-dark' : 'bg-muted-faint'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-extrabold text-ink">{p.business ?? L('Sin negocio', 'No business')}</span>
                      <span className="block text-[10.5px] font-semibold text-muted-2">{p.kind} · {timeAgo(p.created_at, es)}</span>
                    </span>
                    <span className="flex-none text-[13px] font-extrabold text-ink">{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );

  const searchBox = (value: string, onChange: (v: string) => void, ph: string) => (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph}
      className="min-h-[44px] w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted-2 focus:border-primary" />
  );

  const usuarios = (
    <div className="flex flex-col gap-3">
      {searchBox(uq, onUq, L('Buscar por correo o nombre…', 'Search by email or name…'))}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {[['all', L('Todos', 'All')], ['owners', L('Dueños de negocio', 'Business owners')], ['suspended', L('Suspendidos', 'Suspended')]].map(([k, lb]) => (
          <Chip key={k} active={uState === k} onClick={() => { setUState(k); setUPage(0); }}>{lb}</Chip>
        ))}
      </div>
      {users === null ? <SkeletonList count={6} /> : users.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <div className="text-[13.5px] font-extrabold text-ink">{L('Sin resultados', 'No results')}</div>
          <div className="mt-1 text-[11.5px] font-medium text-muted-2">{L('Prueba con otro correo o nombre.', 'Try another email or name.')}</div>
        </Card>
      ) : (
        <>
          <div className="text-[11px] font-bold text-muted-2">{users[0]?.total_count ?? 0} {L('usuarios', 'users')}</div>
          <div className="grid grid-cols-1 gap-2">
            {users.map((u) => {
              const susp = !!u.suspended_until && new Date(u.suspended_until) > new Date();
              return (
                <button key={u.id} onClick={() => void openUser(u.id)} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-card-sm border border-hair bg-white p-3 text-left shadow-card">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[11.5px] font-extrabold text-white" style={{ background: u.avatar_color ?? '#7B61FF' }}>
                    {u.initials ?? (u.email[0] ?? '?').toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="min-w-0 truncate text-[12.5px] font-extrabold text-ink">{u.display_name ?? L('Sin nombre', 'No name')}</span>
                      {susp && <span className="flex-none rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-pink-bg text-pink-dark">{L('Suspendido', 'Suspended')}</span>}
                      {u.businesses > 0 && <span className="flex-none rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-lilac-2 text-primary-dark">{u.businesses} {L('neg.', 'biz')}</span>}
                    </span>
                    <span className="block truncate text-[11px] font-semibold text-muted-2">{u.email}</span>
                    <span className="block truncate text-[10.5px] font-medium text-muted-faint">{u.city_label ?? '—'} · {timeAgo(u.created_at, es)}</span>
                  </span>
                  <ChevronRight size={16} stroke={2.4} className="flex-none text-muted-2" />
                </button>
              );
            })}
          </div>
          {(users[0]?.total_count ?? 0) > 30 && (
            <div className="flex items-center justify-between gap-2">
              <button disabled={uPage === 0} onClick={() => setUPage((p) => Math.max(0, p - 1))} className="min-h-[44px] flex-1 cursor-pointer rounded-btn border border-lilac-line bg-white text-[12px] font-extrabold text-ink-2 disabled:opacity-40">{L('Anterior', 'Previous')}</button>
              <span className="text-[11.5px] font-bold text-muted-2">{uPage + 1}</span>
              <button disabled={(uPage + 1) * 30 >= (users[0]?.total_count ?? 0)} onClick={() => setUPage((p) => p + 1)} className="min-h-[44px] flex-1 cursor-pointer rounded-btn border border-lilac-line bg-white text-[12px] font-extrabold text-ink-2 disabled:opacity-40">{L('Siguiente', 'Next')}</button>
            </div>
          )}
        </>
      )}
    </div>
  );

  const negocios = (
    <div className="flex flex-col gap-3">
      {searchBox(bq, onBq, L('Buscar negocio, slug o dueño…', 'Search business, slug or owner…'))}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {[['all', L('Todos', 'All')], ['free', 'Free'], ['verified', 'Verified'], ['premium', 'Premium']].map(([k, lb]) => (
          <Chip key={k} active={bTier === k} onClick={() => { setBTier(k); setBPage(0); }}>{lb}</Chip>
        ))}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {[['all', L('Cualquier estado', 'Any state')], ['suspended', L('Suspendidos', 'Suspended')], ['connect', L('Con Stripe', 'With Stripe')], ['no_connect', L('Sin Stripe', 'No Stripe')]].map(([k, lb]) => (
          <Chip key={k} active={bState === k} onClick={() => { setBState(k); setBPage(0); }}>{lb}</Chip>
        ))}
      </div>
      {biz === null ? <SkeletonList count={6} /> : biz.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <div className="text-[13.5px] font-extrabold text-ink">{L('Sin resultados', 'No results')}</div>
        </Card>
      ) : (
        <>
          <div className="text-[11px] font-bold text-muted-2">{biz[0]?.total_count ?? 0} {L('negocios', 'businesses')}</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {biz.map((b) => (
              <button key={b.id} onClick={() => void openBiz(b.id)} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-card-sm border border-hair bg-white p-3 text-left shadow-card">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="min-w-0 truncate text-[12.5px] font-extrabold text-ink">{b.name}</span>
                    <span className={`flex-none rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase ${TIER_CLS[b.tier] ?? TIER_CLS.free}`}>{b.tier}</span>
                    {b.suspended && <span className="flex-none rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-pink-bg text-pink-dark">{L('Suspendido', 'Suspended')}</span>}
                    {b.license && <span className={`flex-none rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase ${b.verified_license ? 'bg-green-bg text-green-dark' : 'bg-amber-bg text-amber-ink'}`}>{b.verified_license ? L('Lic. ✓', 'Lic. ✓') : L('Lic. pend.', 'Lic. pend.')}</span>}
                  </span>
                  <span className="block truncate text-[11px] font-semibold text-muted-2">{b.category_id} · {b.city ?? '—'}</span>
                  <span className="block truncate text-[10.5px] font-medium text-muted-faint">{b.owner_email ?? L('sin dueño', 'no owner')} · {b.connect ? L('Stripe ✓', 'Stripe ✓') : L('sin Stripe', 'no Stripe')}</span>
                </span>
                <ChevronRight size={16} stroke={2.4} className="flex-none text-muted-2" />
              </button>
            ))}
          </div>
          {(biz[0]?.total_count ?? 0) > 30 && (
            <div className="flex items-center justify-between gap-2">
              <button disabled={bPage === 0} onClick={() => setBPage((p) => Math.max(0, p - 1))} className="min-h-[44px] flex-1 cursor-pointer rounded-btn border border-lilac-line bg-white text-[12px] font-extrabold text-ink-2 disabled:opacity-40">{L('Anterior', 'Previous')}</button>
              <span className="text-[11.5px] font-bold text-muted-2">{bPage + 1}</span>
              <button disabled={(bPage + 1) * 30 >= (biz[0]?.total_count ?? 0)} onClick={() => setBPage((p) => p + 1)} className="min-h-[44px] flex-1 cursor-pointer rounded-btn border border-lilac-line bg-white text-[12px] font-extrabold text-ink-2 disabled:opacity-40">{L('Siguiente', 'Next')}</button>
            </div>
          )}
        </>
      )}
    </div>
  );

  const licencias = (
    <div className="flex flex-col gap-3">
      <Card className="flex items-start gap-2.5 p-3.5">
        <Certificate size={17} stroke={2.2} className="mt-0.5 flex-none text-primary-dark" />
        <div className="text-[11.5px] font-medium leading-relaxed text-ink-3">
          {L('Agentes inmobiliarios y dealers deben tener licencia para publicar. Verifícala contra el registro estatal antes de aprobar — la insignia le dice al comprador que confíe.',
             'Real-estate agents and car dealers need a license to publish. Verify it against the state registry before approving — the badge tells buyers to trust them.')}
        </div>
      </Card>
      {lic === null ? <SkeletonList count={4} /> : lic.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <div className="text-[13.5px] font-extrabold text-ink">{L('Nada por verificar', 'Nothing to verify')}</div>
          <div className="mt-1 text-[11.5px] font-medium text-muted-2">{L('Cuando un agente o dealer registre su licencia, aparecerá aquí.', 'When an agent or dealer registers a license, it shows here.')}</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {lic.map((l) => (
            <Card key={l.id} className="p-3.5">
              <div className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-ink">{l.name}</span>
                <span className={`flex-none rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase ${l.verified_license ? 'bg-green-bg text-green-dark' : 'bg-amber-bg text-amber-ink'}`}>
                  {l.verified_license ? L('Verificada', 'Verified') : L('Pendiente', 'Pending')}
                </span>
              </div>
              <div className="mt-1.5 rounded-field bg-app px-2.5 py-2">
                <div className="text-[10px] font-bold uppercase text-muted-2">{L('Licencia', 'License')}</div>
                <div className="font-mono text-[13px] font-extrabold tracking-[.04em] text-ink">{l.license}</div>
              </div>
              <div className="mt-1.5 text-[11px] font-semibold text-muted-2">
                {l.category_id === 'RealEstate' ? L('Bienes Raíces', 'Real Estate') : L('Dealer de carros', 'Car Dealer')}
                {l.seller_type ? ` · ${l.seller_type}` : ''} · {l.city ?? '—'}
              </div>
              <div className="mt-0.5 truncate text-[10.5px] font-medium text-muted-faint">{l.owner_email}</div>
              <div className="mt-2.5 flex gap-2">
                {!l.verified_license ? (
                  <>
                    <button onClick={() => { setAct({ kind: 'lic', id: l.id, name: l.name, extra: 'approve' }); setReason(''); }}
                      className="min-h-[44px] flex-1 cursor-pointer rounded-btn bg-primary text-[12px] font-extrabold text-white shadow-cta-sm">{L('Aprobar', 'Approve')}</button>
                    <button onClick={() => { setAct({ kind: 'lic', id: l.id, name: l.name, extra: 'reject' }); setReason(''); }}
                      className="min-h-[44px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white text-[12px] font-extrabold text-ink-2">{L('Rechazar', 'Reject')}</button>
                  </>
                ) : (
                  <button onClick={() => { setAct({ kind: 'lic', id: l.id, name: l.name, extra: 'reject' }); setReason(''); }}
                    className="min-h-[44px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white text-[12px] font-extrabold text-ink-2">{L('Quitar verificación', 'Remove verification')}</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const bitacora = (
    <div className="flex flex-col gap-3">
      <Card className="flex items-start gap-2.5 p-3.5">
        <History size={17} stroke={2.2} className="mt-0.5 flex-none text-primary-dark" />
        <div className="text-[11.5px] font-medium leading-relaxed text-ink-3">
          {L('Toda acción administrativa queda aquí para siempre — quién, qué, cuándo y por qué. Es inmutable: nadie puede borrarla ni editarla.',
             'Every admin action is recorded here forever — who, what, when and why. It is immutable: nobody can delete or edit it.')}
        </div>
      </Card>
      {audit === null ? <SkeletonList count={6} /> : audit.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <div className="text-[13.5px] font-extrabold text-ink">{L('Sin movimientos todavía', 'No entries yet')}</div>
          <div className="mt-1 text-[11.5px] font-medium text-muted-2">{L('Cuando suspendas, cambies un plan o verifiques una licencia, aparecerá aquí.', 'When you suspend, change a plan or verify a license, it shows here.')}</div>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {audit.map((a) => (
            <Card key={a.id} className="p-3">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-lilac-2 px-1.5 py-px font-mono text-[9.5px] font-extrabold text-primary-dark">{a.action}</span>
                <span className="ml-auto flex-none text-[10px] font-semibold text-muted-2">{timeAgo(a.created_at, es)}</span>
              </div>
              <div className="mt-1 truncate text-[11.5px] font-bold text-ink-2">{a.actor_email ?? '—'}</div>
              {a.reason && <div className="mt-0.5 text-[11px] font-medium italic text-muted">“{a.reason}”</div>}
              <div className="mt-0.5 truncate font-mono text-[9.5px] text-muted-faint">{a.entity_type}:{a.entity_id}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ── Moderación ─────────────────────────────────────────────────────────────
  const moderacion = (
    <div className="flex flex-col gap-3">
      <Card className="flex items-start gap-2.5 p-3.5">
        <Flag size={17} stroke={2.2} className="mt-0.5 flex-none text-primary-dark" />
        <div className="text-[11.5px] font-medium leading-relaxed text-ink-3">
          {L('Cada reporte muestra el contenido tal como lo ve la comunidad. Ocultar lo saca de la app al instante y es reversible; eliminar es definitivo. Todo queda en la bitácora con tu razón.',
             'Every report shows the content as the community sees it. Hiding removes it instantly and is reversible; deleting is permanent. Everything is logged with your reason.')}
        </div>
      </Card>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {[['pendiente', L('Pendientes', 'Pending')], ['accionado', L('Accionados', 'Actioned')], ['revisado', L('Revisados', 'Reviewed')], ['descartado', L('Descartados', 'Dismissed')], ['all', L('Todos', 'All')]].map(([k, lb]) => (
          <Chip key={k} active={rStatus === k} onClick={() => setRStatus(k)}>{lb}</Chip>
        ))}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {([['all', L('Todo tipo', 'Any type')], ...Object.entries(ENTITY_LABEL).map(([k, v]) => [k, L(v.es, v.en)] as [string, string])] as [string, string][]).map(([k, lb]) => (
          <Chip key={k} active={rType === k} onClick={() => setRType(k)}>{lb}</Chip>
        ))}
      </div>
      {reports === null ? <SkeletonList count={4} /> : reports.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <div className="text-[13.5px] font-extrabold text-ink">{L('Nada por moderar', 'Nothing to moderate')}</div>
          <div className="mt-1 text-[11.5px] font-medium text-muted-2">{L('Cuando alguien reporte contenido, aparecerá aquí con el texto completo.', 'When someone reports content, it shows here with the full text.')}</div>
        </Card>
      ) : (
        <>
          <div className="text-[11px] font-bold text-muted-2">{reports[0]?.total_count ?? 0} {L('reportes', 'reports')}</div>
          <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
            {reports.map((r) => {
              const lb = ENTITY_LABEL[r.entity_type];
              const canDelete = DELETABLE.has(r.entity_type);
              const open = r.status === 'pendiente';
              return (
                <Card key={r.id} className="p-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-lilac-2 text-primary-dark">{lb ? L(lb.es, lb.en) : r.entity_type}</span>
                    {r.content_hidden && <span className="rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-pink-bg text-pink-dark">{L('Oculto', 'Hidden')}</span>}
                    {r.report_count > 1 && <span className="rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-amber-bg text-amber-ink">{r.report_count} {L('reportes', 'reports')}</span>}
                    {!open && <span className="rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-green-bg text-green-dark">{r.status}</span>}
                    <span className="ml-auto flex-none text-[10px] font-semibold text-muted-2">{timeAgo(r.created_at, es)}</span>
                  </div>

                  <div className="mt-2 text-[12.5px] font-extrabold text-ink">{r.reason}</div>
                  {r.detail && <div className="mt-0.5 text-[11.5px] font-medium leading-relaxed text-ink-3">{r.detail}</div>}

                  <div className="mt-2 rounded-field bg-app px-3 py-2.5">
                    <div className="text-[9.5px] font-bold uppercase tracking-[.04em] text-muted-2">
                      {L('Contenido reportado', 'Reported content')}{r.content_author ? ` · ${r.content_author}` : ''}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words text-[12px] font-medium leading-relaxed text-ink-2">
                      {r.content_preview ?? L('(el contenido ya no existe)', '(content no longer exists)')}
                    </div>
                  </div>

                  <div className="mt-1.5 truncate text-[10.5px] font-medium text-muted-faint">
                    {L('Reportado por', 'Reported by')} {r.reporter_email ?? '—'}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {r.content_hidden ? (
                      <button onClick={() => { setAct({ kind: 'report', id: r.id, name: r.reason, extra: 'unhide' }); setReason(''); }}
                        className="min-h-[44px] flex-1 cursor-pointer rounded-btn bg-primary text-[12px] font-extrabold text-white shadow-cta-sm">{L('Mostrar de nuevo', 'Unhide')}</button>
                    ) : (
                      <button onClick={() => { setAct({ kind: 'report', id: r.id, name: r.reason, extra: 'hide' }); setReason(''); }}
                        className="min-h-[44px] flex-1 cursor-pointer rounded-btn bg-primary text-[12px] font-extrabold text-white shadow-cta-sm">{L('Ocultar', 'Hide')}</button>
                    )}
                    {canDelete && (
                      <button onClick={() => { setAct({ kind: 'report', id: r.id, name: r.reason, extra: 'delete' }); setReason(''); }}
                        className="min-h-[44px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-pink-dark bg-white text-[12px] font-extrabold text-pink-dark">{L('Eliminar', 'Delete')}</button>
                    )}
                    {open && (
                      <button onClick={() => { setAct({ kind: 'report', id: r.id, name: r.reason, extra: 'dismiss' }); setReason(''); }}
                        className="min-h-[44px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white text-[12px] font-extrabold text-ink-2">{L('Descartar', 'Dismiss')}</button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  // ── Reclamos ───────────────────────────────────────────────────────────────
  const reclamos = (
    <div className="flex flex-col gap-3">
      <Card className="flex items-start gap-2.5 p-3.5">
        <Message size={17} stroke={2.2} className="mt-0.5 flex-none text-primary-dark" />
        <div className="text-[11.5px] font-medium leading-relaxed text-ink-3">
          {L('Cuando un cliente y un negocio no se ponen de acuerdo, entras tú. Responde en el mismo hilo que ellos ven y cierra el caso diciendo cómo se resolvió — esa respuesta le llega al cliente.',
             "When a customer and a business can't agree, you step in. Reply in the same thread they see and close the case saying how it was resolved — the customer gets that answer.")}
        </div>
      </Card>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {[['all', L('Todos', 'All')], ['abierto', L('Abiertos', 'Open')], ['en_revision', L('En revisión', 'In review')], ['resuelto', L('Resueltos', 'Resolved')], ['rechazado', L('Rechazados', 'Rejected')]].map(([k, lb]) => (
          <Chip key={k} active={cStatus === k} onClick={() => setCStatus(k)}>{lb}</Chip>
        ))}
      </div>
      {claims === null ? <SkeletonList count={4} /> : claims.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <div className="text-[13.5px] font-extrabold text-ink">{L('Sin reclamos', 'No claims')}</div>
          <div className="mt-1 text-[11.5px] font-medium text-muted-2">{L('Buena señal: nadie ha tenido que abrir un caso.', 'Good sign: nobody has had to open a case.')}</div>
        </Card>
      ) : (
        <>
          <div className="text-[11px] font-bold text-muted-2">{claims[0]?.total_count ?? 0} {L('reclamos', 'claims')}</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {claims.map((c) => {
              const st = CLAIM_STATUS[c.status] ?? CLAIM_STATUS.abierto;
              const kd = CLAIM_KIND[c.kind];
              const late = (c.status === 'abierto' || c.status === 'en_revision') && c.hours_open > 24;
              return (
                <button key={c.id} onClick={() => { setClaim(c); setMsg(''); }}
                  className="flex min-h-[44px] cursor-pointer flex-col rounded-card-sm border border-hair bg-white p-3 text-left shadow-card">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className={`flex-none rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase ${st.cls}`}>{L(st.es, st.en)}</span>
                    {kd && <span className="flex-none rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-lilac-2 text-primary-dark">{L(kd.es, kd.en)}</span>}
                    {c.ref_code && <span className="flex-none font-mono text-[10px] font-extrabold tracking-[.04em] text-muted-2">{c.ref_code}</span>}
                    <span className={`ml-auto flex-none text-[10px] font-extrabold ${late ? 'text-pink-dark' : 'text-muted-2'}`}>{c.hours_open}h</span>
                  </span>
                  <span className="mt-1.5 line-clamp-2 text-[12.5px] font-extrabold text-ink">{c.reason}</span>
                  <span className="mt-0.5 truncate text-[11px] font-semibold text-muted-2">{c.business_name ?? L('Sin negocio', 'No business')}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 truncate text-[10.5px] font-medium text-muted-faint">
                    {c.claimant_email ?? '—'} · {c.messages?.length ?? 0} {L('mensajes', 'messages')}
                    {c.assigned_email && <span className="rounded bg-app px-1.5 py-px text-[9px] font-bold text-muted-2">{c.assigned_email}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  // ── Dinero ─────────────────────────────────────────────────────────────────
  const dinero = (
    <div className="flex flex-col gap-3">
      {/* pagos cobrados que nunca se entregaron — lo más urgente del proyecto */}
      {stuck !== null && stuck.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-ink">
            <Alert size={15} stroke={2.4} className="text-pink-dark" /> {L('Cobrado y sin entregar', 'Charged and undelivered')}
          </div>
          <Card className="p-3 text-[11.5px] font-medium leading-relaxed text-ink-3">
            {L('Le cobramos al cliente pero la orden no se creó. Reintenta la entrega; si no se puede, reembolsa — nunca lo dejes así.',
               "We charged the customer but the order was never created. Retry delivery; if it can't be done, refund — never leave it like this.")}
          </Card>
          {stuck.map((s) => (
            <Card key={s.id} className="p-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-pink-bg text-pink-dark">{s.status}</span>
                <span className="rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-lilac-2 text-primary-dark">{s.kind}</span>
                <span className="ml-auto flex-none text-[10.5px] font-extrabold text-pink-dark">{Math.round(s.minutes_stuck)} min</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold text-ink">{s.business_name ?? L('Sin negocio', 'No business')}</span>
                <span className="flex-none text-[14px] font-extrabold text-ink">{money(s.amount)}</span>
              </div>
              <div className="mt-0.5 truncate text-[10.5px] font-medium text-muted-faint">{s.buyer_email ?? '—'} · {s.ref ?? '—'}</div>
              {s.error && <div className="mt-1.5 rounded-field bg-pink-bg px-2.5 py-2 font-mono text-[10px] leading-relaxed text-pink-dark">{s.error}</div>}
              <div className="mt-2.5 flex gap-2">
                <button onClick={() => void retryPending(s.id)}
                  className="min-h-[44px] flex-1 cursor-pointer rounded-btn bg-primary text-[12px] font-extrabold text-white shadow-cta-sm">{L('Reintentar entrega', 'Retry delivery')}</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {searchBox(pqRaw, setPqRaw, L('Buscar por código, negocio o correo…', 'Search by code, business or email…'))}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {[['all', L('Todo', 'All')], ['order', L('Pedidos', 'Orders')], ['booking', L('Reservas', 'Bookings')], ['rental', L('Rentas', 'Rentals')], ['ticket', L('Boletos', 'Tickets')], ['subscription', L('Planes', 'Plans')]].map(([k, lb]) => (
          <Chip key={k} active={pKind === k} onClick={() => { setPKind(k); setPPage(0); }}>{lb}</Chip>
        ))}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {[['all', L('Cualquier estado', 'Any status')], ['paid', L('Pagados', 'Paid')], ['refunded', L('Reembolsados', 'Refunded')]].map(([k, lb]) => (
          <Chip key={k} active={pStatus === k} onClick={() => { setPStatus(k); setPPage(0); }}>{lb}</Chip>
        ))}
      </div>

      {pays === null ? <SkeletonList count={6} /> : pays.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <div className="text-[13.5px] font-extrabold text-ink">{L('Sin pagos', 'No payments')}</div>
          <div className="mt-1 text-[11.5px] font-medium text-muted-2">{L('Prueba con otro filtro o búsqueda.', 'Try another filter or search.')}</div>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-2">
            <span>{pays[0]?.total_count ?? 0} {L('pagos', 'payments')}</span>
            <span>{L('Total filtrado', 'Filtered total')}: <span className="text-ink">{money(pays[0]?.sum_amount ?? 0)}</span></span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {pays.map((p) => (
              <Card key={p.id} className="p-3">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 flex-none rounded-full ${p.status === 'paid' ? 'bg-green' : p.status === 'refunded' ? 'bg-pink-dark' : 'bg-muted-faint'}`} />
                  <span className="rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-lilac-2 text-primary-dark">{p.kind}</span>
                  {p.ref && <span className="font-mono text-[10px] font-extrabold tracking-[.04em] text-muted-2">{p.ref}</span>}
                  <span className="ml-auto flex-none text-[10px] font-semibold text-muted-2">{timeAgo(p.created_at, es)}</span>
                </div>
                <div className="mt-1.5 flex items-end gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-extrabold text-ink">{p.business_name ?? L('Sin negocio', 'No business')}</span>
                    <span className="block truncate text-[10.5px] font-medium text-muted-faint">{p.buyer_email ?? '—'}</span>
                  </span>
                  <span className="flex-none text-right">
                    <span className={`block text-[14px] font-extrabold ${p.status === 'refunded' ? 'text-pink-dark line-through' : 'text-ink'}`}>{money(p.amount)}</span>
                    <span className="block text-[9.5px] font-bold uppercase text-muted-2">{L('comisión', 'fee')} {money(p.fee)}</span>
                  </span>
                </div>
                {p.status === 'paid' && p.intent && (
                  <button onClick={() => { setAct({ kind: 'refund', id: p.id, name: `${p.business_name ?? ''} · ${money(p.amount)}` }); setReason(''); }}
                    className="mt-2.5 min-h-[44px] w-full cursor-pointer rounded-btn border-[1.5px] border-pink-dark bg-white text-[12px] font-extrabold text-pink-dark">
                    {L('Reembolsar', 'Refund')}
                  </button>
                )}
                {p.status === 'refunded' && (
                  <div className="mt-2 rounded-field bg-pink-bg px-2.5 py-1.5 text-center text-[10.5px] font-extrabold text-pink-dark">{L('Reembolsado', 'Refunded')}</div>
                )}
              </Card>
            ))}
          </div>
          {(pays[0]?.total_count ?? 0) > 40 && (
            <div className="flex items-center justify-between gap-2">
              <button disabled={pPage === 0} onClick={() => setPPage((p) => Math.max(0, p - 1))} className="min-h-[44px] flex-1 cursor-pointer rounded-btn border border-lilac-line bg-white text-[12px] font-extrabold text-ink-2 disabled:opacity-40">{L('Anterior', 'Previous')}</button>
              <span className="text-[11.5px] font-bold text-muted-2">{pPage + 1}</span>
              <button disabled={(pPage + 1) * 40 >= (pays[0]?.total_count ?? 0)} onClick={() => setPPage((p) => p + 1)} className="min-h-[44px] flex-1 cursor-pointer rounded-btn border border-lilac-line bg-white text-[12px] font-extrabold text-ink-2 disabled:opacity-40">{L('Siguiente', 'Next')}</button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── Pedidos (las 4 superficies transaccionales en una sola lista) ──────────
  const pedidos = (
    <div className="flex flex-col gap-3">
      <Card className="flex items-start gap-2.5 p-3.5">
        <Package size={17} stroke={2.2} className="mt-0.5 flex-none text-primary-dark" />
        <div className="text-[11.5px] font-medium leading-relaxed text-ink-3">
          {L('Pedidos, reservas, rentas y boletos en una sola lista. Cambiar el estado desde aquí es tu último recurso cuando el negocio no responde — el cliente recibe el aviso y queda en la bitácora.',
             "Orders, bookings, rentals and tickets in one list. Changing status here is your last resort when the business doesn't respond — the customer is notified and it's logged.")}
        </div>
      </Card>
      {searchBox(oqRaw, setOqRaw, L('Buscar por código, negocio o correo…', 'Search by code, business or email…'))}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {[['all', L('Todo', 'All')], ...Object.entries(TX_KIND).map(([k, v]) => [k, L(v.es, v.en)] as [string, string])].map(([k, lb]) => (
          <Chip key={k} active={oKind === k} onClick={() => { setOKind(k); setOStatus('all'); setOPage(0); }}>{lb}</Chip>
        ))}
      </div>
      {oKind !== 'all' && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
          {[['all', L('Cualquier estado', 'Any status')], ...(TX_STATUSES[oKind] ?? []).map((s) => [s, L(TX_STATUS_LABEL[s]?.es ?? s, TX_STATUS_LABEL[s]?.en ?? s)] as [string, string])].map(([k, lb]) => (
            <Chip key={k} active={oStatus === k} onClick={() => { setOStatus(k); setOPage(0); }}>{lb}</Chip>
          ))}
        </div>
      )}
      {txs === null ? <SkeletonList count={6} /> : txs.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <div className="text-[13.5px] font-extrabold text-ink">{L('Sin transacciones', 'No transactions')}</div>
          <div className="mt-1 text-[11.5px] font-medium text-muted-2">{L('Prueba con otro filtro o búsqueda.', 'Try another filter or search.')}</div>
        </Card>
      ) : (
        <>
          <div className="text-[11px] font-bold text-muted-2">{txs[0]?.total_count ?? 0} {L('transacciones', 'transactions')}</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {txs.map((t) => {
              const kd = TX_KIND[t.kind];
              const sl = TX_STATUS_LABEL[t.status];
              const dead = t.status === 'cancelled';
              return (
                <Card key={`${t.kind}-${t.id}`} className="p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-lilac-2 text-primary-dark">{kd ? L(kd.es, kd.en) : t.kind}</span>
                    <span className={`rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase ${dead ? 'bg-pink-bg text-pink-dark' : 'bg-green-bg text-green-dark'}`}>
                      {sl ? L(sl.es, sl.en) : t.status}
                    </span>
                    {t.code && <span className="font-mono text-[10px] font-extrabold tracking-[.04em] text-muted-2">{t.code}</span>}
                    <span className="ml-auto flex-none text-[10px] font-semibold text-muted-2">{timeAgo(t.created_at, es)}</span>
                  </div>
                  <div className="mt-1.5 flex items-end gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-extrabold text-ink">{t.business_name ?? L('Sin negocio', 'No business')}</span>
                      <span className="block truncate text-[10.5px] font-medium text-muted-faint">{t.buyer_email ?? '—'}</span>
                    </span>
                    <span className="flex-none text-[14px] font-extrabold text-ink">{money(Number(t.total ?? 0))}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(TX_STATUSES[t.kind] ?? []).filter((s) => s !== t.status).map((s) => (
                      <button key={s} onClick={() => { setAct({ kind: 'tx', id: t.id, name: `${t.code ?? ''} · ${t.business_name ?? ''}`, extra: `${t.kind}:${s}` }); setReason(''); }}
                        className="min-h-[36px] cursor-pointer rounded-btn border border-lilac-line bg-white px-2.5 text-[11px] font-extrabold text-ink-2">
                        {L(TX_STATUS_LABEL[s]?.es ?? s, TX_STATUS_LABEL[s]?.en ?? s)}
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
          {(txs[0]?.total_count ?? 0) > 40 && (
            <div className="flex items-center justify-between gap-2">
              <button disabled={oPage === 0} onClick={() => setOPage((p) => Math.max(0, p - 1))} className="min-h-[44px] flex-1 cursor-pointer rounded-btn border border-lilac-line bg-white text-[12px] font-extrabold text-ink-2 disabled:opacity-40">{L('Anterior', 'Previous')}</button>
              <span className="text-[11.5px] font-bold text-muted-2">{oPage + 1}</span>
              <button disabled={(oPage + 1) * 40 >= (txs[0]?.total_count ?? 0)} onClick={() => setOPage((p) => p + 1)} className="min-h-[44px] flex-1 cursor-pointer rounded-btn border border-lilac-line bg-white text-[12px] font-extrabold text-ink-2 disabled:opacity-40">{L('Siguiente', 'Next')}</button>
            </div>
          )}
        </>
      )}
    </div>
  );

  const body = section === 'inicio' ? inicio
    : section === 'usuarios' ? usuarios
    : section === 'negocios' ? negocios
    : section === 'licencias' ? licencias
    : section === 'moderacion' ? moderacion
    : section === 'reclamos' ? reclamos
    : section === 'dinero' ? dinero
    : section === 'pedidos' ? pedidos
    : bitacora;

  // ══════════════════════════ RENDER ══════════════════════════
  return (
    <div className="min-h-screen bg-app">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-hair bg-ink px-3.5 py-3">
        <div className="mx-auto flex max-w-[1180px] items-center gap-2.5">
          <button onClick={() => setNavOpen(true)} aria-label={L('Menú', 'Menu')} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-btn bg-white/10 lg:hidden">
            <Menu size={18} stroke={2.4} className="text-white" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-extrabold tracking-[-.01em] text-white">
              To&rsquo;<span className="text-primary-soft">Latino</span> <span className="text-[11px] font-bold text-white/60">Admin</span>
            </div>
            <div className="truncate text-[10.5px] font-semibold text-white/55">{me.email}</div>
          </div>
          <span className="flex-none rounded-full bg-primary px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-white">
            {L(ROLE_LABEL[me.role].es, ROLE_LABEL[me.role].en)}
          </span>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1180px] gap-5 px-3.5 py-4 lg:px-5">
        {/* sidebar desktop */}
        <aside className="hidden w-[220px] flex-none lg:block">
          <div className="sticky top-[76px] rounded-card border border-hair bg-white shadow-card">{navList}</div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-3.5">
            <h1 className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{L(sectionTitle?.es ?? '', sectionTitle?.en ?? '')}</h1>
          </div>
          {body}
        </main>
      </div>

      {/* drawer móvil */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label={L('Cerrar', 'Close')} onClick={() => setNavOpen(false)} className="absolute inset-0 cursor-pointer bg-[rgba(30,27,46,.45)]" />
          <div className="absolute left-0 top-0 h-full w-[264px] overflow-y-auto bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-hair px-3 py-3">
              <span className="text-[13px] font-extrabold text-ink">{L('Panel de control', 'Control panel')}</span>
              <button onClick={() => setNavOpen(false)} aria-label={L('Cerrar', 'Close')} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-lilac-2">
                <X size={16} stroke={2.4} className="text-ink" />
              </button>
            </div>
            {navList}
          </div>
        </div>
      )}

      {/* ── detalle de usuario ── */}
      <Overlay open={uOpen} onClose={() => setUOpen(false)} width={520}>
        <OverlayTitle title={L('Usuario', 'User')} onClose={() => setUOpen(false)} />
        {!uDetail ? <SkeletonList count={3} /> : (() => {
          const p = (uDetail.profile ?? {}) as Record<string, unknown>;
          const susp = !!p.suspended_until && new Date(String(p.suspended_until)) > new Date();
          return (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-[15px] font-extrabold text-white" style={{ background: String(p.avatar_color ?? '#7B61FF') }}>
                  {String(p.initials ?? uDetail.email[0] ?? '?').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-extrabold text-ink">{String(p.display_name ?? L('Sin nombre', 'No name'))}</div>
                  <div className="truncate text-[11.5px] font-semibold text-muted-2">{uDetail.email}</div>
                </div>
                {uDetail.admin_role && <span className="flex-none rounded-full bg-primary px-2 py-1 text-[9px] font-extrabold uppercase text-white">{uDetail.admin_role}</span>}
              </div>

              {susp && (
                <div className="rounded-field bg-pink-bg px-3 py-2.5">
                  <div className="text-[11.5px] font-extrabold text-pink-dark">{L('Cuenta suspendida', 'Account suspended')}</div>
                  <div className="mt-0.5 text-[11px] font-medium text-ink-3">{String(p.suspended_reason ?? '')}</div>
                  <div className="mt-0.5 text-[10px] font-semibold text-muted-2">{L('hasta', 'until')} {new Date(String(p.suspended_until)).toLocaleString(es ? 'es-US' : 'en-US')}</div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {Object.entries(uDetail.counts).filter(([, v]) => v > 0).map(([k, v]) => (
                  <div key={k} className="rounded-field bg-app px-2 py-2 text-center">
                    <div className="text-[15px] font-extrabold text-ink">{v}</div>
                    <div className="text-[9.5px] font-bold uppercase text-muted-2">{k}</div>
                  </div>
                ))}
              </div>

              {uDetail.businesses.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Negocios', 'Businesses')}</div>
                  <div className="flex flex-col gap-1.5">
                    {uDetail.businesses.map((b) => (
                      <button key={b.id} onClick={() => { setUOpen(false); void openBiz(b.id); }} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-field bg-app px-2.5 py-2 text-left">
                        <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-ink">{b.name}</span>
                        <span className={`flex-none rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase ${TIER_CLS[b.tier] ?? TIER_CLS.free}`}>{b.tier}</span>
                        <ChevronRight size={14} stroke={2.4} className="flex-none text-muted-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-1 flex gap-2 border-t border-hair pt-3">
                {susp ? (
                  <PrimaryBtn className="flex-1" onClick={() => void undoSuspendUser(uDetail.id)}>{L('Reactivar cuenta', 'Restore account')}</PrimaryBtn>
                ) : uDetail.admin_role ? (
                  <div className="flex-1 rounded-field bg-lilac-2 px-3 py-2.5 text-center text-[11.5px] font-bold text-ink-2">{L('Es administrador — no se puede suspender', 'Is an admin — cannot be suspended')}</div>
                ) : (
                  <button onClick={() => { setAct({ kind: 'user-susp', id: uDetail.id, name: uDetail.email }); setReason(''); setDays(7); }}
                    className="min-h-[44px] flex-1 cursor-pointer rounded-btn-lg border-[1.5px] border-pink-dark bg-white text-[13px] font-extrabold text-pink-dark">{L('Suspender', 'Suspend')}</button>
                )}
              </div>
            </div>
          );
        })()}
      </Overlay>

      {/* ── detalle de negocio ── */}
      <Overlay open={bOpen} onClose={() => setBOpen(false)} width={560}>
        <OverlayTitle title={L('Negocio', 'Business')} onClose={() => setBOpen(false)} />
        {!bDetail ? <SkeletonList count={3} /> : (() => {
          const b = bDetail.business as Record<string, unknown>;
          const id = String(b.id); const suspended = b.suspended === true;
          return (
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[16px] font-extrabold text-ink">{String(b.name)}</span>
                  <span className={`rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase ${TIER_CLS[String(b.tier)] ?? TIER_CLS.free}`}>{String(b.tier)}</span>
                  {suspended && <span className="rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-pink-bg text-pink-dark">{L('Suspendido', 'Suspended')}</span>}
                </div>
                <div className="mt-0.5 text-[11.5px] font-semibold text-muted-2">{String(b.category_id)} · {String(b.city ?? '—')}</div>
                <div className="mt-0.5 truncate text-[11px] font-medium text-muted-faint">{bDetail.owner.email} · /{String(b.slug)}</div>
              </div>

              {suspended && (
                <div className="rounded-field bg-pink-bg px-3 py-2.5">
                  <div className="text-[11.5px] font-extrabold text-pink-dark">{L('Oculto del cliente', 'Hidden from customers')}</div>
                  <div className="mt-0.5 text-[11px] font-medium text-ink-3">{String(b.suspended_reason ?? '')}</div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-field bg-app px-2 py-2 text-center">
                  <div className="text-[14px] font-extrabold text-ink">{money(bDetail.money.gross_30)}</div>
                  <div className="text-[9px] font-bold uppercase text-muted-2">{L('ventas 30d', 'sales 30d')}</div>
                </div>
                <div className="rounded-field bg-app px-2 py-2 text-center">
                  <div className="text-[14px] font-extrabold text-ink">{money(bDetail.money.fees_30)}</div>
                  <div className="text-[9px] font-bold uppercase text-muted-2">{L('comisión', 'commission')}</div>
                </div>
                <div className="rounded-field bg-app px-2 py-2 text-center">
                  <div className="text-[14px] font-extrabold text-ink">{bDetail.money.tx_30}</div>
                  <div className="text-[9px] font-bold uppercase text-muted-2">{L('transacc.', 'transactions')}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {Object.entries(bDetail.counts).filter(([, v]) => v > 0).map(([k, v]) => (
                  <div key={k} className="rounded-field bg-app px-2 py-2 text-center">
                    <div className="text-[14px] font-extrabold text-ink">{v}</div>
                    <div className="text-[9.5px] font-bold uppercase text-muted-2">{k}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-1.5 text-[12px] font-extrabold text-ink">{L('Plan', 'Plan')}</div>
                <div className="flex gap-2">
                  {TIERS.map((t) => (
                    <button key={t} disabled={String(b.tier) === t}
                      onClick={() => { setAct({ kind: 'biz-tier', id, name: String(b.name), extra: t }); setReason(''); }}
                      className={`min-h-[44px] flex-1 cursor-pointer rounded-btn text-[11.5px] font-extrabold ${String(b.tier) === t ? 'bg-primary text-white' : 'border-[1.5px] border-lilac-line bg-white text-ink-2'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-hair pt-3">
                <a href={`/negocios?b=${String(b.slug)}`} target="_blank" rel="noreferrer"
                  className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-btn border-[1.5px] border-lilac-line bg-white text-[12px] font-extrabold text-ink-2">
                  {L('Ver como cliente', 'View as customer')}
                </a>
                {suspended ? (
                  <button onClick={() => void undoSuspendBiz(id)} className="min-h-[44px] flex-1 cursor-pointer rounded-btn bg-primary text-[12px] font-extrabold text-white shadow-cta-sm">{L('Reactivar', 'Restore')}</button>
                ) : (
                  <button onClick={() => { setAct({ kind: 'biz-susp', id, name: String(b.name) }); setReason(''); }}
                    className="min-h-[44px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-pink-dark bg-white text-[12px] font-extrabold text-pink-dark">{L('Suspender', 'Suspend')}</button>
                )}
              </div>
            </div>
          );
        })()}
      </Overlay>

      {/* ── hilo del reclamo (lo mismo que ve el cliente + acciones) ── */}
      <Overlay open={claim != null} onClose={() => setClaim(null)} width={560}>
        {claim && (() => {
          const st = CLAIM_STATUS[claim.status] ?? CLAIM_STATUS.abierto;
          const kd = CLAIM_KIND[claim.kind];
          const closed = claim.status === 'resuelto' || claim.status === 'rechazado';
          return (
            <>
              <OverlayTitle title={L('Reclamo', 'Claim')} onClose={() => setClaim(null)} />
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase ${st.cls}`}>{L(st.es, st.en)}</span>
                    {kd && <span className="rounded px-1.5 py-px text-[8.5px] font-extrabold uppercase bg-lilac-2 text-primary-dark">{L(kd.es, kd.en)}</span>}
                    {claim.ref_code && <span className="font-mono text-[10.5px] font-extrabold tracking-[.04em] text-muted-2">{claim.ref_code}</span>}
                  </div>
                  <div className="mt-1.5 text-[15px] font-extrabold leading-snug text-ink">{claim.reason}</div>
                  <div className="mt-0.5 text-[11.5px] font-semibold text-muted-2">{claim.business_name ?? L('Sin negocio', 'No business')}</div>
                  <div className="mt-0.5 truncate text-[11px] font-medium text-muted-faint">
                    {claim.claimant_email} · {L('abierto hace', 'open for')} {claim.hours_open}h
                  </div>
                </div>

                {claim.business_id && (
                  <button onClick={() => { setClaim(null); void openBiz(claim.business_id as string); }}
                    className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-field bg-app px-3 py-2 text-left">
                    <Store size={15} stroke={2.2} className="flex-none text-primary-dark" />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-ink">{L('Ver el negocio', 'Open the business')}</span>
                    <ChevronRight size={14} stroke={2.4} className="flex-none text-muted-2" />
                  </button>
                )}

                {/* hilo */}
                <div className="flex flex-col gap-2">
                  {(claim.messages ?? []).map((m, i) => {
                    const mine = m.side === 'admin';
                    return (
                      <div key={i} className={`max-w-[86%] rounded-card-sm px-3 py-2 ${
                        mine ? 'self-end bg-primary text-white'
                        : m.side === 'negocio' ? 'self-start bg-lilac-2 text-ink'
                        : 'self-start bg-app text-ink'}`}>
                        <div className={`text-[9.5px] font-extrabold uppercase tracking-[.04em] ${mine ? 'text-white/70' : 'text-muted-2'}`}>
                          {m.side === 'admin' ? L('To’Latino', 'To’Latino') : m.side === 'negocio' ? L('Negocio', 'Business') : L('Cliente', 'Customer')}
                          {' · '}{timeAgo(m.at, es)}
                        </div>
                        <div className={`mt-0.5 whitespace-pre-wrap break-words text-[12.5px] font-medium leading-relaxed ${mine ? 'text-white' : 'text-ink-2'}`}>{m.text}</div>
                      </div>
                    );
                  })}
                </div>

                {closed && claim.resolution && (
                  <div className="rounded-field bg-green-bg px-3 py-2.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-[.04em] text-green-dark">{L('Resolución', 'Resolution')}</div>
                    <div className="mt-0.5 text-[12px] font-medium leading-relaxed text-ink-2">{claim.resolution}</div>
                  </div>
                )}

                {/* responder */}
                <div className="border-t border-hair pt-3">
                  <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2}
                    placeholder={L('Escribe al cliente y al negocio…', 'Write to the customer and business…')}
                    className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium text-ink outline-none focus:border-primary" />
                  <PrimaryBtn className="mt-2 w-full" disabled={busy || !msg.trim()} onClick={sendClaimMsg}>
                    {busy ? L('Enviando…', 'Sending…') : L('Enviar mensaje', 'Send message')}
                  </PrimaryBtn>
                </div>

                {!closed && (
                  <div className="flex flex-wrap gap-2 border-t border-hair pt-3">
                    {claim.status === 'abierto' && (
                      <button onClick={() => { setAct({ kind: 'claim', id: claim.id, name: claim.reason, extra: 'en_revision' }); setReason(''); }}
                        className="min-h-[44px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white text-[12px] font-extrabold text-ink-2">{L('Tomar el caso', 'Take the case')}</button>
                    )}
                    <button onClick={() => { setAct({ kind: 'claim', id: claim.id, name: claim.reason, extra: 'resuelto' }); setReason(''); }}
                      className="min-h-[44px] flex-1 cursor-pointer rounded-btn bg-primary text-[12px] font-extrabold text-white shadow-cta-sm">{L('Resolver', 'Resolve')}</button>
                    <button onClick={() => { setAct({ kind: 'claim', id: claim.id, name: claim.reason, extra: 'rechazado' }); setReason(''); }}
                      className="min-h-[44px] flex-1 cursor-pointer rounded-btn border-[1.5px] border-pink-dark bg-white text-[12px] font-extrabold text-pink-dark">{L('Rechazar', 'Reject')}</button>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </Overlay>

      {/* ── hoja de acción (razón obligatoria → bitácora) ── */}
      <Overlay open={act != null} onClose={() => setAct(null)} width={440}>
        {act && (
          <>
            <OverlayTitle
              title={
                act.kind === 'user-susp' ? L('Suspender usuario', 'Suspend user')
                : act.kind === 'biz-susp' ? L('Suspender negocio', 'Suspend business')
                : act.kind === 'biz-tier' ? L('Cambiar plan', 'Change plan')
                : act.kind === 'refund' ? L('Reembolsar pago', 'Refund payment')
                : act.kind === 'tx' ? L('Cambiar estado', 'Change status')
                : act.kind === 'claim' ? (act.extra === 'resuelto' ? L('Resolver reclamo', 'Resolve claim')
                    : act.extra === 'rechazado' ? L('Rechazar reclamo', 'Reject claim') : L('Tomar el caso', 'Take the case'))
                : act.kind === 'report' ? (act.extra === 'hide' ? L('Ocultar contenido', 'Hide content')
                    : act.extra === 'unhide' ? L('Mostrar de nuevo', 'Unhide content')
                    : act.extra === 'delete' ? L('Eliminar contenido', 'Delete content') : L('Descartar reporte', 'Dismiss report'))
                : act.extra === 'approve' ? L('Aprobar licencia', 'Approve license') : L('Rechazar licencia', 'Reject license')
              }
              onClose={() => setAct(null)}
            />
            <div className="mb-3 truncate text-[12.5px] font-bold text-ink-2">{act.name}</div>

            {act.kind === 'user-susp' && (
              <div className="mb-3">
                <div className="mb-1.5 text-[11.5px] font-extrabold text-ink">{L('Duración', 'Duration')}</div>
                <div className="flex gap-2">
                  {[1, 7, 30, 365].map((d) => (
                    <button key={d} onClick={() => setDays(d)}
                      className={`min-h-[44px] flex-1 cursor-pointer rounded-btn text-[11.5px] font-extrabold ${days === d ? 'bg-primary text-white' : 'border-[1.5px] border-lilac-line bg-white text-ink-2'}`}>
                      {d === 365 ? L('1 año', '1 yr') : `${d} ${L('d', 'd')}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {act.kind === 'biz-susp' && (
              <div className="mb-3 rounded-field bg-amber-bg px-3 py-2.5 text-[11.5px] font-semibold text-amber-ink">
                {L('El negocio desaparece de la búsqueda y su página deja de abrir. Su dueño recibe un aviso.',
                   'The business disappears from search and its page stops opening. The owner is notified.')}
              </div>
            )}

            {act.kind === 'refund' && (
              <div className="mb-3 rounded-field bg-amber-bg px-3 py-2.5 text-[11.5px] font-semibold leading-relaxed text-amber-ink">
                {L('El dinero vuelve a la tarjeta del cliente en 5–10 días. También se revierte lo que cobró el negocio y nuestra comisión. Esto no se puede deshacer.',
                   "The money returns to the customer's card in 5–10 days. The business's payout and our commission are reversed too. This cannot be undone.")}
              </div>
            )}

            {act.kind === 'report' && act.extra === 'delete' && (
              <div className="mb-3 rounded-field bg-pink-bg px-3 py-2.5 text-[11.5px] font-semibold leading-relaxed text-pink-dark">
                {L('Eliminar borra el contenido para siempre. Si solo quieres sacarlo de la vista, usa Ocultar — eso sí se puede revertir.',
                   'Deleting removes the content forever. To just take it out of sight use Hide — that one is reversible.')}
              </div>
            )}

            {act.kind === 'tx' && (
              <div className="mb-3 rounded-field bg-amber-bg px-3 py-2.5 text-[11.5px] font-semibold leading-relaxed text-amber-ink">
                {L('El cliente recibe un aviso con el nuevo estado. Cambiar el estado NO devuelve dinero — si hay que reembolsar, hazlo en Dinero.',
                   'The customer gets a notification with the new status. Changing status does NOT refund — if money must go back, do it under Money.')}
              </div>
            )}

            <div className="mb-1.5 text-[11.5px] font-extrabold text-ink">
              {act.kind === 'claim' && (act.extra === 'resuelto' || act.extra === 'rechazado')
                ? L('Cómo se resolvió *', 'How it was resolved *')
                : `${L('Razón', 'Reason')}${
                    (act.kind === 'lic' && act.extra !== 'reject')
                    || (act.kind === 'report' && (act.extra === 'dismiss' || act.extra === 'unhide'))
                    || (act.kind === 'claim' && act.extra === 'en_revision') ? '' : ' *'}`}
            </div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder={act.kind === 'claim' && (act.extra === 'resuelto' || act.extra === 'rechazado')
                ? L('El cliente lee esto — explícalo claro y con respeto.', 'The customer reads this — be clear and respectful.')
                : L('Queda guardada en la bitácora para siempre.', 'Saved to the audit trail forever.')}
              className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium text-ink outline-none focus:border-primary" />

            <div className="mt-3 flex gap-2">
              <button onClick={() => setAct(null)} className="min-h-[44px] flex-none cursor-pointer rounded-btn-lg border border-lilac-line bg-white px-5 text-[13px] font-extrabold text-ink-2">{L('Cancelar', 'Cancel')}</button>
              <PrimaryBtn className="flex-1" disabled={busy || (reasonRequired(act) && !reason.trim())} onClick={runAction}>
                {busy ? L('Aplicando…', 'Applying…')
                  : act.kind === 'refund' ? L('Reembolsar', 'Refund')
                  : L('Confirmar', 'Confirm')}
              </PrimaryBtn>
            </div>
          </>
        )}
      </Overlay>

      <Toast msg={toast} />
    </div>
  );
}
