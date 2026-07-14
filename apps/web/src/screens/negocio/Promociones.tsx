'use client';

// Promociones — the unified promo/discount HUB (Premium). One place to manage
// every campaign across Menú (menuConfig.promos) and Tienda (productConfig.discounts):
// KPIs, filter by scope/type, cards grouped by status with a real redemption count
// (owner_promo_stats, migration 0087 — counts orders that used each code), quick
// activate/pause, and a unified create/edit editor that writes to the right store.
// Nothing migrates: the cart's check_promo + the menu badge keep reading the same
// config. Demo mode is explorable; a real business only ever sees its own data.

import { useEffect, useMemo, useState } from 'react';
import {
  IconTag, IconClock, IconGift, IconTruck, IconPercentage, IconLayoutGrid,
  IconDiscount2, IconSpeakerphone as Megaphone, IconPlus, IconTrash, IconCheck,
} from '@tabler/icons-react';
import { useBizAdmin } from '@/lib/bizAdmin';
import { fetchPromoStats } from '@/lib/live';
import { type PanelCtx } from '@/screens/negocio/tabs';
import {
  defaultMenuConfig, demoMenuConfig, normalizeMenuConfig, menuId,
  type MenuConfig, type Promo, type PromoType,
} from '@/lib/menuConfig';
import {
  defaultProductConfig, demoProductConfig, normalizeProductConfig,
  type ProductConfig, type Discount, type DiscountType,
} from '@/lib/productConfig';
import { defaultServiceConfig, demoServiceConfig, normalizeServiceConfig, type ServiceConfig } from '@/lib/serviceConfig';
import { defaultRentalConfig, demoRentalConfig, normalizeRentalConfig, type RentalConfig } from '@/lib/rentalConfig';
import { Overlay, OverlayTitle } from '@/components/ui';
import { Toast } from '@/screens/negocio/modules/_page';

type Scope = 'menu' | 'service' | 'rental' | 'shop';
type Status = 'active' | 'paused' | 'scheduled';
type Camp = {
  scope: Scope; id: string; name: string; typeKey: string;
  code?: string; minOrder?: number; status: Status; schedule: string; value?: number;
  redemptions: number; revenue: number;
};

const cardCls = 'rounded-card border border-hair bg-white shadow-card';

export function Promociones({ ctx }: { ctx: PanelCtx }) {
  const { L, es, mods } = ctx;
  const admin = useBizAdmin();
  const real = admin.active;
  const demo = admin.demo;
  const persistable = !demo && !!real;
  // Which scopes the business can create promos for (its active selling modules).
  const activeHas = (s: Scope) => s === 'menu' ? !!mods.menu : s === 'service' ? !!mods.services : s === 'rental' ? !!mods.rental : !!mods.products;
  const scopes: Scope[] = (['menu', 'service', 'rental', 'shop'] as Scope[]).filter((s) => demo || activeHas(s));

  const [cfgM, setCfgM] = useState<MenuConfig>(defaultMenuConfig());
  const [cfgS, setCfgS] = useState<ServiceConfig>(defaultServiceConfig());
  const [cfgR, setCfgR] = useState<RentalConfig>(defaultRentalConfig());
  const [cfgP, setCfgP] = useState<ProductConfig>(defaultProductConfig());
  const [stats, setStats] = useState<Record<string, { redemptions: number; revenue: number }>>({});
  const [filter, setFilter] = useState<'all' | Scope | 'codes'>('all');
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const [sheet, setSheet] = useState<{ open: boolean; scope: Scope; edit: Camp | null }>({ open: false, scope: 'menu', edit: null });

  useEffect(() => {
    setCfgM(demo ? demoMenuConfig() : real?.menu_config ? normalizeMenuConfig(real.menu_config) : defaultMenuConfig());
    setCfgS(demo ? demoServiceConfig() : real?.service_config ? normalizeServiceConfig(real.service_config) : defaultServiceConfig());
    setCfgR(demo ? demoRentalConfig() : real?.rental_config ? normalizeRentalConfig(real.rental_config) : defaultRentalConfig());
    setCfgP(demo ? demoProductConfig() : real?.product_config ? normalizeProductConfig(real.product_config) : defaultProductConfig());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, demo]);

  // Real redemptions (7 days) for the active business — only for a signed-in one.
  useEffect(() => {
    let off = false;
    if (persistable && real?.id) fetchPromoStats(real.id, 7).then((s) => { if (!off) setStats(s); });
    else setStats(demo ? { BIENVENIDO10: { redemptions: 84, revenue: 1180 }, ENVIOGRATIS: { redemptions: 13, revenue: 540 } } : {});
    return () => { off = true; };
  }, [real?.id, persistable, demo]);

  const saveMenu = (next: MenuConfig) => { setCfgM(next); if (persistable) admin.update({ menu_config: next }); };
  const saveService = (next: ServiceConfig) => { setCfgS(next); if (persistable) admin.update({ service_config: next }); };
  const saveRental = (next: RentalConfig) => { setCfgR(next); if (persistable) admin.update({ rental_config: next }); };
  const saveShop = (next: ProductConfig) => { setCfgP(next); if (persistable) admin.update({ product_config: next }); };

  const dayFmt = (d?: string) => (d ? new Date(d + 'T00:00').toLocaleDateString(es ? 'es-US' : 'en-US', { month: 'short', day: 'numeric' }) : '');

  // ── unify all stores into one campaign list ───────────────────────────────
  const camps: Camp[] = useMemo(() => {
    const out: Camp[] = [];
    const fromPromos = (scope: Scope, promos: Promo[]) => {
      for (const p of promos) {
        const code = p.code?.toUpperCase();
        const st = stats[code ?? ''];
        out.push({
          scope, id: p.id, name: es ? p.es : (p.en || p.es), typeKey: p.type, value: p.value,
          code, minOrder: p.minOrder, status: p.status,
          schedule: p.status === 'scheduled' ? `${L('Empieza', 'Starts')} ${dayFmt(p.startDate)}`
            : p.type === 'happy' && p.timeStart != null ? `${String(p.timeStart).padStart(2, '0')}:00–${String(p.timeEnd ?? 0).padStart(2, '0')}:00`
            : p.minOrder ? `${L('Siempre', 'Always')} · ${L('mín.', 'min.')} $${p.minOrder}` : L('Siempre', 'Always'),
          redemptions: st?.redemptions ?? 0, revenue: st?.revenue ?? 0,
        });
      }
    };
    fromPromos('menu', cfgM.promos);
    fromPromos('service', cfgS.promos);
    fromPromos('rental', cfgR.promos);
    for (const d of cfgP.discounts) {
      const code = d.code?.toUpperCase();
      const st = stats[code ?? ''];
      out.push({
        scope: 'shop', id: d.id, name: (es ? d.descEs : d.descEn) || d.code || L('Descuento', 'Discount'), typeKey: d.type, value: d.value,
        code: d.auto ? undefined : code, minOrder: d.minOrder, status: d.status,
        schedule: d.status === 'scheduled' ? `${L('Empieza', 'Starts')} ${dayFmt(d.startDate)}`
          : d.minOrder ? `${L('Siempre', 'Always')} · ${L('mín.', 'min.')} $${d.minOrder}` : L('Siempre', 'Always'),
        redemptions: st?.redemptions ?? 0, revenue: st?.revenue ?? 0,
      });
    }
    return out;
  }, [cfgM, cfgS, cfgR, cfgP, stats, es, L]);

  const shown = camps.filter((c) => filter === 'all' || (filter === 'codes' ? !!c.code : c.scope === filter));
  const kpi = {
    active: camps.filter((c) => c.status === 'active').length,
    scheduled: camps.filter((c) => c.status === 'scheduled').length,
    paused: camps.filter((c) => c.status === 'paused').length,
    redemptions: Object.values(stats).reduce((n, s) => n + s.redemptions, 0),
  };

  // Rewrite a scope's promo list. Menu/Service/Rental share the Promo[] shape.
  const writePromos = (scope: Scope, fn: (list: Promo[]) => Promo[]) => {
    if (scope === 'menu') saveMenu({ ...cfgM, promos: fn(cfgM.promos) });
    else if (scope === 'service') saveService({ ...cfgS, promos: fn(cfgS.promos) });
    else if (scope === 'rental') saveRental({ ...cfgR, promos: fn(cfgR.promos) });
  };
  const setStatus = (c: Camp, status: Status) => {
    if (c.scope === 'shop') saveShop({ ...cfgP, discounts: cfgP.discounts.map((d) => (d.id === c.id ? { ...d, status } : d)) });
    else writePromos(c.scope, (l) => l.map((p) => (p.id === c.id ? { ...p, status } : p)));
    flash(status === 'active' ? L('Campaña activada', 'Campaign activated') : status === 'paused' ? L('Campaña pausada', 'Campaign paused') : L('Guardado', 'Saved'));
  };
  const removeCamp = (c: Camp) => {
    if (c.scope === 'shop') saveShop({ ...cfgP, discounts: cfgP.discounts.filter((d) => d.id !== c.id) });
    else writePromos(c.scope, (l) => l.filter((p) => p.id !== c.id));
    flash(L('Campaña eliminada', 'Campaign deleted'));
  };
  const upsert = (scope: Scope, obj: Promo | Discount) => {
    if (scope === 'shop') {
      const d = obj as Discount; const exists = cfgP.discounts.some((x) => x.id === d.id);
      saveShop({ ...cfgP, discounts: exists ? cfgP.discounts.map((x) => (x.id === d.id ? d : x)) : [...cfgP.discounts, d] });
    } else {
      const p = obj as Promo;
      writePromos(scope, (l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [...l, p]));
    }
    flash(sheet.edit ? L('Campaña guardada', 'Campaign saved') : L('Campaña creada', 'Campaign created'));
  };

  const typeMeta = (k: string): { es: string; en: string; Icon: typeof IconTag; c: string; bg: string } => ({
    percent: { es: '% descuento', en: '% off', Icon: IconTag, c: '#4338CA', bg: '#EFEBFF' },
    amount: { es: '$ descuento', en: '$ off', Icon: IconDiscount2, c: '#4338CA', bg: '#EFEBFF' },
    combo: { es: 'Combo', en: 'Combo', Icon: IconLayoutGrid, c: '#6D4DF6', bg: '#EFEBFF' },
    bogo: { es: '2x1', en: 'BOGO', Icon: IconGift, c: '#D6336C', bg: '#FDE7EF' },
    happy: { es: 'Happy hour', en: 'Happy hour', Icon: IconClock, c: '#9A6A12', bg: '#FCEFD6' },
    shipping: { es: 'Envío gratis', en: 'Free shipping', Icon: IconTruck, c: '#1F8A4C', bg: '#E3F5EA' },
  }[k] ?? { es: 'Promo', en: 'Promo', Icon: IconPercentage, c: '#4338CA', bg: '#EFEBFF' });

  const scopeMeta = (s: Scope) => ({
    menu: { es: 'Menú', en: 'Menu', cls: 'bg-[#F2FBF5] text-green-dark' },
    service: { es: 'Servicios', en: 'Services', cls: 'bg-lilac-2 text-primary-dark' },
    rental: { es: 'Renta', en: 'Rental', cls: 'bg-pink-bg text-pink-dark' },
    shop: { es: 'Tienda', en: 'Shop', cls: 'bg-[#FFF6EC] text-amber-ink' },
  }[s]);

  const statusPill = (s: Status) => s === 'active'
    ? <span className="flex-none rounded-full bg-green-bg px-2.5 py-1 text-[10px] font-extrabold text-green-dark">{L('Activa', 'Active')}</span>
    : s === 'scheduled'
      ? <span className="flex-none rounded-full bg-amber-bg px-2.5 py-1 text-[10px] font-extrabold text-amber-ink">{L('Programada', 'Scheduled')}</span>
      : <span className="flex-none rounded-full bg-lilac-2 px-2.5 py-1 text-[10px] font-extrabold text-muted">{L('Pausada', 'Paused')}</span>;

  const card = (c: Camp) => {
    const m = typeMeta(c.typeKey);
    const valLabel = c.typeKey === 'percent' ? `${m[es ? 'es' : 'en']} · ${c.value ?? 0}%`
      : c.typeKey === 'amount' || c.typeKey === 'combo' ? `${m[es ? 'es' : 'en']} · $${c.value ?? 0}`
      : m[es ? 'es' : 'en'];
    return (
      <div key={`${c.scope}:${c.id}`} className={`${cardCls} mb-2.5 flex gap-3 p-3.5 ${c.status === 'paused' ? 'opacity-75' : ''}`}>
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-tile" style={{ background: m.bg }}>
          <m.Icon size={21} stroke={2.1} style={{ color: m.c }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-[14.5px] font-extrabold text-ink">{c.name}</div>
            {statusPill(c.status)}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-chip bg-lilac-2 px-2 py-0.5 text-[10.5px] font-bold text-ink-2">{valLabel}</span>
            {(() => { const sm = scopeMeta(c.scope); return <span className={`rounded-chip px-2 py-0.5 text-[10.5px] font-bold ${sm.cls}`}>{es ? sm.es : sm.en}</span>; })()}
            {c.code && <span className="rounded-chip bg-[#F1F5FF] px-2 py-0.5 font-mono text-[10.5px] font-extrabold tracking-wider text-[#4338CA]">{c.code}</span>}
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-hair pt-2.5">
            <span className="text-[10.5px] font-semibold text-muted">{c.schedule}</span>
            {c.status === 'active'
              ? <span className="text-[10.5px] font-extrabold text-ink-2"><b className="text-primary-dark">{c.redemptions}</b> {L('canjes', 'redemptions')}</span>
              : (
                <span className="flex gap-1.5">
                  <button onClick={() => setStatus(c, 'active')} className="cursor-pointer rounded-chip border-[1.5px] border-lilac-line px-2.5 py-1 text-[10.5px] font-extrabold text-primary-dark">{c.status === 'scheduled' ? L('Activar', 'Activate') : L('Reanudar', 'Resume')}</button>
                  <button onClick={() => setSheet({ open: true, scope: c.scope, edit: c })} className="cursor-pointer rounded-chip border-[1.5px] border-hair px-2.5 py-1 text-[10.5px] font-extrabold text-muted">{L('Editar', 'Edit')}</button>
                </span>
              )}
          </div>
          {c.status === 'active' && (
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => setSheet({ open: true, scope: c.scope, edit: c })} className="cursor-pointer rounded-chip border-[1.5px] border-lilac-line px-2.5 py-1 text-[10.5px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
              <button onClick={() => setStatus(c, 'paused')} className="cursor-pointer rounded-chip border-[1.5px] border-hair px-2.5 py-1 text-[10.5px] font-extrabold text-muted">{L('Pausar', 'Pause')}</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const group = (label: string, list: Camp[]) => list.length === 0 ? null : (
    <div key={label}>
      <div className="mb-2 mt-4 flex items-center gap-2">
        <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-ink-2">{label}</span>
        <span className="rounded-full border border-hair bg-white px-2 text-[10.5px] font-extrabold text-muted-2">{list.length}</span>
      </div>
      {list.map(card)}
    </div>
  );

  // Only show a scope's filter tab when the business actually has that module on.
  const FT: [typeof filter, string][] = [
    ['all', L('Todas', 'All')],
    ...(cfgM.promos.length || activeHas('menu') ? [['menu', L('Menú', 'Menu')] as [typeof filter, string]] : []),
    ...(cfgS.promos.length || activeHas('service') ? [['service', L('Servicios', 'Services')] as [typeof filter, string]] : []),
    ...(cfgR.promos.length || activeHas('rental') ? [['rental', L('Renta', 'Rental')] as [typeof filter, string]] : []),
    ...(cfgP.discounts.length || activeHas('shop') ? [['shop', L('Tienda', 'Shop')] as [typeof filter, string]] : []),
    ['codes', L('Códigos', 'Codes')],
  ];

  return (
    <div className="mx-auto max-w-[720px]">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2">
        {([[kpi.active, L('Activas', 'Active'), false], [kpi.scheduled, L('Programadas', 'Scheduled'), false], [kpi.paused, L('Pausadas', 'Paused'), false], [kpi.redemptions, L('Canjes · 7d', 'Redeemed · 7d'), true]] as [number, string, boolean][]).map(([n, l, hot], i) => (
          <div key={i} className={`${cardCls} px-2 py-3 text-center`}>
            <div className={`text-[20px] font-extrabold leading-none ${hot ? 'text-green-dark' : 'text-ink'}`}>{n}</div>
            <div className="mt-1.5 text-[9.5px] font-bold text-muted">{l}</div>
          </div>
        ))}
      </div>

      {/* filter tabs */}
      <div className="mt-3.5 flex gap-2 overflow-x-auto pb-0.5">
        {FT.map(([k, lbl]) => (
          <button key={k} onClick={() => setFilter(k)} className={`flex-none cursor-pointer rounded-chip px-3.5 py-1.5 text-[12px] font-extrabold transition-colors ${filter === k ? 'bg-primary text-white' : 'border border-hair bg-white text-muted'}`}>{lbl}</button>
        ))}
      </div>

      {/* CTA */}
      <button onClick={() => setSheet({ open: true, scope: scopes[0] ?? 'menu', edit: null })} className="mt-3.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20"><IconPlus size={15} stroke={2.6} /></span>
        {L('Nueva campaña', 'New campaign')}
      </button>

      {shown.length === 0 ? (
        <div className={`${cardCls} mt-4 flex flex-col items-center gap-2 px-6 py-10 text-center`}>
          <Megaphone size={30} stroke={1.8} className="text-muted-2" />
          <div className="text-[13px] font-extrabold text-ink">{L('Sin campañas todavía', 'No campaigns yet')}</div>
          <div className="max-w-[240px] text-[11.5px] font-semibold text-muted">{L('Crea tu primera promoción con código para atraer y premiar a tus clientes.', 'Create your first coded promo to attract and reward customers.')}</div>
        </div>
      ) : (
        <>
          {group(L('Activas', 'Active'), shown.filter((c) => c.status === 'active'))}
          {group(L('Programadas', 'Scheduled'), shown.filter((c) => c.status === 'scheduled'))}
          {group(L('Pausadas', 'Paused'), shown.filter((c) => c.status === 'paused'))}
        </>
      )}

      <div className="mt-4 rounded-card border border-lilac-line bg-lilac-2 px-4 py-3 text-[10.5px] font-semibold leading-snug text-ink-2">
        <b className="text-primary-dark">{L('Cómo funcionan', 'How it works')}.</b>{' '}
        {L('Los canjes se cuentan de los pedidos REALES que usaron cada código. Las promos con código se canjean en el carrito; sin código, se muestran como distintivo. Tú financias tus promociones — To’Latino no cobra nada de ellas.', 'Redemptions are counted from REAL orders that used each code. Coded promos redeem in the cart; without a code they show as a badge. You fund your promotions — To’Latino takes nothing from them.')}
      </div>

      {sheet.open && (
        <CampaignEditor
          L={L} es={es} scope={sheet.scope} scopes={scopes} edit={sheet.edit}
          onClose={() => setSheet({ ...sheet, open: false })}
          onScope={(s) => setSheet({ ...sheet, scope: s })}
          onSave={(scope, obj) => { upsert(scope, obj); setSheet({ ...sheet, open: false }); }}
          onDelete={(c) => { removeCamp(c); setSheet({ ...sheet, open: false }); }}
        />
      )}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

// ── unified create/edit editor — maps to the right store by scope ────────────
function CampaignEditor({
  L, es, scope, scopes, edit, onClose, onScope, onSave, onDelete,
}: {
  L: PanelCtx['L']; es: boolean; scope: Scope; scopes: Scope[]; edit: Camp | null;
  onClose: () => void; onScope: (s: Scope) => void;
  onSave: (scope: Scope, obj: Promo | Discount) => void; onDelete: (c: Camp) => void;
}) {
  const menuTypes: PromoType[] = ['percent', 'combo', 'bogo', 'happy'];
  const shopTypes: DiscountType[] = ['percent', 'amount', 'shipping', 'bogo'];
  // Services & rentals only support a coded % discount at checkout (business-absorbed).
  const bookTypes: PromoType[] = ['percent'];
  const typesFor = (s: Scope): string[] => s === 'menu' ? menuTypes : s === 'shop' ? shopTypes : bookTypes;
  const [type, setType] = useState<string>(edit?.typeKey ?? 'percent');
  const [name, setName] = useState(edit?.name ?? '');
  const [value, setValue] = useState(edit?.value != null ? String(edit.value) : '');
  const [code, setCode] = useState(edit?.code ?? '');
  const [minOrder, setMinOrder] = useState(edit?.minOrder != null ? String(edit.minOrder) : '');
  const [status, setStatus] = useState<Status>(edit?.status ?? 'active');
  const [startDate, setStartDate] = useState('');
  const [confirm, setConfirm] = useState(false);
  const types = typesFor(scope);
  useEffect(() => { if (!types.includes(type)) setType(types[0]); }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsValue = type === 'percent' || type === 'amount' || type === 'combo';
  const canCode = type === 'percent' || type === 'amount'; // codes only make sense for a monetary discount
  const ready = !!name.trim() && (!needsValue || Number(value) > 0) && (status !== 'scheduled' || !!startDate);
  const inputCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary';
  const lbl = 'mb-1 text-[11px] font-extrabold text-ink-soft';

  const save = () => {
    if (!ready) return;
    const id = edit?.id ?? menuId();
    const nm = name.trim();
    const codeUp = canCode && code.trim() ? code.trim().toUpperCase().replace(/\s+/g, '') : undefined;
    const min = Number(minOrder) > 0 ? Number(minOrder) : undefined;
    if (scope === 'shop') {
      onSave('shop', {
        id, code: codeUp ?? '', type: type as DiscountType,
        value: needsValue ? Number(value) || undefined : undefined,
        descEs: nm, descEn: nm, auto: !codeUp, minOrder: min,
        status, startDate: status === 'scheduled' ? startDate : undefined,
      });
    } else {
      // menu / service / rental all use the Promo shape.
      onSave(scope, {
        id, type: type as PromoType, es: nm, en: nm, descEs: '', descEn: '',
        value: needsValue ? Number(value) || undefined : undefined,
        code: type === 'percent' ? codeUp : undefined, minOrder: type === 'percent' ? min : undefined,
        status, startDate: status === 'scheduled' ? startDate : undefined,
      });
    }
  };

  return (
    <Overlay open onClose={onClose} width={460} fullHeightSheet>
      <OverlayTitle title={edit ? L('Editar campaña', 'Edit campaign') : L('Nueva campaña', 'New campaign')} onClose={onClose} />
      <div className="flex flex-col gap-3.5">
        {/* scope (create only) — only the business's active selling modules */}
        {!edit && scopes.length > 1 && (
          <div>
            <div className={lbl}>{L('¿Dónde aplica?', 'Where does it apply?')}</div>
            <div className="flex flex-wrap gap-2">
              {scopes.map((s) => {
                const scopeLabel: Record<Scope, string> = { menu: L('Menú de comida', 'Food menu'), service: L('Servicios', 'Services'), rental: L('Renta', 'Rental'), shop: L('Tienda', 'Shop') };
                return <button key={s} onClick={() => onScope(s)} className={`min-w-[calc(50%-4px)] flex-1 cursor-pointer rounded-field border-[1.5px] py-2.5 text-[12.5px] font-extrabold ${scope === s ? 'border-primary bg-lilac-3 text-primary-dark' : 'border-lilac-line bg-white text-ink-soft'}`}>{scopeLabel[s]}</button>;
              })}
            </div>
          </div>
        )}
        {/* type */}
        <div>
          <div className={lbl}>{L('Tipo de promoción', 'Promo type')}</div>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => {
              const on = type === t;
              const labels: Record<string, string> = { percent: L('% descuento', '% off'), amount: L('$ descuento', '$ off'), combo: L('Combo', 'Combo'), bogo: L('2x1', 'BOGO'), happy: L('Happy hour', 'Happy hour'), shipping: L('Envío gratis', 'Free shipping') };
              return <button key={t} onClick={() => setType(t)} className={`cursor-pointer rounded-field border-[1.5px] px-3 py-2 text-[12px] font-extrabold ${on ? 'border-primary bg-lilac-3 text-primary-dark' : 'border-lilac-line bg-white text-ink-soft'}`}>{labels[t]}</button>;
            })}
          </div>
        </div>
        <div><div className={lbl}>{L('Nombre', 'Name')} *</div><input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('Ej. Bienvenida 10%', 'e.g. Welcome 10%')} className={inputCls} /></div>
        {needsValue && (
          <div><div className={lbl}>{type === 'percent' ? L('Descuento (%)', 'Discount (%)') : L('Monto ($)', 'Amount ($)')} *</div>
            <div className="flex w-[140px] items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary">
              {type !== 'percent' && <span className="text-[13px] font-bold text-muted-2">$</span>}
              <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))} placeholder={type === 'percent' ? '10' : '5'} inputMode="decimal" className="min-w-0 flex-1 border-none bg-transparent px-1 py-2.5 text-[13px] font-semibold text-ink outline-none" />
              {type === 'percent' && <span className="text-[13px] font-bold text-muted-2">%</span>}
            </div>
          </div>
        )}
        {canCode && (
          <div className="flex gap-3">
            <div className="flex-1"><div className={lbl}>{L('Código (opcional)', 'Code (optional)')}</div><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))} placeholder={L('BIENVENIDO10', 'WELCOME10')} maxLength={24} className={`${inputCls} uppercase`} /></div>
            <div className="w-[120px] flex-none"><div className={lbl}>{L('Pedido mín.', 'Min. order')}</div>
              <div className="flex items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary"><span className="text-[13px] font-bold text-muted-2">$</span><input value={minOrder} onChange={(e) => setMinOrder(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" inputMode="decimal" className="min-w-0 flex-1 border-none bg-transparent px-1.5 py-2.5 text-[13px] font-semibold text-ink outline-none" /></div>
            </div>
          </div>
        )}
        {type === 'shipping' && (
          <div className="w-[140px]"><div className={lbl}>{L('Pedido mín.', 'Min. order')}</div>
            <div className="flex items-center rounded-field border-[1.5px] border-lilac-line bg-white px-3 focus-within:border-primary"><span className="text-[13px] font-bold text-muted-2">$</span><input value={minOrder} onChange={(e) => setMinOrder(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="40" inputMode="decimal" className="min-w-0 flex-1 border-none bg-transparent px-1.5 py-2.5 text-[13px] font-semibold text-ink outline-none" /></div>
          </div>
        )}
        {/* status */}
        <div>
          <div className={lbl}>{L('Estado', 'Status')}</div>
          <div className="flex gap-2">
            {(['active', 'paused', 'scheduled'] as Status[]).map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`flex-1 cursor-pointer rounded-field border-[1.5px] py-2 text-[11.5px] font-extrabold ${status === s ? 'border-primary bg-lilac-3 text-primary-dark' : 'border-lilac-line bg-white text-ink-soft'}`}>{s === 'active' ? L('Activa', 'Active') : s === 'paused' ? L('Pausada', 'Paused') : L('Programada', 'Scheduled')}</button>
            ))}
          </div>
        </div>
        {status === 'scheduled' && (
          <div><div className={lbl}>{L('Empieza el', 'Starts on')} *</div><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${inputCls} text-left`} /></div>
        )}
      </div>

      <div className="mt-5 flex gap-2.5">
        {edit && !confirm && <button onClick={() => setConfirm(true)} className="flex-none cursor-pointer rounded-btn border-[1.5px] border-pink-bg px-3.5 py-3 text-pink-dark"><IconTrash size={16} /></button>}
        {edit && confirm && <button onClick={() => onDelete(edit)} className="flex-none cursor-pointer rounded-btn bg-pink-bg px-3.5 py-3 text-[12px] font-extrabold text-pink-dark">{L('Eliminar', 'Delete')}</button>}
        <button onClick={save} disabled={!ready} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm disabled:opacity-50">
          <IconCheck size={16} stroke={2.6} /> {edit ? L('Guardar cambios', 'Save changes') : L('Crear campaña', 'Create campaign')}
        </button>
      </div>
    </Overlay>
  );
}
