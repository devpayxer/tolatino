'use client';

// Listado → Listados relacionados. Link this listing to others — the owner's own
// sister listings (auto-approved) OR someone else's (a salon ↔ its independent
// barbers, a nightclub ↔ its DJ), which need the OTHER owner to approve before it
// goes live on both "Relacionados". Sections: incoming requests to approve,
// current links (approved + pending outgoing), a quick-link row for your other
// listings, and a search sheet to find any listing. Fully explorable in demo
// (local sample data); a signed-in owner hits the real RPCs (migration 0044).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Clock3, Link2, Loader2, Plus, Search, Store, Trash2, X } from 'lucide-react';
import { useBizAdmin, type BizRow } from '@/lib/bizAdmin';
import { CAT, type CatKey } from '@/lib/tiles';
import { VerifiedBadge, Overlay, OverlayTitle } from '@/components/ui';
import { Toast } from '@/screens/negocio/modules/_page';
import type { PanelCtx } from '@/screens/negocio/tabs';
import { BUSINESSES } from '@/data/fixtures';
import {
  fetchRelationsAdmin, searchBusinessesToLink, requestRelation, respondRelation, removeRelation,
  type AdminRelation, type LinkCandidate,
} from '@/lib/relations';

const ROLE_PRESETS: [string, string][] = [
  ['Sucursal', 'Branch'], ['Barbero', 'Barber'], ['Estilista', 'Stylist'], ['DJ', 'DJ'],
  ['Invitado', 'Guest'], ['Aliado', 'Partner'], ['Proveedor', 'Supplier'],
];

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `x${Date.now()}${Math.round(Math.random() * 1e6)}`);
const tileBg = (a: string | null, b: string | null) =>
  `repeating-linear-gradient(135deg,${a ?? '#EFEBFF'} 0 9px,${b ?? '#7B61FF'} 9px 18px)`;

// A BizRow (owner's own listing) → a link candidate (always same-owner).
const rowToCandidate = (b: BizRow): LinkCandidate => ({
  id: b.id, slug: b.slug, name: b.name, categoryId: b.category_id, city: b.city,
  tileA: b.tile_a, tileB: b.tile_b, tier: b.tier, sameOwner: true,
});

export function RelatedModule({ ctx }: { ctx: PanelCtx }) {
  const { L, es } = ctx;
  const admin = useBizAdmin();
  const router = useRouter();
  const active = admin.active;
  const demo = admin.demo;

  const [relations, setRelations] = useState<AdminRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null); // relationId being mutated
  const [toast, setToast] = useState('');
  const [sheet, setSheet] = useState(false);
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };

  // Demo store: relations per business id (seeded lazily so the flow is explorable
  // without signing in). A real owner never touches this branch.
  const demoStore = useRef<Record<string, AdminRelation[]>>({});
  // Seed only an INCOMING cross-owner request, so the demo shows all three flows:
  // approve/reject it, quick-link your own other listing (still unlinked below),
  // and search to link anyone. A real owner never hits this branch.
  const seedDemo = useCallback((): AdminRelation[] => {
    const ext = BUSINESSES[0];
    if (!ext) return [];
    return [{
      relationId: newId(), direction: 'in', otherId: `demo-${ext.slug}`, otherSlug: ext.slug, otherName: ext.name,
      otherCategory: ext.cat, otherCity: ext.city ?? null, tileA: ext.t[0], tileB: ext.t[1],
      otherTier: ext.verified ? 'verified' : 'free', roleEs: 'Aliado', roleEn: 'Partner', status: 'pending', sameOwner: false,
      createdAt: '2024-06-01T00:00:00Z',
    }];
  }, []);

  const reload = useCallback(async () => {
    if (!active) { setRelations([]); setLoading(false); return; }
    if (demo) {
      if (!demoStore.current[active.id]) {
        demoStore.current[active.id] = seedDemo();
      }
      setRelations([...demoStore.current[active.id]]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const rows = await fetchRelationsAdmin(active.id);
    setRelations(rows);
    setLoading(false);
  }, [active, demo, seedDemo]);

  useEffect(() => { reload(); }, [reload]);

  // ── mutations (demo = local store; real = RPC + reload) ─────────────────────
  const doRequest = async (c: LinkCandidate, roleEs?: string, roleEn?: string) => {
    if (!active) return;
    if (demo) {
      const rel: AdminRelation = {
        relationId: newId(), direction: 'out', otherId: c.id, otherSlug: c.slug, otherName: c.name,
        otherCategory: c.categoryId, otherCity: c.city, tileA: c.tileA, tileB: c.tileB, otherTier: c.tier,
        roleEs: roleEs ?? null, roleEn: roleEn ?? null, status: c.sameOwner ? 'approved' : 'pending', sameOwner: c.sameOwner,
        createdAt: new Date().toISOString(),
      };
      demoStore.current[active.id] = [rel, ...(demoStore.current[active.id] ?? [])];
      setRelations([...demoStore.current[active.id]]);
    } else {
      const { error } = await requestRelation(active.id, c.id, roleEs, roleEn);
      if (error) { flash(L('No se pudo relacionar. Intenta de nuevo.', "Couldn't link. Try again.")); return; }
      await reload();
    }
    flash(c.sameOwner ? L('Listado relacionado', 'Listing linked') : L('Solicitud enviada · pendiente de aprobación', 'Request sent · pending approval'));
  };

  const doRespond = async (rel: AdminRelation, approve: boolean) => {
    setBusy(rel.relationId);
    if (demo) {
      const list = (demoStore.current[active!.id] ?? []).map((r) =>
        r.relationId === rel.relationId ? { ...r, status: (approve ? 'approved' : 'rejected') as AdminRelation['status'] } : r,
      );
      demoStore.current[active!.id] = list;
      setRelations([...list]);
    } else {
      const { error } = await respondRelation(rel.relationId, approve);
      if (error) { setBusy(null); flash(L('No se pudo actualizar.', "Couldn't update.")); return; }
      await reload();
    }
    setBusy(null);
    flash(approve ? L('Solicitud aprobada', 'Request approved') : L('Solicitud rechazada', 'Request rejected'));
  };

  const doRemove = async (rel: AdminRelation) => {
    setBusy(rel.relationId);
    if (demo) {
      const list = (demoStore.current[active!.id] ?? []).filter((r) => r.relationId !== rel.relationId);
      demoStore.current[active!.id] = list;
      setRelations([...list]);
    } else {
      const { error } = await removeRelation(rel.relationId);
      if (error) { setBusy(null); flash(L('No se pudo quitar.', "Couldn't remove.")); return; }
      await reload();
    }
    setBusy(null);
    flash(L('Relación eliminada', 'Link removed'));
  };

  // ── derived groups ──────────────────────────────────────────────────────────
  const incoming = relations.filter((r) => r.direction === 'in' && r.status === 'pending');
  const approved = relations.filter((r) => r.status === 'approved');
  const pendingOut = relations.filter((r) => r.direction === 'out' && r.status === 'pending');
  const linkedTargetIds = useMemo(
    () => new Set(relations.filter((r) => r.direction === 'out' && r.status !== 'rejected').map((r) => r.otherId)),
    [relations],
  );
  const ownOthers = admin.businesses.filter((b) => active && b.id !== active.id && !linkedTargetIds.has(b.id));

  const catLabel = (id: string) => { const c = CAT[id as CatKey]; return c ? L(c.es, c.en) : id; };
  const roleLabel = (r: AdminRelation) => (es ? r.roleEs : r.roleEn) || r.roleEs || r.roleEn;

  if (admin.loading || loading) {
    return (
      <div className="flex items-center justify-center rounded-card border border-hair bg-white py-16 text-muted shadow-card">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="mx-auto max-w-[440px] rounded-card border border-hair bg-white p-6 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
          <Store size={24} className="text-primary" strokeWidth={2.2} />
        </span>
        <h3 className="mt-4 text-[17px] font-extrabold text-ink">{L('Conecta tu negocio', 'Connect your business')}</h3>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-semibold leading-relaxed text-muted">
          {L('Publica tu negocio para relacionar otros listados.', 'Publish your business to link other listings.')}
        </p>
        <button onClick={() => router.push('/negocio/publicar')} className="mt-5 cursor-pointer rounded-btn bg-primary px-5 py-2.5 text-[13px] font-extrabold text-white shadow-cta-sm">
          {L('Publicar negocio', 'Publish business')}
        </button>
      </div>
    );
  }

  // A related-listing row (approved or pending), with role + status + remove.
  const relRow = (r: AdminRelation) => {
    const role = r.direction === 'out' ? roleLabel(r) : null; // role describes the target only
    const pending = r.status === 'pending';
    return (
      <div key={r.relationId} className="flex items-center gap-3 rounded-tile border border-hair bg-white p-3">
        <span className="h-11 w-11 flex-none rounded-btn" style={{ background: tileBg(r.tileA, r.tileB) }} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13.5px] font-extrabold text-ink">{r.otherName}</span>
            {r.otherTier !== 'free' && <VerifiedBadge size={13} />}
            {role && <span className="flex-none rounded bg-lilac-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-2">{role}</span>}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] font-semibold text-muted">
            <span>{catLabel(r.otherCategory)}</span>
            {pending ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-bg px-1.5 py-0.5 text-[10px] font-extrabold text-amber-ink">
                <Clock3 size={10} strokeWidth={2.6} />
                {L('Pendiente de aprobación', 'Pending approval')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-bg px-1.5 py-0.5 text-[10px] font-extrabold text-green-dark">
                <Check size={10} strokeWidth={3} />
                {r.sameOwner ? L('Tuyo · activo', 'Yours · active') : L('Activo', 'Active')}
              </span>
            )}
          </span>
        </span>
        <button
          onClick={() => doRemove(r)}
          disabled={busy === r.relationId}
          aria-label={pending ? L('Cancelar solicitud', 'Cancel request') : L('Quitar relación', 'Remove link')}
          className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-btn text-pink-dark disabled:opacity-50"
        >
          {busy === r.relationId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} strokeWidth={2.2} />}
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="mx-auto max-w-[640px]">
        <div className="rounded-card border border-hair bg-white p-4 shadow-card md:p-5">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-extrabold text-ink">
            <Link2 size={16} strokeWidth={2.2} className="text-primary-dark" />
            {L('Listados relacionados', 'Related listings')}
          </div>
          <p className="mb-3.5 text-[12px] font-medium leading-relaxed text-muted">
            {L('Relaciona otros listados con el tuyo — tus propias sucursales (al instante) o negocios de otras personas, como los barberos de un salón o el DJ de una disco (el otro dueño debe aprobar).',
               'Link other listings to yours — your own branches (instantly) or other people’s listings, like a salon’s barbers or a club’s DJ (the other owner must approve).')}
          </p>

          <button
            onClick={() => setSheet(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn bg-primary py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm"
          >
            <Plus size={15} strokeWidth={2.6} />
            {L('Relacionar un listado', 'Link a listing')}
          </button>

          {/* Incoming requests to approve */}
          {incoming.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-[.05em] text-amber-ink">
                {L('Solicitudes por aprobar', 'Requests to approve')}
                <span className="rounded-full bg-amber-bg px-1.5 text-[10px]">{incoming.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {incoming.map((r) => (
                  <div key={r.relationId} className="rounded-tile border-[1.5px] border-amber/40 bg-amber-bg/50 p-3">
                    <div className="flex items-center gap-3">
                      <span className="h-11 w-11 flex-none rounded-btn" style={{ background: tileBg(r.tileA, r.tileB) }} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13.5px] font-extrabold text-ink">{r.otherName}</span>
                          {r.otherTier !== 'free' && <VerifiedBadge size={13} />}
                        </span>
                        <span className="mt-0.5 block text-[11.5px] font-semibold text-muted">
                          {roleLabel(r)
                            ? L(`Te quiere agregar como “${r.roleEs}”`, `Wants to add you as “${r.roleEn || r.roleEs}”`)
                            : L('Quiere relacionar tu listado', 'Wants to link your listing')}
                        </span>
                      </span>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={() => doRespond(r, true)}
                        disabled={busy === r.relationId}
                        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn bg-primary py-2 text-[12px] font-extrabold text-white shadow-cta-sm disabled:opacity-50"
                      >
                        {busy === r.relationId ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.8} />}
                        {L('Aprobar', 'Approve')}
                      </button>
                      <button
                        onClick={() => doRespond(r, false)}
                        disabled={busy === r.relationId}
                        className="flex-none cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white px-4 py-2 text-[12px] font-extrabold text-ink-soft disabled:opacity-50"
                      >
                        {L('Rechazar', 'Decline')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current links (approved both directions + pending outgoing) */}
          <div className="mt-5">
            <div className="mb-2 text-[11.5px] font-extrabold uppercase tracking-[.05em] text-muted-2">
              {L('Relacionados', 'Linked')}
            </div>
            {approved.length + pendingOut.length === 0 ? (
              <div className="rounded-tile border-[1.5px] border-dashed border-lilac-line bg-app px-4 py-6 text-center">
                <Link2 size={22} strokeWidth={2} className="mx-auto text-primary-dark" />
                <div className="mt-2 text-[13px] font-extrabold text-ink">{L('Aún no hay listados relacionados', 'No linked listings yet')}</div>
                <div className="mt-0.5 text-[11.5px] font-semibold text-muted">{L('Relaciona una sucursal, un aliado o un colaborador.', 'Link a branch, a partner or a collaborator.')}</div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {[...approved, ...pendingOut].map(relRow)}
              </div>
            )}
          </div>

          {/* Quick-link your own other listings (auto-approved) */}
          {ownOthers.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-[11.5px] font-extrabold uppercase tracking-[.05em] text-muted-2">
                {L('Tus otros negocios', 'Your other listings')}
              </div>
              <div className="flex flex-col gap-2">
                {ownOthers.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 rounded-tile border border-hair bg-white p-3">
                    <span className="h-11 w-11 flex-none rounded-btn" style={{ background: tileBg(b.tile_a, b.tile_b) }} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13.5px] font-extrabold text-ink">{b.name}</span>
                        {b.tier !== 'free' && <VerifiedBadge size={13} />}
                      </span>
                      <span className="block truncate text-[11.5px] font-semibold text-muted">{catLabel(b.category_id)}</span>
                    </span>
                    <button
                      onClick={() => doRequest(rowToCandidate(b))}
                      className="flex flex-none cursor-pointer items-center gap-1 rounded-btn bg-lilac-2 px-3 py-2 text-[11.5px] font-extrabold text-primary-dark"
                    >
                      <Plus size={13} strokeWidth={2.8} />
                      {L('Relacionar', 'Link')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <LinkSheet
        open={sheet}
        onClose={() => setSheet(false)}
        ctx={ctx}
        demo={demo}
        source={active}
        ownBusinesses={admin.businesses}
        excludeIds={linkedTargetIds}
        onLink={doRequest}
      />
      <Toast msg={toast} />
    </>
  );
}

// ── search sheet: find a listing, pick an optional role, send/link ────────────
function LinkSheet({
  open, onClose, ctx, demo, source, ownBusinesses, excludeIds, onLink,
}: {
  open: boolean;
  onClose: () => void;
  ctx: PanelCtx;
  demo: boolean;
  source: BizRow;
  ownBusinesses: BizRow[];
  excludeIds: Set<string>;
  onLink: (c: LinkCandidate, roleEs?: string, roleEn?: string) => void;
}) {
  const { L, es } = ctx;
  const [q, setQ] = useState('');
  const [results, setResults] = useState<LinkCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<LinkCandidate | null>(null);
  const [roleEs, setRoleEs] = useState('');
  const [roleEn, setRoleEn] = useState('');

  // Local demo directory: the owner's other listings + the public sample listings.
  const demoDir = useMemo<LinkCandidate[]>(() => {
    if (!demo) return [];
    const own = ownBusinesses.filter((b) => b.id !== source.id).map(rowToCandidate);
    const ext = BUSINESSES.map((b): LinkCandidate => ({
      id: `demo-${b.slug}`, slug: b.slug, name: b.name, categoryId: b.cat, city: b.city ?? null,
      tileA: b.t[0], tileB: b.t[1], tier: b.verified ? 'verified' : 'free', sameOwner: false,
    }));
    return [...own, ...ext];
  }, [demo, ownBusinesses, source.id]);

  // Reset when opened.
  useEffect(() => {
    if (open) { setQ(''); setResults([]); setPicked(null); setRoleEs(''); setRoleEn(''); }
  }, [open]);

  // Debounced search (demo = local filter; real = RPC).
  const tRef = useRef<number | null>(null);
  useEffect(() => {
    if (!open || picked) return;
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(async () => {
      setSearching(true);
      if (demo) {
        const needle = q.trim().toLowerCase();
        setResults(demoDir.filter((c) => !excludeIds.has(c.id) && (!needle || c.name.toLowerCase().includes(needle))).slice(0, 8));
      } else {
        const rows = await searchBusinessesToLink(q, source.id);
        setResults(rows.filter((c) => !excludeIds.has(c.id)));
      }
      setSearching(false);
    }, 220);
    return () => { if (tRef.current) window.clearTimeout(tRef.current); };
  }, [q, open, picked, demo, demoDir, excludeIds, source.id]);

  const catLabel = (id: string) => { const c = CAT[id as CatKey]; return c ? L(c.es, c.en) : id; };
  const confirm = () => {
    if (!picked) return;
    onLink(picked, roleEs.trim() || undefined, (roleEn.trim() || roleEs.trim()) || undefined);
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} width={440} fullHeightSheet>
      {!picked ? (
        <>
          <OverlayTitle title={L('Relacionar un listado', 'Link a listing')} onClose={onClose} />
          <div className="flex items-center gap-2 rounded-btn border-[1.5px] border-lilac-line bg-app px-3 py-2.5">
            <Search size={15} className="flex-none text-muted" strokeWidth={2.2} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={L('Busca un negocio por nombre…', 'Search a business by name…')}
              className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-ink outline-none placeholder:text-muted"
            />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {searching && (
              <div className="flex items-center justify-center py-6 text-muted"><Loader2 size={18} className="animate-spin" /></div>
            )}
            {!searching && results.length === 0 && (
              <div className="py-6 text-center text-[12.5px] font-semibold text-muted">
                {q.trim() ? L('Sin resultados. Prueba otro nombre.', 'No results. Try another name.') : L('Escribe para buscar un listado.', 'Type to search a listing.')}
              </div>
            )}
            {!searching && results.map((c) => (
              <button
                key={c.id}
                onClick={() => setPicked(c)}
                className="flex cursor-pointer items-center gap-3 rounded-tile border border-hair bg-white p-3 text-left hover:border-lilac-ring"
              >
                <span className="h-10 w-10 flex-none rounded-btn" style={{ background: tileBg(c.tileA, c.tileB) }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-extrabold text-ink">{c.name}</span>
                    {c.tier !== 'free' && <VerifiedBadge size={12} />}
                  </span>
                  <span className="block truncate text-[11px] font-semibold text-muted">{catLabel(c.categoryId)}{c.city ? ` · ${c.city}` : ''}</span>
                </span>
                <span className={`flex-none rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${c.sameOwner ? 'bg-green-bg text-green-dark' : 'bg-lilac-2 text-primary-dark'}`}>
                  {c.sameOwner ? L('Tuyo · al instante', 'Yours · instant') : L('Requiere aprobación', 'Needs approval')}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <OverlayTitle title={L('Relación', 'Link')} onClose={onClose} onBack={() => setPicked(null)} />
          <div className="flex items-center gap-3 rounded-tile border border-hair bg-app p-3">
            <span className="h-11 w-11 flex-none rounded-btn" style={{ background: tileBg(picked.tileA, picked.tileB) }} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13.5px] font-extrabold text-ink">{picked.name}</span>
                {picked.tier !== 'free' && <VerifiedBadge size={13} />}
              </span>
              <span className="block truncate text-[11.5px] font-semibold text-muted">{catLabel(picked.categoryId)}</span>
            </span>
          </div>

          <div className="mt-3.5">
            <span className="mb-1.5 block text-[11.5px] font-extrabold text-ink">{L('Rol', 'Role')} <span className="font-semibold text-muted">· {L('opcional', 'optional')}</span></span>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_PRESETS.map(([e, n]) => {
                const on = roleEs === e;
                return (
                  <button
                    key={e}
                    onClick={() => { if (on) { setRoleEs(''); setRoleEn(''); } else { setRoleEs(e); setRoleEn(n); } }}
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-[11.5px] font-extrabold ${on ? 'bg-ink text-white' : 'bg-lilac-2 text-ink-soft'}`}
                  >
                    {es ? e : n}
                  </button>
                );
              })}
            </div>
            <input
              value={roleEs}
              onChange={(e) => { setRoleEs(e.target.value); setRoleEn(e.target.value); }}
              maxLength={28}
              placeholder={L('O escribe un rol (ej. Fotógrafo)', 'Or type a role (e.g. Photographer)')}
              className="mt-2 w-full rounded-field border-[1.5px] border-lilac-line bg-app px-3 py-2.5 text-[13px] font-semibold text-ink outline-none focus:border-primary"
            />
          </div>

          <div className={`mt-3.5 rounded-field px-3.5 py-2.5 text-[11.5px] font-semibold ${picked.sameOwner ? 'bg-green-bg text-green-dark' : 'bg-amber-bg text-amber-ink'}`}>
            {picked.sameOwner
              ? L('Es tuyo — se relaciona al instante.', 'It’s yours — links instantly.')
              : L('Es de otra persona — le enviaremos la solicitud y aparecerá cuando la apruebe.', 'It belongs to someone else — we’ll send the request and it appears once they approve.')}
          </div>

          <button
            onClick={confirm}
            className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn bg-primary py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm"
          >
            {picked.sameOwner ? L('Relacionar', 'Link') : L('Enviar solicitud', 'Send request')}
            <ChevronRight size={15} strokeWidth={2.6} />
          </button>
        </>
      )}
    </Overlay>
  );
}
