'use client';

// Entregas y envíos (Delivery & Shipping) — SHARED fulfillment module used by
// BOTH the Food menu (local delivery) and Products (delivery + national
// shipping). Extracted out of Products so a restaurant and a shop configure the
// same business-wide fulfillment once, in one place. Persists to
// `businesses.settings` { shipping, drivers } (jsonb) through the resilient
// admin.update — NO migration (the data was already business-scoped). Two
// sections matching the owner's mental model:
//   · Delivery (entrega local): Zonas + Repartidores (propios / apps externas)
//   · Shipping (envío): Recoger en tienda + Envío nacional (propio / carriers)
// Reachable from the sidebar whenever Menú or Productos is on; deep-linked from
// the legacy `shipping` / `drivers` tab ids and from shortcuts in Food/Products.

import { useEffect, useState } from 'react';
import {
  Boxes, Clock, DollarSign, HardHat, MapPin, Package, Route, Store, Truck, Utensils,
} from 'lucide-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { activeMods } from '@/screens/negocio/tabs';
import { useBizAdmin } from '@/lib/bizAdmin';
import { Toast } from '@/screens/negocio/modules/_page';

// ---- shipping / drivers persistence model (businesses.settings jsonb) ----
// Language-neutral records (es/en pairs) so lists persist AND render through L()
// without freezing one language.
type Zone = { color: string; es: string; en: string; rad: string; time: string; feeEs: string; feeEn: string };
type OwnDriver = { initials: string; color: string; dot: string; name: string; sEs: string; sEn: string; orderEs: string; orderEn: string; km: string; eta: string };

const ZONE_SEED: Zone[] = [
  { color: '#7B61FF', es: 'Zona 1 · Centro', en: 'Zone 1 · Core', rad: '0–1.2 mi', time: '30–45 min', feeEs: 'Gratis +$25', feeEn: 'Free +$25' },
  { color: '#F0466E', es: 'Zona 2 · Ampliada', en: 'Zone 2 · Greater', rad: '1.2–3 mi', time: '45–60 min', feeEs: '$5', feeEn: '$5' },
  { color: '#F4B740', es: 'Zona 3 · Exterior', en: 'Zone 3 · Outer', rad: '3–8 mi', time: '60–90 min', feeEs: '$12', feeEn: '$12' },
];
const ZONE_COLORS = ['#7B61FF', '#F0466E', '#F4B740'];
const DRIVER_SEED: OwnDriver[] = [
  { initials: 'MP', color: '#7B61FF', dot: '#1F9D57', name: 'Marco P.', sEs: 'En ruta', sEn: 'On delivery', orderEs: '#2487 → Z2', orderEn: '#2487 → Z2', km: '1.8 mi', eta: 'ETA 5 min' },
  { initials: 'DR', color: '#2A5C8A', dot: '#1F9D57', name: 'Diego R.', sEs: 'En ruta', sEn: 'On delivery', orderEs: '#2484 → Z1', orderEn: '#2484 → Z1', km: '0.9 mi', eta: 'ETA 2 min' },
  { initials: 'AV', color: '#E8954A', dot: '#6D4DF6', name: 'Andrea V.', sEs: 'En tienda', sEn: 'Idle · shop', orderEs: 'Lista', orderEn: 'Ready next', km: '—', eta: '—' },
  { initials: 'LM', color: '#9A96AE', dot: '#9A96AE', name: 'Lucía M.', sEs: 'Libre hoy', sEn: 'Off today', orderEs: 'Mar–Jue', orderEn: 'Mar–Jue', km: '—', eta: '—' },
];
const PICK_DEF = [true, true, true, true];
const CARRIER_DEF = [true, true, true, false];
const EXT_DEF = [true, true, false];
const arrToRec = (a: boolean[]): Record<number, boolean> => {
  const r: Record<number, boolean> = {};
  a.forEach((v, i) => { r[i] = v; });
  return r;
};
const recToArr = (r: Record<number, boolean>, n: number): boolean[] => Array.from({ length: n }, (_, i) => !!r[i]);

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';

type Section = 'delivery' | 'shipping';
type DelTab = 'zones' | 'drivers';
type ShipTab = 'pickup' | 'ship';

export function FulfillmentModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, isFree, isPremium, ci, go } = ctx;
  const admin = useBizAdmin();
  const real = admin.active;
  const persistable = !admin.demo && !!real;
  const am = activeMods(ctx);

  // Deep-link from the legacy tab ids: `drivers` → Delivery·Repartidores,
  // `shipping` → Delivery·Zonas; anything else opens Delivery·Zonas.
  const [sec, setSec] = useState<Section>('delivery');
  const [delTab, setDelTab] = useState<DelTab>(tab === 'drivers' ? 'drivers' : 'zones');
  const [shipTab, setShipTab] = useState<ShipTab>('pickup');
  const [driverTab, setDriverTab] = useState<'own' | 'external'>('own');
  const [natTab, setNatTab] = useState<'own' | 'external'>('external');

  const [zones, setZones] = useState<Zone[]>(ZONE_SEED);
  const [drivers, setDrivers] = useState<OwnDriver[]>(DRIVER_SEED);
  const [pickState, setPickState] = useState<Record<number, boolean>>(arrToRec(PICK_DEF));
  const [carrierState, setCarrierState] = useState<Record<number, boolean>>(arrToRec(CARRIER_DEF));
  const [extState, setExtState] = useState<Record<number, boolean>>(arrToRec(EXT_DEF));
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };

  // Seed config from the real business's settings jsonb (falls back to fixtures
  // when absent). Re-seeds on business / demo change; local edits are never
  // clobbered (id is stable).
  useEffect(() => {
    const s = (real?.settings ?? {}) as Record<string, unknown>;
    const ship = (s.shipping ?? {}) as {
      delivery?: { zones?: Zone[] };
      pickup?: { rules?: boolean[] };
      national?: { carriers?: boolean[] };
      external?: boolean[];
    };
    const dz = ship.delivery?.zones;
    const dr = s.drivers;
    const pr = ship.pickup?.rules;
    const ca = ship.national?.carriers;
    const ex = ship.external;
    setZones(Array.isArray(dz) && dz.length ? dz : ZONE_SEED);
    setDrivers(Array.isArray(dr) && dr.length ? (dr as OwnDriver[]) : DRIVER_SEED);
    setPickState(arrToRec(Array.isArray(pr) ? pr : PICK_DEF));
    setCarrierState(arrToRec(Array.isArray(ca) ? ca : CARRIER_DEF));
    setExtState(arrToRec(Array.isArray(ex) ? ex : EXT_DEF));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  // Build the shipping settings object from current (or just-changed) state.
  const buildShipping = (o: { zones?: Zone[]; pick?: Record<number, boolean>; carrier?: Record<number, boolean>; ext?: Record<number, boolean> }) => {
    const z = o.zones ?? zones;
    const pRules = recToArr(o.pick ?? pickState, 4);
    const cArr = recToArr(o.carrier ?? carrierState, 4);
    const eArr = recToArr(o.ext ?? extState, 3);
    return {
      delivery: { on: z.length > 0, radius: z.length ? z[z.length - 1].rad : '', fee: z.length > 1 ? z[1].feeEs : (z[0]?.feeEs ?? ''), zones: z },
      pickup: { on: pRules.some(Boolean), rules: pRules },
      national: { on: cArr.some(Boolean), carriers: cArr },
      external: eArr,
    };
  };
  // Persist { shipping, drivers } to businesses.settings (RLS). Demo / not
  // configured → local only (admin.update no-ops the network).
  const persistShip = (o: { zones?: Zone[]; pick?: Record<number, boolean>; carrier?: Record<number, boolean>; ext?: Record<number, boolean>; drivers?: OwnDriver[] } = {}) => {
    if (!persistable || !real) return;
    admin.update({ settings: { ...(real.settings ?? {}), shipping: buildShipping(o), drivers: o.drivers ?? drivers } });
  };
  const addZone = () => {
    const n = zones.length + 1;
    const next: Zone[] = [...zones, { color: ZONE_COLORS[zones.length % ZONE_COLORS.length], es: `Zona ${n}`, en: `Zone ${n}`, rad: '—', time: '—', feeEs: '$0', feeEn: '$0' }];
    setZones(next);
    persistShip({ zones: next });
    flash(L('Nueva zona creada', 'New zone created'));
  };

  // ---------- shared styles ----------
  const dashBtn = 'w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-line bg-lilac-3 px-3 py-3.5 text-[12.5px] font-extrabold text-primary-dark';
  const chip = (on: boolean) =>
    `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12.5px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;
  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} aria-pressed={on} className={`relative h-[26px] w-[46px] flex-none cursor-pointer rounded-full transition-colors ${on ? 'bg-primary' : 'bg-lilac-line'}`}>
      <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-all ${on ? 'left-[23px]' : 'left-[3px]'}`} />
    </button>
  );

  // ---------- Delivery · zones ----------
  const zonesView = (
    <div className="flex flex-col gap-3.5 md:grid md:grid-cols-2 md:items-start md:gap-4 xl:grid-cols-1 2xl:grid-cols-2">
      {/* map placeholder */}
      <div className="relative h-[190px] overflow-hidden rounded-card-sm border border-hair" style={{ background: '#EAEEF6' }}>
        <div className="absolute left-[-10px] top-[30px] h-[9px] w-[150%] bg-white" style={{ transform: 'rotate(-14deg)' }} />
        <div className="absolute bottom-[40px] left-[-10px] h-[8px] w-[150%] bg-white" style={{ transform: 'rotate(7deg)' }} />
        <div className="absolute left-[42%] top-[-10px] h-[150%] w-[9px] bg-white" style={{ transform: 'rotate(10deg)' }} />
        <div className="absolute left-1/2 top-1/2 h-[130px] w-[170px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ border: '2px solid rgba(244,183,64,.6)', background: 'rgba(244,183,64,.06)' }} />
        <div className="absolute left-1/2 top-1/2 h-[92px] w-[116px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ border: '2px solid rgba(240,70,110,.6)', background: 'rgba(240,70,110,.06)' }} />
        <div className="absolute left-1/2 top-1/2 h-[52px] w-[64px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ border: '2px solid rgba(123,97,255,.7)', background: 'rgba(123,97,255,.08)' }} />
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-card" />
      </div>
      <div className="flex flex-col gap-2.5">
        {zones.map((z, zi) => (
          <div key={zi} className="flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3">
            <span className="h-3 w-3 flex-none rounded-full" style={{ background: z.color }} />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-extrabold text-ink">{L(z.es, z.en)}</div>
              <div className="mt-0.5 text-[10px] font-medium text-muted-2">{z.rad} · ETA {z.time}</div>
            </div>
            <span className="flex-none text-[13px] font-extrabold text-ink">{L(z.feeEs, z.feeEn)}</span>
          </div>
        ))}
        <div className="flex items-center gap-3 rounded-card-sm bg-lilac-2 p-3">
          <Truck size={16} strokeWidth={2} className="flex-none text-primary-dark" />
          <div>
            <div className="text-[11.5px] font-extrabold text-ink">{L('Fuera de zona → envío', 'Out of zone → shipping')}</div>
            <div className="mt-0.5 text-[10px] font-medium leading-snug text-ink-3">{L('Más allá de la última zona se ofrece envío o recoger.', 'Beyond the last zone we offer shipping or pickup.')}</div>
          </div>
        </div>
        <button onClick={addZone} className={dashBtn}>+ {L('Nueva zona', 'New zone')}</button>
      </div>
    </div>
  );

  // ---------- Delivery · drivers (propios / externos) ----------
  const driverKpis = [
    { Icon: HardHat, cls: 'bg-lilac text-primary-dark', label: L('Activos', 'Active'), value: '3/5', delta: L('2 en ruta', '2 on delivery'), dCls: 'text-muted-2' },
    { Icon: Truck, cls: 'bg-pink-bg text-pink-dark', label: L('Entregas hoy', 'Deliveries today'), value: '42', delta: '▲ 12%', dCls: 'text-green' },
    { Icon: Clock, cls: 'bg-green-bg text-green-dark', label: L('Tiempo prom.', 'Avg time'), value: '18 min', delta: '▼ 2 min', dCls: 'text-green' },
    { Icon: DollarSign, cls: 'bg-amber-bg text-amber-ink', label: L('Costo hoy', 'Cost today'), value: '$336', delta: '$8/' + L('entrega', 'delivery'), dCls: 'text-muted-2' },
  ];
  const extRaw = [
    { label: 'U', color: '#000', name: 'Uber Direct', dEs: 'Conductores bajo demanda cuando los tuyos están ocupados.', dEn: 'On-demand drivers when yours are busy.', rate: '$8.50 ' + L('prom', 'avg'), cEs: 'Gestionar', cEn: 'Manage' },
    { label: 'D', color: '#FF3008', name: 'DoorDash Drive', dEs: 'Respaldo cuando salen de zona.', dEn: 'Standby fallback out of zone.', rate: '$9.00 ' + L('prom', 'avg'), cEs: 'Gestionar', cEn: 'Manage' },
    { label: 'R', color: '#FF441F', name: 'Rappi / Uber Eats', dEs: 'Cobertura extra en horas pico.', dEn: 'Extra coverage at peak hours.', rate: '—', cEs: 'Conectar', cEn: 'Connect' },
  ];

  const driversView = (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-2 2xl:grid-cols-4">
        {driverKpis.map((k) => (
          <div key={k.label} className={`${cardCls} p-3`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-btn ${k.cls}`}><k.Icon size={16} strokeWidth={2.2} /></span>
            <div className="mt-2 text-[10px] font-bold text-muted-2">{k.label}</div>
            <div className="mt-0.5 text-[18px] font-extrabold text-ink">{k.value}</div>
            <div className={`text-[9.5px] font-extrabold ${k.dCls}`}>{k.delta}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 rounded-btn border border-hair bg-white p-1">
        {(['own', 'external'] as const).map((d) => (
          <button key={d} onClick={() => setDriverTab(d)} className={`flex-1 cursor-pointer rounded-[9px] py-2 text-[11.5px] font-extrabold ${driverTab === d ? 'bg-primary text-white' : 'text-ink-2'}`}>
            {d === 'own' ? L('Propios', 'Own') : L('Apps externas', 'External apps')}
          </button>
        ))}
      </div>
      {driverTab === 'external' && (
        <div className="flex items-center gap-2 rounded-field bg-lilac-2 px-3 py-2 text-[10.5px] font-semibold text-ink-3">
          <span className="rounded bg-primary px-1.5 py-0.5 text-[8px] font-extrabold text-white">PREMIUM</span>
          {isPremium ? L('Incluido en tu plan Premium.', 'Included in your Premium plan.') : L('Las apps externas de reparto son parte de Premium.', 'External delivery apps are part of Premium.')}
        </div>
      )}
      {driverTab === 'own' ? (
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {drivers.map((d) => (
            <div key={d.name} className="flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3">
              <span className="relative flex-none">
                <span className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: d.color }}>{d.initials}</span>
                <span className="absolute -bottom-px -right-px h-3 w-3 rounded-full border-2 border-white" style={{ background: d.dot }} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-extrabold text-ink">{d.name}</div>
                <div className="mt-0.5 truncate text-[10px] font-medium text-muted-2">{L(d.sEs, d.sEn)} · {L(d.orderEs, d.orderEn)}</div>
              </div>
              <div className="flex-none text-right">
                <div className="text-[11.5px] font-extrabold text-ink">{d.km}</div>
                <div className="text-[9.5px] font-semibold text-muted-2">{d.eta}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {extRaw.map((a, i) => {
            const on = extState[i];
            return (
              <div key={a.name} className="rounded-card-sm border border-hair bg-white p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn text-[15px] font-extrabold text-white" style={{ background: a.color }}>{a.label}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-extrabold text-ink">{a.name}</div>
                    <div className="mt-0.5 text-[10px] font-medium leading-snug text-muted-2">{L(a.dEs, a.dEn)}</div>
                  </div>
                  <Toggle on={on} onClick={() => { const next = { ...extState, [i]: !on }; setExtState(next); persistShip({ ext: next }); }} />
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-hair pt-2.5">
                  <span className="text-[10px] font-semibold text-muted-2">{a.rate}</span>
                  <span className="text-[10.5px] font-extrabold text-primary-dark">{L(a.cEs, a.cEn)} ›</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ---------- Shipping · pickup ----------
  const pickupLocs = [
    { name: real?.address ?? '5821 Bellaire Blvd', main: true, hours: L('7 AM – 8 PM diario', '7 AM – 8 PM daily'), window: L('listo en 30 min', 'ready 30 min') },
    { name: 'Katy · Mason Rd', main: false, hours: 'Mar–Dom · 8–6', window: L('listo en 45 min', 'ready 45 min') },
  ];
  const pickRules = [
    [L('Recogida en banqueta', 'Curbside pickup'), L('El cliente avisa al llegar', 'Customer texts on arrival')],
    [L('Horarios programados', 'Scheduled slots'), L('Permite elegir hora', 'Let customers pick a time')],
    [L('SMS cuando esté listo', 'SMS when ready'), L('Notifica automáticamente', 'Auto-notify on ready')],
    [L('ID para alcohol', 'Photo ID for alcohol'), L('Requerido para 21+', 'Required for 21+')],
  ];

  const pickupView = (
    <div className="flex flex-col gap-3.5">
      <div>
        <div className="mb-2 px-0.5 text-[12px] font-extrabold text-ink">{L('Puntos de recogida', 'Pickup locations')}</div>
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {pickupLocs.map((p) => (
            <div key={p.name} className="flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac text-primary-dark"><Store size={17} strokeWidth={2} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-extrabold text-ink">{p.name}</span>
                  {p.main && <span className="rounded bg-green-bg px-1.5 py-px text-[8px] font-extrabold text-green-dark">{L('Principal', 'Primary')}</span>}
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-muted-2">{p.hours} · {p.window}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 px-0.5 text-[12px] font-extrabold text-ink">{L('Ajustes de recogida', 'Pickup settings')}</div>
        <div className={`${cardCls} px-3.5`}>
          {pickRules.map((r, i) => {
            const on = pickState[i];
            return (
              <div key={r[0]} className={`flex items-center gap-3 py-3 ${i < pickRules.length - 1 ? 'border-b border-hair' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-ink">{r[0]}</div>
                  <div className="mt-0.5 text-[10px] font-medium text-muted-2">{r[1]}</div>
                </div>
                <Toggle on={on} onClick={() => { const next = { ...pickState, [i]: !on }; setPickState(next); persistShip({ pick: next }); }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ---------- Shipping · national (propio / carriers externos) ----------
  const carrRaw = [
    ['USPS Priority', L('2–3 días hábiles', '2–3 business days'), '$8.00'],
    ['UPS Ground', L('3–5 días hábiles', '3–5 business days'), '$10.00'],
    ['FedEx 2-Day', L('2 días hábiles', '2 business days'), '$18.00'],
    ['USPS Ground', L('3–5 días hábiles', '3–5 business days'), '$5.50'],
  ];

  const shipAnyView = (
    <div className="flex flex-col gap-3.5">
      <div className="flex gap-1.5 rounded-btn border border-hair bg-white p-1">
        {(['own', 'external'] as const).map((n) => (
          <button key={n} onClick={() => setNatTab(n)} className={`flex-1 cursor-pointer rounded-[9px] py-2 text-[11.5px] font-extrabold ${natTab === n ? 'bg-primary text-white' : 'text-ink-2'}`}>
            {n === 'own' ? L('Tarifa propia', 'Own rate') : L('Transportistas', 'Carriers')}
          </button>
        ))}
      </div>
      {natTab === 'own' ? (
        <>
          <div className="px-0.5 text-[12px] font-extrabold text-ink">{L('Tus tarifas de envío', 'Your shipping rates')}</div>
          <div className="flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac text-primary-dark"><Package size={17} strokeWidth={2} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-extrabold text-ink">{L('Tarifa plana nacional', 'Flat national rate')}</div>
              <div className="mt-0.5 text-[10px] font-medium text-muted-2">{L('Un solo precio a todo EE.UU.', 'One price to all of the US')}</div>
            </div>
            <span className="text-[13px] font-extrabold text-ink">$8.00</span>
          </div>
          <div className="flex items-center gap-3 rounded-card-sm border border-green/20 bg-green-bg p-3">
            <Package size={16} strokeWidth={2} className="flex-none text-green-dark" />
            <div>
              <div className="text-[11.5px] font-extrabold text-green-dark">{L('Envío gratis sobre $75', 'Free shipping over $75')}</div>
              <div className="mt-0.5 text-[10px] font-medium text-green-dark/80">{L('Se aplica automáticamente · solo EE.UU.', 'Applied automatically · US only')}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="px-0.5 text-[12px] font-extrabold text-ink">{L('Transportistas y tarifas', 'Carriers & rates')}</div>
          <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {carrRaw.map((c, i) => {
              const on = carrierState[i];
              return (
                <div key={c[0] + i} className={`flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 ${on ? '' : 'opacity-60'}`}>
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-blue-bg text-blue"><Truck size={17} strokeWidth={2} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-extrabold text-ink">{c[0]}</div>
                    <div className="mt-0.5 text-[10px] font-medium text-muted-2">{c[1]}</div>
                  </div>
                  <span className="text-[13px] font-extrabold text-ink">{c[2]}</span>
                  <Toggle on={on} onClick={() => { const next = { ...carrierState, [i]: !on }; setCarrierState(next); persistShip({ carrier: next }); }} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 rounded-field bg-lilac-2 px-3 py-2 text-[10.5px] font-semibold text-ink-3">
            <span className="rounded bg-ink px-1.5 py-0.5 text-[8px] font-extrabold text-white">API</span>
            {L('Conecta USPS/UPS/FedEx con tarifas en vivo vía Shippo cuando lances envíos reales.', 'Connect USPS/UPS/FedEx live rates via Shippo when you launch real shipping.')}
          </div>
        </>
      )}
    </div>
  );

  // ---------- content routing ----------
  const content =
    sec === 'delivery'
      ? (delTab === 'zones' ? zonesView : driversView)
      : (shipTab === 'pickup' ? pickupView : shipAnyView);

  const delSub: [DelTab, string][] = [[ 'zones', L('Zonas', 'Zones') ], [ 'drivers', L('Repartidores', 'Drivers') ]];
  const shipSub: [ShipTab, string][] = [[ 'pickup', L('Recoger', 'Pickup') ], [ 'ship', L('Envío nacional', 'National shipping') ]];

  // ---------- contextual side rail ----------
  const railLinks: { Icon: typeof Route; cls: string; title: string; sub: string; right?: string; onClick: () => void }[] = [
    ...(am.menu ? [{ Icon: Utensils as typeof Route, cls: 'bg-lilac text-primary-dark', title: L('Menú de comida', 'Food menu'), sub: L('Activa la entrega local', 'Enables local delivery'), onClick: () => go('menu') }] : []),
    ...(am.products ? [{ Icon: Boxes as typeof Route, cls: 'bg-amber-bg text-amber-ink', title: L('Productos', 'Products'), sub: L('Catálogo e inventario', 'Catalog & inventory'), onClick: () => go('products') }] : []),
  ];
  const rail = (
    <div className="flex flex-col gap-4 xl:sticky xl:top-[74px] xl:self-start">
      <div className={`${cardCls} p-4`}>
        <div className="mb-0.5 text-[13px] font-extrabold text-ink">{L('Cobertura', 'Coverage')}</div>
        <div className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold text-muted-2">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-lilac text-[7px] font-extrabold text-primary-dark">{ci.initials}</span>
          {ci.name}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {([[L('Zonas', 'Zones'), String(zones.length)], [L('Entregas hoy', 'Deliveries'), '42'], [L('Tiempo prom.', 'Avg time'), '18m'], [L('Repartidores', 'Drivers'), '3/5']] as [string, string][]).map(([l, v]) => (
            <div key={l} className="rounded-btn-lg bg-app p-3">
              <div className="text-[10px] font-bold text-muted-2">{l}</div>
              <div className="mt-0.5 text-[17px] font-extrabold text-ink">{v}</div>
            </div>
          ))}
        </div>
      </div>
      {railLinks.length > 0 && (
        <div className={`${cardCls} p-4`}>
          <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Usan estas entregas', 'Uses this fulfillment')}</div>
          <div className="flex flex-col gap-2.5">
            {railLinks.map((r) => (
              <button key={r.title} onClick={r.onClick} className="flex items-center gap-2.5 text-left">
                <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-btn ${r.cls}`}><r.Icon size={16} strokeWidth={2.2} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-extrabold text-ink">{r.title}</span>
                  <span className="block text-[10.5px] font-semibold text-muted-2">{r.sub}</span>
                </span>
                <span className="text-[13px] font-extrabold text-muted-2">›</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const secBtn = (on: boolean) => `flex items-center justify-center gap-2 rounded-btn py-2.5 text-[12.5px] font-extrabold ${on ? 'bg-ink text-white' : 'bg-lilac-2 text-ink-2'}`;

  return (
    <div className="relative pb-8">
      {isFree && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-card-sm bg-amber-bg p-3.5">
          <span className="text-[18px]">✦</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-extrabold text-ink">{L('La entrega y el envío en línea son funciones Verified.', 'Online delivery & shipping are Verified features.')}</span>
            <span className="block text-[11px] font-semibold text-amber-ink">{L('Estás viendo una vista previa. Verifícate para activar entregas.', "You're seeing a preview. Get verified to enable fulfillment.")}</span>
          </span>
          <button onClick={() => go('billing')} className="flex-none cursor-pointer rounded-btn bg-ink px-3.5 py-2 text-[11.5px] font-extrabold text-white">{L('Verificar', 'Verify')}</button>
        </div>
      )}

      {/* section toggle: Delivery (local) vs Shipping (out of zone) */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button onClick={() => setSec('delivery')} className={secBtn(sec === 'delivery')}>
          <MapPin size={15} strokeWidth={2} />{L('Delivery', 'Delivery')}
        </button>
        <button onClick={() => setSec('shipping')} className={secBtn(sec === 'shipping')}>
          <Truck size={15} strokeWidth={2} />{L('Shipping', 'Shipping')}
        </button>
      </div>

      {/* sub-tabs */}
      <div className="no-scrollbar -mx-1 mb-4 flex items-center gap-2 min-w-0 overflow-x-auto px-1">
        {(sec === 'delivery' ? delSub : shipSub).map(([k, label]) => (
          <button
            key={k}
            onClick={() => (sec === 'delivery' ? setDelTab(k as DelTab) : setShipTab(k as ShipTab))}
            className={chip(sec === 'delivery' ? delTab === k : shipTab === k)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">{content}</div>
        {rail}
      </div>

      <Toast msg={toast} />
    </div>
  );
}
