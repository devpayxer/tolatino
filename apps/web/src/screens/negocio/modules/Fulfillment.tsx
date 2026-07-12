'use client';

// Entregas y envíos (Delivery & Shipping) — SHARED fulfillment module used by
// BOTH the Food menu (local delivery) and Products (delivery + national
// shipping). Two sides:
//   • Delivery (entrega local): a DoorDash/Instacart-style operational DISPATCH
//     board (Despacho) driving orders through new → preparando → listo → asignar
//     repartidor → recogido → en camino (live tracking) → entregado, plus the
//     setup tabs Zonas / Repartidores (propios · apps externas) / Ajustes.
//   • Shipping (envío): a professional shipment QUEUE (Envíos) — empacar → crear
//     etiqueta (transportista + paquete → tracking) → enviado → en tránsito →
//     entregado, plus Recoger / Transportistas / Ajustes.
// Orders come from business_orders (real, RLS owner-updatable) with per-order
// operational state in the `fulfillment` jsonb + a `ship` channel (migration
// 0049); demo mode is fully interactive on sample orders. External couriers /
// carriers are stubs — the real APIs get wired later from the Admin dashboard.
// Setup (zones/drivers/pickup/carriers) persists to businesses.settings.

import { useEffect, useState, type ReactNode } from 'react';
import { Icon as LucideIcon } from '@tabler/icons-react';
import { IconBike as Bike, IconPackages as Boxes, IconCircleCheck as CheckCircle2, IconClock as Clock, IconHelmet as HardHat, IconMapPin as MapPin, IconNavigation as Navigation, IconPackage as Package, IconPackage as PackageCheck, IconRoute as Route, IconBuildingStore as Store, IconTag as Tag, IconTruck as Truck, IconToolsKitchen2 as Utensils, IconBolt as Zap } from '@tabler/icons-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { activeMods } from '@/screens/negocio/tabs';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { uploadImage, AVATAR_MAX_EDGE } from '@/lib/image';
import { ChipRow } from '@/components/ChipRow';
import { Overlay, OverlayTitle } from '@/components/ui';
import { Toast } from '@/screens/negocio/modules/_page';
import { ZoneEditor, DriverEditor, normalizeZone, type Zone, type OwnDriver } from '@/screens/negocio/modules/FulfillmentEditors';

// ---- setup persistence model (businesses.settings jsonb; Zone/OwnDriver types
// live in FulfillmentEditors as the single source) ----
const ZONE_SEED: Zone[] = [
  { color: '#7B61FF', es: 'Zona 1 · Centro', en: 'Zone 1 · Core', toMi: 1.2, time: '30–45 min', fee: 0 },
  { color: '#F0466E', es: 'Zona 2 · Ampliada', en: 'Zone 2 · Greater', toMi: 3, time: '45–60 min', fee: 5 },
  { color: '#F4B740', es: 'Zona 3 · Exterior', en: 'Zone 3 · Outer', toMi: 8, time: '60–90 min', fee: 12 },
];
// The delivery limit the cart enforces = the OUTERMOST zone's radius. Deriving it
// from the zones (rather than a separate field) means the reach the owner sees in
// Zonas is exactly what gates checkout — no hidden setting to forget.
const zonesRadiusMi = (zs: Zone[]): string => {
  const b = zs.map((z) => z.toMi).filter((n): n is number => typeof n === 'number' && n > 0);
  return b.length ? String(Math.max(...b)) : '';
};
const DRIVER_SEED: OwnDriver[] = [
  { initials: 'MP', color: '#7B61FF', dot: '#1F9D57', name: 'Marco P.', sEs: 'En ruta', sEn: 'On delivery', orderEs: '#2487 → Z2', orderEn: '#2487 → Z2', km: '1.8 mi', eta: 'ETA 5 min' },
  { initials: 'DR', color: '#2A5C8A', dot: '#1F9D57', name: 'Diego R.', sEs: 'En ruta', sEn: 'On delivery', orderEs: '#2484 → Z1', orderEn: '#2484 → Z1', km: '0.9 mi', eta: 'ETA 2 min' },
  { initials: 'AV', color: '#E8954A', dot: '#6D4DF6', name: 'Andrea V.', sEs: 'Disponible', sEn: 'Available', orderEs: 'Lista', orderEn: 'Ready next', km: '—', eta: '—' },
  { initials: 'LM', color: '#9A96AE', dot: '#9A96AE', name: 'Lucía M.', sEs: 'Libre hoy', sEn: 'Off today', orderEs: 'Mar–Jue', orderEn: 'Mar–Jue', km: '—', eta: '—' },
];
const EXT_APPS = [
  { label: 'U', color: '#000', name: 'Uber Direct', dEs: 'Conductores bajo demanda cuando los tuyos están ocupados.', dEn: 'On-demand drivers when yours are busy.', rate: '$8.50' },
  { label: 'D', color: '#FF3008', name: 'DoorDash Drive', dEs: 'Respaldo cuando salen de zona.', dEn: 'Standby fallback out of zone.', rate: '$9.00' },
  { label: 'R', color: '#FF441F', name: 'Rappi / Uber Eats', dEs: 'Cobertura extra en horas pico.', dEn: 'Extra coverage at peak hours.', rate: '—' },
];
const CARRIERS = [
  { name: 'USPS Priority', dEs: '2–3 días hábiles', dEn: '2–3 business days', rate: '$8.00' },
  { name: 'UPS Ground', dEs: '3–5 días hábiles', dEn: '3–5 business days', rate: '$10.00' },
  { name: 'FedEx 2-Day', dEs: '2 días hábiles', dEn: '2 business days', rate: '$18.00' },
  { name: 'USPS Ground', dEs: '3–5 días hábiles', dEn: '3–5 business days', rate: '$5.50' },
];
const PICK_DEF = [true, true, true, true];
const CARRIER_DEF = [true, true, true, false];
const EXT_DEF = [true, true, false];
const arrToRec = (a: boolean[]): Record<number, boolean> => { const r: Record<number, boolean> = {}; a.forEach((v, i) => { r[i] = v; }); return r; };
const recToArr = (r: Record<number, boolean>, n: number): boolean[] => Array.from({ length: n }, (_, i) => !!r[i]);

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';

// ---- orders / operational model (business_orders + fulfillment jsonb, 0049) ----
type OrderItem = { name: string; qty: number; price?: number };
type OStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
type Dispatch = 'unassigned' | 'assigned' | 'picked_up' | 'on_the_way' | 'delivered';
type ShipStep = 'to_pack' | 'packed' | 'labeled' | 'shipped' | 'in_transit' | 'delivered';
type Fulfil = {
  address?: string; dispatch?: Dispatch; driver?: string; driver_phone?: string; eta?: string; ship?: ShipStep; carrier?: string; tracking?: string; pkg?: string;
  // paid-checkout receipt (written by the payments webhook — migration 0074)
  address_label?: string; instructions?: string; subtotal?: number; delivery_fee?: number; tip?: number; service_fee?: number; paid_total?: number; eta_range?: string;
};
type OrderRow = { id: string; code: string | null; customer_name: string | null; items: OrderItem[]; total: number | null; channel: string; status: OStatus; created_at: string; fulfillment: Fulfil };

const DEMO_ORDERS: OrderRow[] = [
  { id: 'd1', code: '#2491', customer_name: 'Sofía R.', items: [{ name: 'Tacos al pastor', qty: 3 }, { name: 'Horchata', qty: 1 }], total: 18.5, channel: 'delivery', status: 'new', created_at: '', fulfillment: { address: '2140 Long Point Rd · Z1', dispatch: 'unassigned' } },
  { id: 'd2', code: '#2490', customer_name: 'Juan M.', items: [{ name: 'Quesabirria (3)', qty: 1 }, { name: 'Consomé', qty: 1 }], total: 13, channel: 'delivery', status: 'preparing', created_at: '', fulfillment: { address: '5410 Bellaire Blvd · Z1', dispatch: 'unassigned' } },
  { id: 'd3', code: '#2489', customer_name: 'Ana L.', items: [{ name: 'Torta ahogada', qty: 1 }, { name: 'Jamaica', qty: 2 }], total: 15.5, channel: 'delivery', status: 'ready', created_at: '', fulfillment: { address: '9203 Westheimer Rd · Z2', dispatch: 'unassigned' } },
  { id: 'd4', code: '#2488', customer_name: 'Carlos V.', items: [{ name: 'Gringa', qty: 2 }], total: 14, channel: 'delivery', status: 'ready', created_at: '', fulfillment: { address: '711 Katy Fwy · Z2', dispatch: 'assigned', driver: 'Andrea V.' } },
  { id: 'd5', code: '#2487', customer_name: 'Marco T.', items: [{ name: 'Combo familiar', qty: 1 }], total: 32, channel: 'delivery', status: 'ready', created_at: '', fulfillment: { address: '1200 McKinney St · Z3', dispatch: 'on_the_way', driver: 'Marco P.', eta: '8 min' } },
  { id: 'd6', code: '#2482', customer_name: 'Lucía G.', items: [{ name: 'Tacos de suadero', qty: 4 }], total: 22, channel: 'delivery', status: 'completed', created_at: '', fulfillment: { address: '340 Waugh Dr · Z1', dispatch: 'delivered', driver: 'Diego R.' } },
  { id: 's1', code: '#S-118', customer_name: 'Elena V.', items: [{ name: 'Mermelada 6oz', qty: 3 }, { name: 'Aceite de oliva', qty: 1 }], total: 66, channel: 'ship', status: 'new', created_at: '', fulfillment: { address: 'Austin, TX 78701', ship: 'to_pack' } },
  { id: 's2', code: '#S-117', customer_name: 'Robert K.', items: [{ name: 'Libro de recetas', qty: 1 }], total: 42, channel: 'ship', status: 'preparing', created_at: '', fulfillment: { address: 'Dallas, TX 75201', ship: 'packed' } },
  { id: 's3', code: '#S-115', customer_name: 'María P.', items: [{ name: 'Café en grano 12oz', qty: 2 }], total: 38, channel: 'ship', status: 'ready', created_at: '', fulfillment: { address: 'San Antonio, TX 78205', ship: 'shipped', carrier: 'USPS Priority', tracking: '9400 1000 0000 4521 8890 12', pkg: 'Caja S' } },
  { id: 's4', code: '#S-112', customer_name: 'Diego H.', items: [{ name: 'Tote de lona', qty: 1 }, { name: 'Taza', qty: 2 }], total: 46, channel: 'ship', status: 'completed', created_at: '', fulfillment: { address: 'El Paso, TX 79901', ship: 'delivered', carrier: 'UPS Ground', tracking: '1Z 999 AA1 01 2345 6784', pkg: 'Caja M' } },
];

const PKG_SIZES = ['Sobre', 'Caja S', 'Caja M', 'Caja L'];
// A believable USPS-style tracking number for the label stub (real labels come
// from the carrier API, wired later from the Admin dashboard).
const genTracking = (): string => {
  const g = () => String(Math.floor(1000 + Math.random() * 9000));
  return `9400 1000 0000 ${g()} ${g()} ${String(Math.floor(10 + Math.random() * 89))}`;
};

// =====================================================================
export function FulfillmentModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, isFree, isPremium, ci, go } = ctx;
  const admin = useBizAdmin();
  const { user } = useAuth();
  const real = admin.active;
  const persistable = !admin.demo && !!real;
  const am = activeMods(ctx);

  // Driver/vehicle photo → Supabase Storage (public 'post-photos' bucket, same
  // pipeline as the rest of the panel). Demo/no-auth falls back to a local
  // object URL so the editor still previews.
  const uploadDriverPhoto = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) return null;
    try {
      return !persistable || !user || !supabase ? URL.createObjectURL(file) : await uploadImage(file, user.id, AVATAR_MAX_EDGE);
    } catch {
      flash(L('No se pudo subir la foto.', "Couldn't upload the photo."));
      return null;
    }
  };

  // ── ui state ────────────────────────────────────────────────────────────────
  type Section = 'delivery' | 'shipping';
  type DelTab = 'dispatch' | 'zones' | 'drivers' | 'settings';
  type ShipTab = 'queue' | 'pickup' | 'carriers' | 'settings';
  const [sec, setSec] = useState<Section>('delivery');
  const [delTab, setDelTab] = useState<DelTab>(tab === 'drivers' ? 'drivers' : tab === 'shipping' ? 'zones' : 'dispatch');
  const [shipTab, setShipTab] = useState<ShipTab>('queue');
  const [driverTab, setDriverTab] = useState<'own' | 'external'>('own');
  const [natTab, setNatTab] = useState<'own' | 'external'>('external');
  const [delFilter, setDelFilter] = useState<'all' | 'new' | 'preparing' | 'ready' | 'en_route' | 'delivered'>('all');
  const [shipFilter, setShipFilter] = useState<'all' | 'to_pack' | 'labeled' | 'shipped' | 'in_transit' | 'delivered'>('all');
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };

  // ── setup config (zones / drivers / pickup / carriers / external) ───────────
  const [zones, setZones] = useState<Zone[]>(ZONE_SEED);
  const [drivers, setDrivers] = useState<OwnDriver[]>(DRIVER_SEED);
  const [pickState, setPickState] = useState<Record<number, boolean>>(arrToRec(PICK_DEF));
  const [carrierState, setCarrierState] = useState<Record<number, boolean>>(arrToRec(CARRIER_DEF));
  const [extState, setExtState] = useState<Record<number, boolean>>(arrToRec(EXT_DEF));
  // Delivery limit is DERIVED from the zones (zonesRadiusMi → outermost zone) and
  // mirrored into settings.delivery_ops.radiusMi on save, so the PostGIS gate
  // (delivery_range_check, 0076) enforces exactly the reach shown in Zonas.
  const [delOps, setDelOps] = useState({ minOrder: '15', prepTime: '20', autoAssign: false, liveTracking: true });
  const [shipOps, setShipOps] = useState({ freeOver: '75', origin: '', pkg: 'Caja S', handling: '0' });

  useEffect(() => {
    const s = (real?.settings ?? {}) as Record<string, unknown>;
    const ship = (s.shipping ?? {}) as { delivery?: { zones?: Zone[] }; pickup?: { rules?: boolean[] }; national?: { carriers?: boolean[] }; external?: boolean[] };
    // Real businesses start EMPTY (add their own zones/drivers); only demo mode
    // shows the sample setup — a real panel never renders invented people.
    // normalizeZone coerces any stored shape (incl. the old free-text rad/feeEs)
    // into the numeric toMi/fee model so pre-existing businesses keep working.
    setZones(Array.isArray(ship.delivery?.zones) && ship.delivery!.zones!.length ? ship.delivery!.zones!.map(normalizeZone) : admin.demo ? ZONE_SEED : []);
    setDrivers(Array.isArray(s.drivers) && (s.drivers as OwnDriver[]).length ? (s.drivers as OwnDriver[]) : admin.demo ? DRIVER_SEED : []);
    setPickState(arrToRec(Array.isArray(ship.pickup?.rules) ? ship.pickup!.rules! : PICK_DEF));
    setCarrierState(arrToRec(Array.isArray(ship.national?.carriers) ? ship.national!.carriers! : CARRIER_DEF));
    setExtState(arrToRec(Array.isArray(ship.external) ? ship.external! : EXT_DEF));
    const dOps = s.delivery_ops as typeof delOps | undefined;
    const sOps = s.shipping_ops as typeof shipOps | undefined;
    if (dOps) setDelOps((o) => ({ ...o, ...dOps }));
    setShipOps((o) => ({ ...o, origin: real?.address ?? o.origin, ...(sOps ?? {}) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  const buildShipping = (o: { zones?: Zone[]; pick?: Record<number, boolean>; carrier?: Record<number, boolean>; ext?: Record<number, boolean> }) => {
    const z = o.zones ?? zones;
    return {
      delivery: { on: z.length > 0, radius: zonesRadiusMi(z), fee: z[0] ? String(z[0].fee) : '', zones: z },
      pickup: { on: recToArr(o.pick ?? pickState, 4).some(Boolean), rules: recToArr(o.pick ?? pickState, 4) },
      national: { on: recToArr(o.carrier ?? carrierState, 4).some(Boolean), carriers: recToArr(o.carrier ?? carrierState, 4) },
      external: recToArr(o.ext ?? extState, 3),
    };
  };
  const persistSettings = (extra: Record<string, unknown> = {}, o: { zones?: Zone[]; pick?: Record<number, boolean>; carrier?: Record<number, boolean>; ext?: Record<number, boolean>; drivers?: OwnDriver[] } = {}) => {
    if (!persistable || !real) return;
    // radiusMi is the derived mirror of the outermost zone (see zonesRadiusMi) —
    // written on every save so the checkout gate can't drift from the zones.
    const radiusMi = zonesRadiusMi(o.zones ?? zones);
    admin.update({ settings: { ...(real.settings ?? {}), shipping: buildShipping(o), drivers: o.drivers ?? drivers, delivery_ops: { ...delOps, radiusMi }, shipping_ops: shipOps, ...extra } });
  };
  // ── zone + driver editor sheets (full CRUD, persisted to businesses.settings) ─
  const [zoneSheet, setZoneSheet] = useState<{ idx: number; initial: Zone | null } | null>(null);
  const [driverSheet, setDriverSheet] = useState<{ idx: number; initial: OwnDriver | null } | null>(null);
  const upsertZone = (z: Zone) => {
    if (!zoneSheet) return;
    const next = zoneSheet.idx < 0 ? [...zones, z] : zones.map((v, i) => (i === zoneSheet.idx ? z : v));
    setZones(next); persistSettings({}, { zones: next });
    flash(zoneSheet.idx < 0 ? L('Zona creada', 'Zone created') : L('Zona actualizada', 'Zone updated'));
  };
  const deleteZone = () => {
    if (!zoneSheet || zoneSheet.idx < 0) return;
    const next = zones.filter((_, i) => i !== zoneSheet.idx);
    setZones(next); persistSettings({}, { zones: next }); flash(L('Zona eliminada', 'Zone deleted'));
  };
  const upsertDriver = (d: OwnDriver) => {
    if (!driverSheet) return;
    const next = driverSheet.idx < 0 ? [...drivers, d] : drivers.map((v, i) => (i === driverSheet.idx ? d : v));
    setDrivers(next); persistSettings({}, { drivers: next });
    flash(driverSheet.idx < 0 ? L('Repartidor agregado', 'Driver added') : L('Repartidor actualizado', 'Driver updated'));
  };
  const deleteDriver = () => {
    if (!driverSheet || driverSheet.idx < 0) return;
    const next = drivers.filter((_, i) => i !== driverSheet.idx);
    setDrivers(next); persistSettings({}, { drivers: next }); flash(L('Repartidor eliminado', 'Driver removed'));
  };

  // ── orders (business_orders) ────────────────────────────────────────────────
  const [orders, setOrders] = useState<OrderRow[]>(DEMO_ORDERS);
  const reloadOrders = () => {
    if (!persistable || !real || !supabase) { setOrders(DEMO_ORDERS); return; }
    // select('*') so a missing `fulfillment` column (pre-0049) never errors.
    supabase.from('business_orders').select('*').eq('business_id', real.id).order('created_at', { ascending: false }).limit(120)
      .then(({ data, error }) => {
        if (error || !Array.isArray(data)) { setOrders([]); return; }
        setOrders((data as Record<string, unknown>[]).map((r): OrderRow => ({
          id: String(r.id), code: (r.code as string) ?? null, customer_name: (r.customer_name as string) ?? null,
          items: Array.isArray(r.items) ? (r.items as OrderItem[]) : [], total: r.total != null ? Number(r.total) : null,
          channel: String(r.channel ?? 'pickup'), status: (r.status as OStatus) ?? 'new', created_at: String(r.created_at ?? ''),
          fulfillment: (r.fulfillment as Fulfil) ?? {},
        })));
      });
  };
  useEffect(() => { reloadOrders(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [real?.id, admin.demo]);

  const patchOrder = (id: string, patch: Partial<OrderRow>) => setOrders((l) => l.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const setStatus = (o: OrderRow, status: OStatus) => { patchOrder(o.id, { status }); if (persistable && supabase) supabase.from('business_orders').update({ status }).eq('id', o.id).then(() => {}); };
  const setFulfil = (o: OrderRow, patch: Partial<Fulfil>) => {
    const f = { ...o.fulfillment, ...patch };
    patchOrder(o.id, { fulfillment: f });
    // best-effort — the `fulfillment` column exists after migration 0049; before
    // that the write is silently ignored and local state still drives the board.
    if (persistable && supabase) supabase.from('business_orders').update({ fulfillment: f }).eq('id', o.id).then(() => {});
  };

  const deliveryOrders = orders.filter((o) => o.channel === 'delivery');
  const shipOrders = orders.filter((o) => o.channel === 'ship');

  // ---- delivery pipeline ----
  const delStage = (o: OrderRow): 'new' | 'preparing' | 'ready' | 'en_route' | 'delivered' | 'cancelled' => {
    if (o.status === 'cancelled') return 'cancelled';
    if (o.status === 'completed' || o.fulfillment.dispatch === 'delivered') return 'delivered';
    if (o.status === 'new') return 'new';
    if (o.status === 'preparing') return 'preparing';
    const d = o.fulfillment.dispatch ?? 'unassigned';
    return d === 'picked_up' || d === 'on_the_way' ? 'en_route' : 'ready';
  };
  const [assignFor, setAssignFor] = useState<OrderRow | null>(null);
  const delAdvance = (o: OrderRow) => {
    if (o.status === 'new') return setStatus(o, 'preparing');
    if (o.status === 'preparing') return setStatus(o, 'ready');
    const d = o.fulfillment.dispatch ?? 'unassigned';
    if (d === 'unassigned') return setAssignFor(o);
    if (d === 'assigned') return setFulfil(o, { dispatch: 'picked_up' });
    if (d === 'picked_up') return setFulfil(o, { dispatch: 'on_the_way', eta: '10 min' });
    setFulfil(o, { dispatch: 'delivered' }); setStatus(o, 'completed'); flash(L('Entrega completada', 'Delivery completed'));
  };
  const delAdvLabel = (o: OrderRow): string => {
    if (o.status === 'new') return L('Aceptar', 'Accept');
    if (o.status === 'preparing') return L('Marcar listo', 'Mark ready');
    const d = o.fulfillment.dispatch ?? 'unassigned';
    return d === 'unassigned' ? L('Asignar repartidor', 'Assign driver') : d === 'assigned' ? L('Marcar recogido', 'Picked up') : d === 'picked_up' ? L('En camino', 'On the way') : L('Entregado', 'Delivered');
  };
  const assignDriver = (name: string, phone?: string) => {
    if (assignFor) {
      // the driver's phone rides along so the CLIENT can call them from tracking
      setFulfil(assignFor, { dispatch: 'assigned', driver: name, ...(phone ? { driver_phone: phone } : {}) });
      flash(L(`Asignado a ${name}`, `Assigned to ${name}`));
    }
    setAssignFor(null);
  };

  // ---- shipping pipeline ----
  const shipStage = (o: OrderRow): 'to_pack' | 'labeled' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled' => {
    if (o.status === 'cancelled') return 'cancelled';
    const s = o.fulfillment.ship;
    if (o.status === 'completed' || s === 'delivered') return 'delivered';
    if (s === 'in_transit') return 'in_transit';
    if (s === 'shipped') return 'shipped';
    if (s === 'labeled') return 'labeled';
    return 'to_pack';
  };
  const [labelFor, setLabelFor] = useState<OrderRow | null>(null);
  const [labelCarrier, setLabelCarrier] = useState(CARRIERS[0].name);
  const [labelPkg, setLabelPkg] = useState('Caja S');
  const shipAdvance = (o: OrderRow) => {
    const s = o.fulfillment.ship ?? 'to_pack';
    if (s === 'to_pack') { setFulfil(o, { ship: 'packed' }); setStatus(o, 'preparing'); return; }
    if (s === 'packed') { setLabelCarrier(o.fulfillment.carrier ?? CARRIERS[0].name); setLabelPkg(o.fulfillment.pkg ?? 'Caja S'); setLabelFor(o); return; }
    if (s === 'labeled') return setFulfil(o, { ship: 'shipped' });
    if (s === 'shipped') return setFulfil(o, { ship: 'in_transit' });
    setFulfil(o, { ship: 'delivered' }); setStatus(o, 'completed'); flash(L('Envío entregado', 'Shipment delivered'));
  };
  const shipAdvLabel = (o: OrderRow): string => {
    const s = o.fulfillment.ship ?? 'to_pack';
    return s === 'to_pack' ? L('Empacar', 'Pack') : s === 'packed' ? L('Crear etiqueta', 'Create label') : s === 'labeled' ? L('Marcar enviado', 'Mark shipped') : s === 'shipped' ? L('En tránsito', 'In transit') : L('Entregado', 'Delivered');
  };
  const createLabel = () => {
    if (labelFor) { setFulfil(labelFor, { ship: 'labeled', carrier: labelCarrier, pkg: labelPkg, tracking: genTracking() }); setStatus(labelFor, 'ready'); flash(L('Etiqueta creada', 'Label created')); }
    setLabelFor(null);
  };

  // ---------- shared styles ----------
  const dashBtn = 'w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-line bg-lilac-3 px-3 py-3.5 text-[12.5px] font-extrabold text-primary-dark';
  const chip = (on: boolean) => `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12.5px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;
  const fchip = (on: boolean) => `flex-none cursor-pointer rounded-lg px-2.5 py-1.5 text-[10.5px] font-extrabold ${on ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`;
  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} aria-pressed={on} className={`relative h-[26px] w-[46px] flex-none cursor-pointer rounded-full transition-colors ${on ? 'bg-primary' : 'bg-lilac-line'}`}>
      <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-all ${on ? 'left-[23px]' : 'left-[3px]'}`} />
    </button>
  );
  const initials = (name: string | null) => (name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const money = (n: number | null) => '$' + Number(n ?? 0).toFixed(2);
  const itemsLabel = (its: OrderItem[]) => its.map((i) => `${i.qty}× ${i.name}`).join(' · ');

  // ============================ DELIVERY · DISPATCH ============================
  const DEL_BADGE: Record<string, { es: string; en: string; cls: string }> = {
    new: { es: 'Nuevo', en: 'New', cls: 'bg-pink-bg text-pink-dark' },
    preparing: { es: 'Preparando', en: 'Preparing', cls: 'bg-amber-bg text-amber-ink' },
    ready: { es: 'Listo', en: 'Ready', cls: 'bg-lilac-2 text-primary-dark' },
    en_route: { es: 'En camino', en: 'On the way', cls: 'bg-green-bg text-green-dark' },
    delivered: { es: 'Entregado', en: 'Delivered', cls: 'bg-lilac-2 text-ink-2' },
    cancelled: { es: 'Cancelado', en: 'Cancelled', cls: 'bg-lilac-2 text-muted-2' },
  };
  const delKpis: { Icon: LucideIcon; c: string; bg: string; label: string; value: string }[] = [
    { Icon: Zap, c: '#D6336C', bg: '#FDE7EF', label: L('Nuevos', 'New'), value: String(deliveryOrders.filter((o) => o.status === 'new').length) },
    { Icon: Clock, c: '#9A6A12', bg: '#FCEFD6', label: L('Preparando', 'Preparing'), value: String(deliveryOrders.filter((o) => o.status === 'preparing').length) },
    { Icon: Bike, c: '#1F8A4C', bg: '#E3F5EA', label: L('En camino', 'On the way'), value: String(deliveryOrders.filter((o) => delStage(o) === 'en_route').length) },
    { Icon: CheckCircle2, c: '#6D4DF6', bg: '#EFEBFF', label: L('Entregados', 'Delivered'), value: String(deliveryOrders.filter((o) => delStage(o) === 'delivered').length) },
  ];
  const delList = deliveryOrders.filter((o) => delFilter === 'all' || delStage(o) === delFilter);

  const dispatchView = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {delKpis.map((k) => (
          <div key={k.label} className={`${cardCls} p-3`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: k.bg }}><k.Icon size={16} strokeWidth={2.2} style={{ color: k.c }} /></span>
            <div className="mt-2 text-[10px] font-semibold text-muted-2">{k.label}</div>
            <div className="mt-0.5 text-[19px] font-extrabold text-ink">{k.value}</div>
          </div>
        ))}
      </div>
      <ChipRow className="-mx-1 px-1">
        {([['all', L('Todos', 'All')], ['new', L('Nuevos', 'New')], ['preparing', L('Preparando', 'Preparing')], ['ready', L('Listos', 'Ready')], ['en_route', L('En camino', 'On the way')], ['delivered', L('Entregados', 'Delivered')]] as [typeof delFilter, string][]).map(([k, lbl]) => (
          <button key={k} onClick={() => setDelFilter(k)} className={fchip(delFilter === k)}>{lbl}</button>
        ))}
      </ChipRow>
      {delList.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{orders === DEMO_ORDERS ? L('Pedidos de ejemplo — los reales de tus clientes aparecerán aquí.', 'Sample orders — your real customer orders appear here.') : L('Sin pedidos de entrega en este filtro.', 'No delivery orders in this filter.')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {delList.map((o) => {
            const st = delStage(o); const bd = DEL_BADGE[st];
            const onWay = o.fulfillment.dispatch === 'on_the_way';
            const done = st === 'delivered' || st === 'cancelled';
            return (
              <div key={o.id} className={`${cardCls} p-3.5`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn-lg bg-lilac-2 text-[12px] font-extrabold text-primary-dark">{initials(o.customer_name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-ink">{o.customer_name || L('Cliente', 'Customer')}</span><span className="flex-none text-[10.5px] font-bold text-muted-2">{o.code}</span></div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-ink-3"><MapPin size={11} stroke={2.4} className="flex-none text-muted-2" /><span className="truncate">{o.fulfillment.address || L('Sin dirección', 'No address')}</span></div>
                    <div className="mt-0.5 truncate text-[10.5px] font-medium text-muted-2">{itemsLabel(o.items)}</div>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1">
                    <span className={`rounded-md px-2 py-1 text-[9px] font-extrabold ${bd.cls}`}>{L(bd.es, bd.en)}</span>
                    <span className="text-[13px] font-extrabold text-ink">{money(o.total)}</span>
                    {!!o.fulfillment.tip && <span className="rounded-full bg-green-bg px-1.5 py-0.5 text-[9px] font-extrabold text-green-dark">{L('Propina', 'Tip')} {money(o.fulfillment.tip)}</span>}
                  </div>
                </div>
                {o.fulfillment.instructions && (
                  <div className="mt-2 rounded-field bg-amber-bg px-2.5 py-1.5 text-[10.5px] font-semibold text-amber-ink">
                    📝 {o.fulfillment.instructions}
                  </div>
                )}

                {o.fulfillment.driver && (
                  <div className="mt-2.5 flex items-center gap-2 rounded-field bg-lilac-2 px-2.5 py-1.5">
                    <HardHat size={13} stroke={2.2} className="flex-none text-primary-dark" />
                    <span className="min-w-0 flex-1 truncate text-[10.5px] font-extrabold text-ink-2">{o.fulfillment.driver}</span>
                    {o.fulfillment.eta && <span className="flex-none text-[10px] font-bold text-green-dark">ETA {o.fulfillment.eta}</span>}
                  </div>
                )}

                {/* live-tracking mini map for on-the-way orders */}
                {onWay && (
                  <div className="relative mt-2.5 h-[68px] overflow-hidden rounded-field border border-hair" style={{ background: '#EAEEF6' }}>
                    <div className="absolute left-[-10px] top-[26px] h-[6px] w-[150%] bg-white" style={{ transform: 'rotate(-8deg)' }} />
                    <div className="absolute left-[38%] top-[-10px] h-[150%] w-[6px] bg-white" style={{ transform: 'rotate(9deg)' }} />
                    <span className="absolute left-[18%] top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-card"><Bike size={12} stroke={2.4} /></span>
                    <span className="absolute right-[16%] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-green shadow-card" />
                    <span className="absolute bottom-1.5 right-2 rounded-md bg-white/90 px-2 py-0.5 text-[9px] font-extrabold text-ink shadow-card"><Navigation size={9} stroke={2.6} className="mr-0.5 inline" />{o.fulfillment.eta ? `ETA ${o.fulfillment.eta}` : L('En ruta', 'En route')}</span>
                  </div>
                )}

                {!done && (
                  <div className="mt-2.5 flex items-center gap-2 border-t border-dashed border-hair pt-2.5">
                    <button onClick={() => delAdvance(o)} className="flex-1 cursor-pointer rounded-btn bg-primary py-2 text-[11.5px] font-extrabold text-white shadow-cta-sm">{delAdvLabel(o)}</button>
                    {(o.status === 'new' || o.status === 'preparing') && <button onClick={() => { setStatus(o, 'cancelled'); flash(L('Pedido cancelado', 'Order cancelled')); }} className="flex-none cursor-pointer rounded-btn border-[1.5px] border-pink-bg bg-white px-3 py-2 text-[11px] font-extrabold text-pink-dark">{L('Cancelar', 'Cancel')}</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============================ DELIVERY · ZONES ============================
  const zonesView = (
    <div className="flex flex-col gap-3.5 md:grid md:grid-cols-2 md:items-start md:gap-4 xl:grid-cols-1 2xl:grid-cols-2">
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
        {zones.map((z, zi) => {
          const from = zi > 0 ? zones[zi - 1].toMi : 0;
          const dist = z.toMi != null ? (from ? `${from}–${z.toMi} mi` : `${L('Hasta', 'Up to')} ${z.toMi} mi`) : L('Sin límite', 'No limit');
          const feeLbl = z.fee > 0 ? `$${z.fee.toFixed(2)}` : L('Gratis', 'Free');
          return (
            <button key={zi} onClick={() => setZoneSheet({ idx: zi, initial: z })} className="flex w-full cursor-pointer items-center gap-3 rounded-card-sm border border-hair bg-white p-3 text-left hover:border-primary">
              <span className="h-3 w-3 flex-none rounded-full" style={{ background: z.color }} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-extrabold text-ink">{L(z.es, z.en)}</div>
                <div className="mt-0.5 text-[10px] font-medium text-muted-2">{dist}{z.time && z.time !== '—' ? ` · ETA ${z.time}` : ''}</div>
              </div>
              <span className={`flex-none text-[13px] font-extrabold ${z.fee > 0 ? 'text-ink' : 'text-green-dark'}`}>{feeLbl}</span>
              <span className="flex-none text-[13px] font-extrabold text-muted-2">›</span>
            </button>
          );
        })}
        <div className="flex items-center gap-3 rounded-card-sm bg-lilac-2 p-3">
          <Truck size={16} stroke={2} className="flex-none text-primary-dark" />
          <div>
            <div className="text-[11.5px] font-extrabold text-ink">{L('Fuera de zona → envío', 'Out of zone → shipping')}</div>
            <div className="mt-0.5 text-[10px] font-medium leading-snug text-ink-3">{L('Más allá de la última zona se ofrece envío o recoger.', 'Beyond the last zone we offer shipping or pickup.')}</div>
          </div>
        </div>
        <button onClick={() => setZoneSheet({ idx: -1, initial: null })} className={dashBtn}>+ {L('Nueva zona', 'New zone')}</button>
      </div>
    </div>
  );

  // ============================ DELIVERY · DRIVERS ============================
  const driversView = (
    <div className="flex flex-col gap-3.5">
      <div className="flex gap-1.5 rounded-btn border border-hair bg-white p-1">
        {(['own', 'external'] as const).map((d) => (
          <button key={d} onClick={() => setDriverTab(d)} className={`flex-1 cursor-pointer rounded-[9px] py-2 text-[11.5px] font-extrabold ${driverTab === d ? 'bg-primary text-white' : 'text-ink-2'}`}>{d === 'own' ? L('Propios', 'Own') : L('Apps externas', 'External apps')}</button>
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
          {drivers.map((d, di) => (
            <button key={d.name + di} onClick={() => setDriverSheet({ idx: di, initial: d })} className="flex w-full cursor-pointer items-center gap-3 rounded-card-sm border border-hair bg-white p-3 text-left hover:border-primary">
              <span className="relative flex-none">
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-[12px] font-extrabold text-white" style={{ background: d.photo ? '#EAE7F6' : d.color }}>
                  {d.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.photo} alt="" className="h-full w-full object-cover" />
                  ) : d.initials}
                </span>
                <span className="absolute -bottom-px -right-px h-3 w-3 rounded-full border-2 border-white" style={{ background: d.dot }} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-extrabold text-ink">{d.name}</div>
                <div className="mt-0.5 truncate text-[10px] font-medium text-muted-2">{L(d.sEs, d.sEn)} · {d.phone ? d.phone : L(d.orderEs, d.orderEn)}</div>
                {d.vehicle && <div className="mt-0.5 truncate text-[10px] font-semibold text-primary-dark">{d.vehicle}</div>}
              </div>
              {d.km && d.km !== '—' ? (
                <div className="flex-none text-right"><div className="text-[11.5px] font-extrabold text-ink">{d.km}</div><div className="text-[9.5px] font-semibold text-muted-2">{d.eta}</div></div>
              ) : (
                <span className="flex-none text-[13px] font-extrabold text-muted-2">›</span>
              )}
            </button>
          ))}
          <button onClick={() => setDriverSheet({ idx: -1, initial: null })} className={dashBtn}>+ {L('Agregar repartidor', 'Add driver')}</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {EXT_APPS.map((a, i) => {
            const on = extState[i];
            return (
              <div key={a.name} className="rounded-card-sm border border-hair bg-white p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn text-[15px] font-extrabold text-white" style={{ background: a.color }}>{a.label}</span>
                  <div className="min-w-0 flex-1"><div className="text-[12.5px] font-extrabold text-ink">{a.name}</div><div className="mt-0.5 text-[10px] font-medium leading-snug text-muted-2">{L(a.dEs, a.dEn)}</div></div>
                  <Toggle on={on} onClick={() => { const next = { ...extState, [i]: !on }; setExtState(next); persistSettings({}, { ext: next }); }} />
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-hair pt-2.5">
                  <span className="text-[10px] font-semibold text-muted-2">{a.rate} {L('prom', 'avg')}</span>
                  <span className="text-[10.5px] font-extrabold text-primary-dark">{on ? L('Gestionar', 'Manage') : L('Conectar', 'Connect')} ›</span>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2 rounded-field bg-lilac-2 px-3 py-2 text-[10.5px] font-semibold text-ink-3">
            <span className="rounded bg-ink px-1.5 py-0.5 text-[8px] font-extrabold text-white">API</span>
            {L('Conecta el despacho automático a estas apps desde el panel de Admin cuando lances entregas reales.', 'Connect auto-dispatch to these apps from the Admin panel when you launch real deliveries.')}
          </div>
        </div>
      )}
    </div>
  );

  // ============================ DELIVERY · SETTINGS ============================
  const settingRow = (title: string, sub: string, right: ReactNode, last = false) => (
    <div className={`flex items-center gap-3 py-3 ${last ? '' : 'border-b border-hair'}`}>
      <div className="min-w-0 flex-1"><div className="text-[12px] font-bold text-ink">{title}</div><div className="mt-0.5 text-[10px] font-medium leading-snug text-muted-2">{sub}</div></div>
      {right}
    </div>
  );
  // Money fields ($ prefix) reformat to X.00 on blur so amounts read professionally.
  const numBox = (val: string, onChange: (v: string) => void, prefix?: string, suffix?: string) => (
    <div className="flex w-[110px] flex-none items-center rounded-field border-[1.5px] border-lilac-line bg-white px-2.5 focus-within:border-primary">
      {prefix && <span className="text-[12px] font-bold text-muted-2">{prefix}</span>}
      <input value={val} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))} onBlur={prefix === '$' ? () => onChange(val.trim() === '' ? '' : (Number(val) || 0).toFixed(2)) : undefined} inputMode="decimal" className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[13px] font-semibold text-ink outline-none" />
      {suffix && <span className="text-[11px] font-bold text-muted-2">{suffix}</span>}
    </div>
  );
  const reachMi = zonesRadiusMi(zones);
  const delSettingsView = (
    <div className="mx-auto max-w-[560px]">
      <div className={`${cardCls} px-3.5`}>
        {settingRow(L('Pedido mínimo', 'Minimum order'), L('Monto mínimo para entrega a domicilio.', 'Minimum for home delivery.'), numBox(delOps.minOrder, (v) => setDelOps((o) => ({ ...o, minOrder: v })), '$'))}
        {settingRow(
          L('Alcance de entrega', 'Delivery reach'),
          L('Lo define tu zona más lejana (pestaña Zonas). Fuera de este radio, el cliente no puede pedir a domicilio.', 'Set by your farthest zone (Zones tab). Beyond this radius, customers can’t order delivery.'),
          <button onClick={() => setDelTab('zones')} className="flex flex-none items-center gap-1.5 rounded-field bg-lilac-2 px-3 py-2 text-[12.5px] font-extrabold text-primary-dark">
            {zones.length === 0 ? L('Sin zonas', 'No zones') : reachMi ? `${L('Hasta', 'Up to')} ${reachMi} mi` : L('Sin límite', 'No limit')}
            <span className="text-[11px] text-muted-2">›</span>
          </button>,
        )}
        {settingRow(L('Tiempo de preparación', 'Prep time'), L('Minutos antes de que esté listo para el repartidor.', 'Minutes before ready for the driver.'), numBox(delOps.prepTime, (v) => setDelOps((o) => ({ ...o, prepTime: v })), undefined, 'min'))}
        {settingRow(L('Auto-asignar repartidor', 'Auto-assign driver'), L('Asigna el repartidor libre más cercano al marcar listo.', 'Assign the nearest free driver when marked ready.'), <Toggle on={delOps.autoAssign} onClick={() => setDelOps((o) => ({ ...o, autoAssign: !o.autoAssign }))} />)}
        {settingRow(L('Seguimiento en vivo', 'Live tracking'), L('Muestra al cliente el repartidor en el mapa.', 'Show the customer the driver on the map.'), <Toggle on={delOps.liveTracking} onClick={() => setDelOps((o) => ({ ...o, liveTracking: !o.liveTracking }))} />, true)}
      </div>
      <button onClick={() => { persistSettings(); flash(L('Ajustes guardados', 'Settings saved')); }} className="mt-3.5 w-full cursor-pointer rounded-btn-lg bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm">{L('Guardar ajustes', 'Save settings')}</button>
    </div>
  );

  // ============================ SHIPPING · QUEUE ============================
  const SHIP_BADGE: Record<string, { es: string; en: string; cls: string }> = {
    to_pack: { es: 'Por empacar', en: 'To pack', cls: 'bg-pink-bg text-pink-dark' },
    labeled: { es: 'Etiqueta lista', en: 'Labeled', cls: 'bg-amber-bg text-amber-ink' },
    shipped: { es: 'Enviado', en: 'Shipped', cls: 'bg-lilac-2 text-primary-dark' },
    in_transit: { es: 'En tránsito', en: 'In transit', cls: 'bg-blue-bg text-blue' },
    delivered: { es: 'Entregado', en: 'Delivered', cls: 'bg-green-bg text-green-dark' },
    cancelled: { es: 'Cancelado', en: 'Cancelled', cls: 'bg-lilac-2 text-muted-2' },
  };
  const shipKpis: { Icon: LucideIcon; c: string; bg: string; label: string; value: string }[] = [
    { Icon: Package, c: '#D6336C', bg: '#FDE7EF', label: L('Por enviar', 'To ship'), value: String(shipOrders.filter((o) => shipStage(o) === 'to_pack' || shipStage(o) === 'labeled').length) },
    { Icon: Tag, c: '#9A6A12', bg: '#FCEFD6', label: L('Etiquetas', 'Labels'), value: String(shipOrders.filter((o) => shipStage(o) === 'labeled').length) },
    { Icon: Truck, c: '#2A5C8A', bg: '#E4ECFB', label: L('En tránsito', 'In transit'), value: String(shipOrders.filter((o) => shipStage(o) === 'shipped' || shipStage(o) === 'in_transit').length) },
    { Icon: PackageCheck, c: '#1F8A4C', bg: '#E3F5EA', label: L('Entregados', 'Delivered'), value: String(shipOrders.filter((o) => shipStage(o) === 'delivered').length) },
  ];
  const shipList = shipOrders.filter((o) => shipFilter === 'all' || shipStage(o) === shipFilter);

  const queueView = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {shipKpis.map((k) => (
          <div key={k.label} className={`${cardCls} p-3`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: k.bg }}><k.Icon size={16} strokeWidth={2.2} style={{ color: k.c }} /></span>
            <div className="mt-2 text-[10px] font-semibold text-muted-2">{k.label}</div>
            <div className="mt-0.5 text-[19px] font-extrabold text-ink">{k.value}</div>
          </div>
        ))}
      </div>
      <ChipRow className="-mx-1 px-1">
        {([['all', L('Todos', 'All')], ['to_pack', L('Por empacar', 'To pack')], ['labeled', L('Etiquetas', 'Labels')], ['shipped', L('Enviados', 'Shipped')], ['in_transit', L('En tránsito', 'In transit')], ['delivered', L('Entregados', 'Delivered')]] as [typeof shipFilter, string][]).map(([k, lbl]) => (
          <button key={k} onClick={() => setShipFilter(k)} className={fchip(shipFilter === k)}>{lbl}</button>
        ))}
      </ChipRow>
      {shipList.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{orders === DEMO_ORDERS ? L('Envíos de ejemplo — los pedidos con envío aparecerán aquí.', 'Sample shipments — orders needing shipping appear here.') : L('Sin envíos en este filtro.', 'No shipments in this filter.')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {shipList.map((o) => {
            const st = shipStage(o); const bd = SHIP_BADGE[st];
            const done = st === 'delivered' || st === 'cancelled';
            return (
              <div key={o.id} className={`${cardCls} p-3.5`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn-lg bg-lilac-2 text-primary-dark"><Package size={17} stroke={2} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-ink">{o.customer_name || L('Cliente', 'Customer')}</span><span className="flex-none text-[10.5px] font-bold text-muted-2">{o.code}</span></div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-ink-3"><MapPin size={11} stroke={2.4} className="flex-none text-muted-2" /><span className="truncate">{o.fulfillment.address || L('Sin dirección', 'No address')}</span></div>
                    <div className="mt-0.5 truncate text-[10.5px] font-medium text-muted-2">{itemsLabel(o.items)}{o.fulfillment.pkg ? ` · ${o.fulfillment.pkg}` : ''}</div>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1"><span className={`rounded-md px-2 py-1 text-[9px] font-extrabold ${bd.cls}`}>{L(bd.es, bd.en)}</span><span className="text-[13px] font-extrabold text-ink">{money(o.total)}</span></div>
                </div>
                {o.fulfillment.tracking && (
                  <div className="mt-2.5 flex items-center gap-2 rounded-field bg-lilac-2 px-2.5 py-1.5">
                    <Truck size={13} stroke={2.2} className="flex-none text-primary-dark" />
                    <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-ink-2">{o.fulfillment.carrier} · {o.fulfillment.tracking}</span>
                  </div>
                )}
                {!done && (
                  <div className="mt-2.5 flex items-center gap-2 border-t border-dashed border-hair pt-2.5">
                    <button onClick={() => shipAdvance(o)} className="flex-1 cursor-pointer rounded-btn bg-primary py-2 text-[11.5px] font-extrabold text-white shadow-cta-sm">{shipAdvLabel(o)}</button>
                    {(st === 'to_pack') && <button onClick={() => { setStatus(o, 'cancelled'); flash(L('Envío cancelado', 'Shipment cancelled')); }} className="flex-none cursor-pointer rounded-btn border-[1.5px] border-pink-bg bg-white px-3 py-2 text-[11px] font-extrabold text-pink-dark">{L('Cancelar', 'Cancel')}</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============================ SHIPPING · PICKUP ============================
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
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac text-primary-dark"><Store size={17} stroke={2} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5"><span className="text-[12.5px] font-extrabold text-ink">{p.name}</span>{p.main && <span className="rounded bg-green-bg px-1.5 py-px text-[8px] font-extrabold text-green-dark">{L('Principal', 'Primary')}</span>}</div>
                <div className="mt-0.5 text-[10px] font-medium text-muted-2">{p.hours} · {p.window}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 px-0.5 text-[12px] font-extrabold text-ink">{L('Ajustes de recogida', 'Pickup settings')}</div>
        <div className={`${cardCls} px-3.5`}>
          {pickRules.map((r, i) => (
            <div key={r[0]} className={`flex items-center gap-3 py-3 ${i < pickRules.length - 1 ? 'border-b border-hair' : ''}`}>
              <div className="min-w-0 flex-1"><div className="text-[12px] font-bold text-ink">{r[0]}</div><div className="mt-0.5 text-[10px] font-medium text-muted-2">{r[1]}</div></div>
              <Toggle on={pickState[i]} onClick={() => { const next = { ...pickState, [i]: !pickState[i] }; setPickState(next); persistSettings({}, { pick: next }); }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================ SHIPPING · CARRIERS ============================
  const carriersView = (
    <div className="flex flex-col gap-3.5">
      <div className="flex gap-1.5 rounded-btn border border-hair bg-white p-1">
        {(['own', 'external'] as const).map((n) => (
          <button key={n} onClick={() => setNatTab(n)} className={`flex-1 cursor-pointer rounded-[9px] py-2 text-[11.5px] font-extrabold ${natTab === n ? 'bg-primary text-white' : 'text-ink-2'}`}>{n === 'own' ? L('Tarifa propia', 'Own rate') : L('Transportistas', 'Carriers')}</button>
        ))}
      </div>
      {natTab === 'own' ? (
        <>
          <div className="px-0.5 text-[12px] font-extrabold text-ink">{L('Tus tarifas de envío', 'Your shipping rates')}</div>
          <div className="flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac text-primary-dark"><Package size={17} stroke={2} /></span>
            <div className="min-w-0 flex-1"><div className="text-[12.5px] font-extrabold text-ink">{L('Tarifa plana nacional', 'Flat national rate')}</div><div className="mt-0.5 text-[10px] font-medium text-muted-2">{L('Un solo precio a todo EE.UU.', 'One price to all of the US')}</div></div>
            <span className="text-[13px] font-extrabold text-ink">$8.00</span>
          </div>
          <div className="flex items-center gap-3 rounded-card-sm border border-green/20 bg-green-bg p-3">
            <Package size={16} stroke={2} className="flex-none text-green-dark" />
            <div><div className="text-[11.5px] font-extrabold text-green-dark">{L(`Envío gratis sobre $${shipOps.freeOver}`, `Free shipping over $${shipOps.freeOver}`)}</div><div className="mt-0.5 text-[10px] font-medium text-green-dark/80">{L('Se aplica automáticamente · solo EE.UU.', 'Applied automatically · US only')}</div></div>
          </div>
        </>
      ) : (
        <>
          <div className="px-0.5 text-[12px] font-extrabold text-ink">{L('Transportistas y tarifas', 'Carriers & rates')}</div>
          <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {CARRIERS.map((c, i) => {
              const on = carrierState[i];
              return (
                <div key={c.name + i} className={`flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 ${on ? '' : 'opacity-60'}`}>
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-blue-bg text-blue"><Truck size={17} stroke={2} /></span>
                  <div className="min-w-0 flex-1"><div className="text-[12.5px] font-extrabold text-ink">{c.name}</div><div className="mt-0.5 text-[10px] font-medium text-muted-2">{L(c.dEs, c.dEn)}</div></div>
                  <span className="text-[13px] font-extrabold text-ink">{c.rate}</span>
                  <Toggle on={on} onClick={() => { const next = { ...carrierState, [i]: !on }; setCarrierState(next); persistSettings({}, { carrier: next }); }} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 rounded-field bg-lilac-2 px-3 py-2 text-[10.5px] font-semibold text-ink-3">
            <span className="rounded bg-ink px-1.5 py-0.5 text-[8px] font-extrabold text-white">API</span>
            {L('Conecta USPS/UPS/FedEx con tarifas y etiquetas en vivo vía Shippo/EasyPost desde Admin cuando lances envíos reales.', 'Connect USPS/UPS/FedEx live rates & labels via Shippo/EasyPost from Admin when you launch real shipping.')}
          </div>
        </>
      )}
    </div>
  );

  // ============================ SHIPPING · SETTINGS ============================
  const shipSettingsView = (
    <div className="mx-auto max-w-[560px]">
      <div className={`${cardCls} px-3.5`}>
        {settingRow(L('Envío gratis sobre', 'Free shipping over'), L('Umbral para envío gratis automático.', 'Threshold for automatic free shipping.'), numBox(shipOps.freeOver, (v) => setShipOps((o) => ({ ...o, freeOver: v })), '$'))}
        {settingRow(L('Costo de manejo', 'Handling fee'), L('Se suma a cada envío (empaque, etc.).', 'Added to each shipment (packaging, etc.).'), numBox(shipOps.handling, (v) => setShipOps((o) => ({ ...o, handling: v })), '$'), false)}
        <div className="flex items-center gap-3 border-b border-hair py-3">
          <div className="min-w-0 flex-1"><div className="text-[12px] font-bold text-ink">{L('Paquete predeterminado', 'Default package')}</div><div className="mt-0.5 text-[10px] font-medium text-muted-2">{L('Tamaño sugerido al crear etiquetas.', 'Suggested size when creating labels.')}</div></div>
          <div className="flex flex-none gap-1">{PKG_SIZES.map((p) => <button key={p} onClick={() => setShipOps((o) => ({ ...o, pkg: p }))} className={`cursor-pointer rounded-lg px-2 py-1.5 text-[10px] font-extrabold ${shipOps.pkg === p ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`}>{p}</button>)}</div>
        </div>
        <div className="py-3">
          <div className="text-[12px] font-bold text-ink">{L('Dirección de origen', 'Origin address')}</div>
          <input value={shipOps.origin} onChange={(e) => setShipOps((o) => ({ ...o, origin: e.target.value }))} placeholder={L('Desde dónde envías', 'Where you ship from')} className="mt-1.5 w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary" />
        </div>
      </div>
      <button onClick={() => { persistSettings(); flash(L('Ajustes guardados', 'Settings saved')); }} className="mt-3.5 w-full cursor-pointer rounded-btn-lg bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm">{L('Guardar ajustes', 'Save settings')}</button>
    </div>
  );

  // ---------- content routing ----------
  const content =
    sec === 'delivery'
      ? (delTab === 'dispatch' ? dispatchView : delTab === 'zones' ? zonesView : delTab === 'drivers' ? driversView : delSettingsView)
      : (shipTab === 'queue' ? queueView : shipTab === 'pickup' ? pickupView : shipTab === 'carriers' ? carriersView : shipSettingsView);

  const delSub: [DelTab, string][] = [['dispatch', L('Despacho', 'Dispatch')], ['zones', L('Zonas', 'Zones')], ['drivers', L('Repartidores', 'Drivers')], ['settings', L('Ajustes', 'Settings')]];
  const shipSub: [ShipTab, string][] = [['queue', L('Envíos', 'Shipments')], ['pickup', L('Recoger', 'Pickup')], ['carriers', L('Transportistas', 'Carriers')], ['settings', L('Ajustes', 'Settings')]];

  // ---------- side rail ----------
  const railLinks: { Icon: typeof Route; cls: string; title: string; sub: string; onClick: () => void }[] = [
    { Icon: Route, cls: 'bg-lilac text-primary-dark', title: L('Todos los pedidos', 'All orders'), sub: L('Lista completa · Pedidos', 'Full list · Orders'), onClick: () => go('orders') },
    ...(am.menu ? [{ Icon: Utensils as typeof Route, cls: 'bg-amber-bg text-amber-ink', title: L('Menú de comida', 'Food menu'), sub: L('Activa la entrega local', 'Enables local delivery'), onClick: () => go('menu') }] : []),
    ...(am.products ? [{ Icon: Boxes as typeof Route, cls: 'bg-blue-bg text-blue', title: L('Productos', 'Products'), sub: L('Catálogo e inventario', 'Catalog & inventory'), onClick: () => go('products') }] : []),
  ];
  const rail = (
    <div className="flex flex-col gap-4 xl:sticky xl:top-[74px] xl:self-start">
      <div className={`${cardCls} p-4`}>
        <div className="mb-0.5 text-[13px] font-extrabold text-ink">{sec === 'delivery' ? L('Reparto hoy', 'Delivery today') : L('Envíos', 'Shipping')}</div>
        <div className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold text-muted-2"><span className="flex h-4 w-4 items-center justify-center rounded bg-lilac text-[7px] font-extrabold text-primary-dark">{ci.initials}</span>{ci.name}</div>
        <div className="grid grid-cols-2 gap-2.5">
          {(sec === 'delivery'
            ? [[L('Activos', 'Active'), String(deliveryOrders.filter((o) => delStage(o) !== 'delivered' && delStage(o) !== 'cancelled').length)], [L('En camino', 'On the way'), String(deliveryOrders.filter((o) => delStage(o) === 'en_route').length)], [L('Zonas', 'Zones'), String(zones.length)], [L('Repartidores', 'Drivers'), String(drivers.length)]]
            : [[L('Por enviar', 'To ship'), String(shipOrders.filter((o) => shipStage(o) === 'to_pack' || shipStage(o) === 'labeled').length)], [L('En tránsito', 'In transit'), String(shipOrders.filter((o) => shipStage(o) === 'shipped' || shipStage(o) === 'in_transit').length)], [L('Transportistas', 'Carriers'), String(recToArr(carrierState, 4).filter(Boolean).length)], [L('Recoger', 'Pickup'), recToArr(pickState, 4).some(Boolean) ? L('Sí', 'On') : L('No', 'Off')]]
          ).map(([l, v]) => (<div key={l} className="rounded-btn-lg bg-app p-3"><div className="text-[10px] font-bold text-muted-2">{l}</div><div className="mt-0.5 text-[17px] font-extrabold text-ink">{v}</div></div>))}
        </div>
      </div>
      <div className={`${cardCls} p-4`}>
        <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Atajos', 'Shortcuts')}</div>
        <div className="flex flex-col gap-2.5">
          {railLinks.map((r) => (
            <button key={r.title} onClick={r.onClick} className="flex items-center gap-2.5 text-left">
              <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-btn ${r.cls}`}><r.Icon size={16} strokeWidth={2.2} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[12px] font-extrabold text-ink">{r.title}</span><span className="block text-[10.5px] font-semibold text-muted-2">{r.sub}</span></span>
              <span className="text-[13px] font-extrabold text-muted-2">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const secBtn = (on: boolean) => `flex items-center justify-center gap-2 rounded-btn py-2.5 text-[12.5px] font-extrabold ${on ? 'bg-ink text-white' : 'bg-lilac-2 text-ink-2'}`;
  const enRoute = deliveryOrders.filter((o) => delStage(o) === 'en_route').length;
  const toShip = shipOrders.filter((o) => shipStage(o) === 'to_pack' || shipStage(o) === 'labeled').length;

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
        <button onClick={() => setSec('delivery')} className={secBtn(sec === 'delivery')}><MapPin size={15} stroke={2} />{L('Delivery', 'Delivery')}{enRoute > 0 && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-extrabold text-white">{enRoute}</span>}</button>
        <button onClick={() => setSec('shipping')} className={secBtn(sec === 'shipping')}><Truck size={15} stroke={2} />{L('Shipping', 'Shipping')}{toShip > 0 && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-extrabold text-white">{toShip}</span>}</button>
      </div>

      {/* sub-tabs */}
      <div className="mb-4">
        <ChipRow className="-mx-1 px-1">
          {(sec === 'delivery' ? delSub : shipSub).map(([k, label]) => (
            <button key={k} onClick={() => (sec === 'delivery' ? setDelTab(k as DelTab) : setShipTab(k as ShipTab))} className={chip(sec === 'delivery' ? delTab === k : shipTab === k)}>{label}</button>
          ))}
        </ChipRow>
      </div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">{content}</div>
        {rail}
      </div>

      {/* assign-driver sheet */}
      <Overlay open={assignFor !== null} onClose={() => setAssignFor(null)} width={420}>
        <OverlayTitle title={L('Asignar repartidor', 'Assign driver')} onClose={() => setAssignFor(null)} />
        {assignFor && (
          <div className="flex flex-col gap-3">
            <div className="rounded-field bg-lilac-2 px-3 py-2 text-[11px] font-semibold text-ink-2">{assignFor.code} · {assignFor.customer_name} · {assignFor.fulfillment.address}</div>
            <div className="text-[11px] font-extrabold text-ink-soft">{L('Tus repartidores', 'Your drivers')}</div>
            {drivers.length === 0 ? (
              <div className="rounded-field bg-lilac-2 px-3.5 py-3 text-center">
                <div className="text-[12px] font-extrabold text-ink">{L('Aún no tienes repartidores', 'No drivers yet')}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-muted">{L('Agrega a tu equipo de entrega para asignar pedidos.', 'Add your delivery team to assign orders.')}</div>
                <button onClick={() => { setAssignFor(null); setDriverSheet({ idx: -1, initial: null }); }} className="mt-2.5 cursor-pointer rounded-btn bg-primary px-4 py-2 text-[11.5px] font-extrabold text-white shadow-cta-sm">
                  + {L('Agregar repartidor', 'Add driver')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {drivers.map((d) => (
                  <button key={d.name} onClick={() => assignDriver(d.name, d.phone)} className="flex items-center gap-3 rounded-field border-[1.5px] border-lilac-line bg-white p-2.5 text-left hover:border-primary">
                    <span className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-full text-[11px] font-extrabold text-white" style={{ background: d.photo ? '#EAE7F6' : d.color }}>
                      {d.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.photo} alt="" className="h-full w-full object-cover" />
                      ) : d.initials}
                    </span>
                    <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-extrabold text-ink">{d.name}</span><span className="block text-[10px] font-semibold text-muted-2">{L(d.sEs, d.sEn)}{d.vehicle ? ` · ${d.vehicle}` : ''}</span></span>
                    <span className="flex-none text-[10.5px] font-extrabold text-primary-dark">{L('Asignar', 'Assign')} ›</span>
                  </button>
                ))}
                <button onClick={() => { setAssignFor(null); setDriverSheet({ idx: -1, initial: null }); }} className="cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-white p-2.5 text-[11.5px] font-extrabold text-primary-dark">
                  + {L('Agregar repartidor', 'Add driver')}
                </button>
              </div>
            )}
            <div className="text-[11px] font-extrabold text-ink-soft">{L('O usa una app externa', 'Or use an external app')}</div>
            <div className="flex flex-wrap gap-2">
              {EXT_APPS.filter((_, i) => extState[i]).map((a) => (
                <button key={a.name} onClick={() => assignDriver(a.name)} className="flex items-center gap-2 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 hover:border-primary">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-[11px] font-extrabold text-white" style={{ background: a.color }}>{a.label}</span>
                  <span className="text-[11.5px] font-extrabold text-ink">{a.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Overlay>

      {/* create-label sheet */}
      <Overlay open={labelFor !== null} onClose={() => setLabelFor(null)} width={420}>
        <OverlayTitle title={L('Crear etiqueta de envío', 'Create shipping label')} onClose={() => setLabelFor(null)} />
        {labelFor && (
          <div className="flex flex-col gap-3.5">
            <div className="rounded-field bg-lilac-2 px-3 py-2 text-[11px] font-semibold text-ink-2">{labelFor.code} · {labelFor.customer_name} · {labelFor.fulfillment.address}</div>
            <div>
              <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Transportista', 'Carrier')}</div>
              <div className="flex flex-col gap-2">
                {CARRIERS.filter((_, i) => carrierState[i]).map((c) => (
                  <button key={c.name} onClick={() => setLabelCarrier(c.name)} className={`flex items-center gap-3 rounded-field border-[1.5px] p-2.5 text-left ${labelCarrier === c.name ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                    <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border-[1.5px] ${labelCarrier === c.name ? 'border-primary' : 'border-muted-faint'}`}>{labelCarrier === c.name && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-extrabold text-ink">{c.name}</span><span className="block text-[10px] font-semibold text-muted-2">{L(c.dEs, c.dEn)}</span></span>
                    <span className="flex-none text-[12px] font-extrabold text-ink">{c.rate}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Paquete', 'Package')}</div>
              <div className="flex flex-wrap gap-2">{PKG_SIZES.map((p) => <button key={p} onClick={() => setLabelPkg(p)} className={chip(labelPkg === p)}>{p}</button>)}</div>
            </div>
            <div className="flex items-center gap-2 rounded-field bg-amber-bg px-3 py-2 text-[10px] font-semibold text-amber-ink">
              <Tag size={13} stroke={2.2} className="flex-none" />{L('El número de rastreo es de demostración. Las etiquetas reales se generan con el API del transportista (se conecta desde Admin).', 'The tracking number is a demo. Real labels come from the carrier API (connected from Admin).')}
            </div>
            <button onClick={createLabel} className="w-full cursor-pointer rounded-btn-lg bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm">{L('Crear etiqueta', 'Create label')}</button>
          </div>
        )}
      </Overlay>

      {/* zone editor (create / edit / delete) */}
      <ZoneEditor
        open={zoneSheet !== null}
        onClose={() => setZoneSheet(null)}
        L={L}
        initial={zoneSheet?.initial ?? null}
        index={zoneSheet && zoneSheet.idx >= 0 ? zoneSheet.idx + 1 : zones.length + 1}
        fromMi={(() => {
          // inner radius = the previous zone's outer radius (for the editor hint)
          const idx = zoneSheet ? (zoneSheet.idx >= 0 ? zoneSheet.idx : zones.length) : 0;
          const prev = idx > 0 ? zones[idx - 1]?.toMi : null;
          return prev != null && prev > 0 ? prev : undefined;
        })()}
        onSave={upsertZone}
        onDelete={deleteZone}
      />

      {/* driver editor (create / edit / delete) */}
      <DriverEditor
        open={driverSheet !== null}
        onClose={() => setDriverSheet(null)}
        L={L}
        initial={driverSheet?.initial ?? null}
        onSave={upsertDriver}
        onDelete={deleteDriver}
        onUploadPhoto={uploadDriverPhoto}
      />

      <Toast msg={toast} />
    </div>
  );
}
