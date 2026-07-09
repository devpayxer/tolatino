'use client';

/*
 * Cocina — faithful reimplementation of the design handoff "ToLatino Cocina.dc.html"
 * (Fase 2 · panel del restaurante). Order management: EN VIVO board with today
 * stats + status tabs + order cards → order detail (status banner, timeline,
 * customer, items to make, driver, pago/liquidación) → incoming-order dialog
 * (accept with prep time / reject) → assign-driver / reject / notifications sheets.
 *
 * Pixel-perfect to the handoff. Data is REAL: reads business_orders for the
 * owner's active business (RLS owner-updatable) with realtime; the same status /
 * dispatch writes already notify the client (tg_notify_order, migration 0074).
 * Demo mode (no business) shows the prototype's sample orders so the panel is
 * review-ready.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useBizAdmin } from '@/lib/bizAdmin';
import { useAuth } from '@/lib/auth';
import type { PanelCtx } from '@/screens/negocio/tabs';
import type { OwnDriver } from '@/screens/negocio/modules/FulfillmentEditors';

const INK = '#1E1B2E', PRI = '#7B61FF';
const money = (n: number) => '$' + (Math.round(n * 100) / 100).toFixed(2);
const initialsOf = (name?: string | null) => (name || 'Cliente').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const colorFor = (s: string) => { const p = ['#7B61FF', '#1F9D57', '#E8954A', '#2F6FED', '#E0568F', '#D6336C']; let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return p[h % p.length]; };

// ---- inline icons (handoff exact paths) -----------------------------------
const PATHS: Record<string, string[]> = {
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 0 1-3.4 0'],
  check: ['M20 6 9 17l-5-5'], back: ['M15 18 9 12l6-6'],
  truck: ['M1 6h13v10H1z', 'M14 9h4l3 3v4h-7', 'M6 18a2 2 0 1 0 0-.01M17.5 18a2 2 0 1 0 0-.01'],
  chef: ['M6 11a4 4 0 1 1 1-7.9A4 4 0 0 1 15 2a4 4 0 0 1 3 8', 'M6 11h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z'],
  box: ['M21 8 12 3 3 8v8l9 5 9-5z', 'M3 8l9 5 9-5M12 13v8'],
  slash: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M5.5 5.5l13 13'],
  dollar: ['M12 2v20', 'M17 6a4 4 0 0 0-4-2.5h-1a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-1A4 4 0 0 1 7 18'],
  star: ['M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z'],
  pin: ['M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21z', 'M12 12a2.4 2.4 0 1 0 0-5 2.4 2.4 0 0 0 0 5z'],
  x: ['M18 6 6 18M6 6l12 12'], phone: ['M5 4h3l1.6 4.6-2 1.4a11 11 0 0 0 5 5l1.4-2 4.6 1.6V20a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z'],
  msg: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'], card: ['M2 5h20v14H2z', 'M2 10h20'],
  alert: ['M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4M12 17h.01'],
};
function Ic({ n, s = 15, c = '#6D4DF6', sw = 2 }: { n: string; s?: number; c?: string; sw?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{(PATHS[n] || PATHS.check).map((d, i) => <path key={i} d={d} />)}</svg>;
}

type Dispatch = 'unassigned' | 'assigned' | 'picked_up' | 'on_the_way' | 'delivered';
type Fulfil = { address?: string; address_label?: string; instructions?: string; tip?: number; delivery_fee?: number; service_fee?: number; subtotal?: number; paid_total?: number; dispatch?: Dispatch; driver?: string; driver_phone?: string; eta?: string; prep?: number };
type OItem = { name: string; qty: number; price?: number; opts?: string; note?: string };
type ORow = { id: string; code: string | null; customer_name: string | null; items: OItem[]; total: number | null; channel: string; status: string; created_at: string; fulfillment: Fulfil };
type Bucket = 'nuevo' | 'preparando' | 'listo' | 'camino' | 'completado' | 'rechazado';

const bucketOf = (o: ORow): Bucket => {
  if (o.status === 'cancelled') return 'rechazado';
  if (o.status === 'completed') return 'completado';
  if (o.status === 'new') return 'nuevo';
  if (o.status === 'preparing') return 'preparando';
  const disp = o.fulfillment?.dispatch;
  if (o.channel === 'delivery' && (disp === 'assigned' || disp === 'picked_up' || disp === 'on_the_way')) return 'camino';
  return 'listo';
};
const clock = (iso: string) => { try { return new Date(iso).toLocaleTimeString('es-US', { hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
const ago = (iso: string) => { const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)} h`; };

// demo seed (prototype's sample orders, adapted to the real ORow shape)
const SEED: ORow[] = [
  { id: 's1', code: '#A-1091', customer_name: 'María López', items: [{ name: 'Combo Amigo Clásico', qty: 1, opts: 'Papas gajo · Coca-Cola · Tocino', note: 'Sin cebolla' }, { name: 'Malteada de Vainilla', qty: 2, opts: 'Grande · Crema batida' }, { name: 'Papas con Queso', qty: 1 }], total: 27.09, channel: 'delivery', status: 'new', created_at: new Date(Date.now() - 30000).toISOString(), fulfillment: { address: '5821 Bellaire Blvd · Apt 4B, Houston', address_label: 'Casa', instructions: 'Dejar en la puerta · portón azul', tip: 4.13, subtotal: 22.96, dispatch: 'unassigned' } },
  { id: 's2', code: '#A-1090', customer_name: 'James Turner', items: [{ name: 'Combo Pollo Crujiente', qty: 1, opts: 'Papas clásicas · Sprite' }, { name: 'Nuggets (10 pz)', qty: 1, opts: 'BBQ · Ranch' }], total: 21.47, channel: 'delivery', status: 'new', created_at: new Date(Date.now() - 120000).toISOString(), fulfillment: { address: '1200 McKinney St · Suite 900', instructions: 'Entregar en recepción', tip: 3, subtotal: 18.47, dispatch: 'unassigned' } },
  { id: 's3', code: '#A-1088', customer_name: 'Carla Ríos', items: [{ name: 'Rey Amigo', qty: 2, opts: 'Doble · Tocino · Pepper Jack' }, { name: 'Aros de Cebolla', qty: 1 }, { name: 'Refresco (Grande)', qty: 2, opts: 'Coca-Cola' }], total: 36.40, channel: 'delivery', status: 'preparing', created_at: new Date(Date.now() - 540000).toISOString(), fulfillment: { address: '4410 Hillcroft Ave · Apt 12', instructions: 'Dejar en la puerta', tip: 5.20, subtotal: 31.20, dispatch: 'unassigned', prep: 15 } },
  { id: 's4', code: '#A-1087', customer_name: 'Diego Luna', items: [{ name: 'Combo Doble Amigo', qty: 1, opts: 'Papas clásicas · Fanta' }, { name: 'Pay de Manzana', qty: 1 }], total: 14.98, channel: 'pickup', status: 'preparing', created_at: new Date(Date.now() - 360000).toISOString(), fulfillment: { subtotal: 14.98, prep: 10 } },
  { id: 's5', code: '#A-1085', customer_name: 'Ana Mendoza', items: [{ name: 'Caja Familiar (4 Burgers)', qty: 1 }, { name: 'Papas Familiares', qty: 1 }], total: 30.80, channel: 'delivery', status: 'ready', created_at: new Date(Date.now() - 900000).toISOString(), fulfillment: { address: '7302 Gulfton St · Apt 3', instructions: 'Tocar el timbre', tip: 4.40, subtotal: 26.40, dispatch: 'unassigned' } },
  { id: 's6', code: '#A-1082', customer_name: 'Rosa Salas', items: [{ name: 'Combo BBQ Bacon', qty: 1, opts: 'Papas gajo · Té helado' }, { name: 'Churros (5 pz)', qty: 1 }], total: 23.40, channel: 'delivery', status: 'ready', created_at: new Date(Date.now() - 1500000).toISOString(), fulfillment: { address: '5900 Renwick Dr · Apt 8', tip: 3.50, subtotal: 19.90, dispatch: 'on_the_way', driver: 'Sofía R.', eta: 'Llega ~6 min' } },
  { id: 's7', code: '#A-1079', customer_name: 'Miguel Gómez', items: [{ name: 'Combo Rey Amigo', qty: 1, opts: 'Papas grandes · Coca-Cola' }, { name: 'McFlurry Oreo', qty: 1 }], total: 28.50, channel: 'delivery', status: 'completed', created_at: new Date(Date.now() - 2580000).toISOString(), fulfillment: { tip: 4, subtotal: 24.50, dispatch: 'delivered', driver: 'Marco P.' } },
  { id: 's8', code: '#A-1076', customer_name: 'Lucía Paredes', items: [{ name: 'Combo Fish Amigo', qty: 1, opts: 'Papas clásicas · Agua' }], total: 11.48, channel: 'pickup', status: 'completed', created_at: new Date(Date.now() - 3480000).toISOString(), fulfillment: { subtotal: 11.48 } },
];

const STATUS_META: Record<Bucket, { title: [string, string]; sub: [string, string]; bg: string; border: string; c: string; icon: string }> = {
  nuevo: { title: ['Pedido nuevo', 'New order'], sub: ['Acéptalo para empezar a cocinar', 'Accept to start cooking'], bg: '#FDE7EF', border: '#F8C7D6', c: '#D6336C', icon: 'bell' },
  preparando: { title: ['En preparación', 'Preparing'], sub: ['Cocinando ahora en cocina', 'Cooking now'], bg: '#FEF3C7', border: '#FDE68A', c: '#9A6A12', icon: 'chef' },
  listo: { title: ['Listo', 'Ready'], sub: ['Empacado y esperando repartidor', 'Packed and waiting'], bg: '#EFEBFF', border: '#D7CCF7', c: '#6D4DF6', icon: 'box' },
  camino: { title: ['En camino', 'On the way'], sub: ['El repartidor va hacia el cliente', 'Driver en route'], bg: '#E3F5EA', border: '#B7E3C8', c: '#1F8A4C', icon: 'truck' },
  completado: { title: ['Entregado', 'Delivered'], sub: ['Pedido completado con éxito', 'Completed'], bg: '#E3F5EA', border: '#B7E3C8', c: '#1F8A4C', icon: 'check' },
  rechazado: { title: ['Rechazado', 'Rejected'], sub: ['Pedido cancelado', 'Cancelled'], bg: '#F1EFFA', border: '#E2DEF4', c: '#9A96AE', icon: 'slash' },
};

export function CocinaModule({ ctx }: { ctx: PanelCtx }) {
  const { L } = ctx;
  const admin = useBizAdmin();
  const { user } = useAuth();
  const real = admin.active;
  const persistable = !admin.demo && !!real;

  const [orders, setOrders] = useState<ORow[]>(persistable ? [] : SEED);
  const [view, setView] = useState<'board' | 'detail'>('board');
  const [tab, setTab] = useState<Bucket>('nuevo');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModal] = useState<'assign' | 'reject' | 'notif' | null>(null);
  const [incomingId, setIncomingId] = useState<string | null>(null);
  const [prep, setPrep] = useState(15);
  const [toast, setToast] = useState('');
  const toastT = useRef<number | null>(null);
  const seenNew = useRef<Set<string>>(new Set());
  const B = (p: [string, string]) => L(p[0], p[1]);
  const flash = (m: string) => { if (toastT.current) window.clearTimeout(toastT.current); setToast(m); toastT.current = window.setTimeout(() => setToast(''), 1900); };

  const mapRow = (r: Record<string, unknown>): ORow => ({
    id: String(r.id), code: (r.code as string) ?? null, customer_name: (r.customer_name as string) ?? null,
    items: Array.isArray(r.items) ? (r.items as OItem[]) : [], total: r.total != null ? Number(r.total) : null,
    channel: String(r.channel ?? 'pickup'), status: String(r.status ?? 'new'), created_at: String(r.created_at ?? ''),
    fulfillment: (r.fulfillment as Fulfil) ?? {},
  });

  // load real orders + realtime
  useEffect(() => {
    if (!persistable || !real || !supabase) { setOrders(SEED); return; }
    let cancelled = false;
    const load = () => supabase!.from('business_orders').select('*').eq('business_id', real.id).order('created_at', { ascending: false }).limit(120)
      .then(({ data, error }) => { if (cancelled || error || !Array.isArray(data)) { if (!cancelled) setOrders([]); return; } const rows = (data as Record<string, unknown>[]).map(mapRow); rows.forEach((o) => { if (o.status === 'new') seenNew.current.add(o.id); }); setOrders(rows); });
    load();
    const ch = supabase.channel(`cocina-${real.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'business_orders', filter: `business_id=eq.${real.id}` }, (payload) => {
      const n = payload.new as Record<string, unknown> | null;
      if (payload.eventType === 'INSERT' && n && String(n.status) === 'new' && !seenNew.current.has(String(n.id))) { seenNew.current.add(String(n.id)); setIncomingId(String(n.id)); }
      load();
    }).subscribe();
    return () => { cancelled = true; supabase!.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  const patch = (id: string, up: Partial<ORow>) => setOrders((os) => os.map((o) => (o.id === id ? { ...o, ...up } : o)));
  const write = (id: string, patchObj: Record<string, unknown>) => { if (persistable && supabase) supabase.from('business_orders').update(patchObj).eq('id', id).then(() => {}); };
  const setStatus = (o: ORow, status: string) => { patch(o.id, { status }); write(o.id, { status }); };
  const setFulfil = (o: ORow, up: Partial<Fulfil>) => { const f = { ...o.fulfillment, ...up }; patch(o.id, { fulfillment: f }); write(o.id, { fulfillment: f }); };

  const accept = (o: ORow, p: number) => { setFulfil(o, { prep: p }); setStatus(o, 'preparing'); flash(L(`Pedido aceptado · ${p} min`, `Order accepted · ${p} min`)); };
  const markReady = (o: ORow) => { setStatus(o, 'ready'); flash(L('Marcado como listo', 'Marked ready')); };
  const assignDriver = (o: ORow, name: string, phone?: string, ext?: boolean) => { setFulfil(o, { dispatch: 'on_the_way', driver: name, ...(phone ? { driver_phone: phone } : {}), eta: `Llega ~${5 + Math.floor(Math.random() * 6)} min` }); flash(L(`${name} asignado · en camino`, `${name} assigned · on the way`)); setModal(null); };
  const deliver = (o: ORow) => { setFulfil(o, { dispatch: 'delivered' }); setStatus(o, 'completed'); flash(L(o.channel === 'pickup' ? 'Pedido recogido ✓' : 'Pedido entregado ✓', 'Order completed ✓')); };
  const reject = (o: ORow) => { setStatus(o, 'cancelled'); flash(L('Pedido rechazado', 'Order rejected')); setModal(null); setIncomingId(null); if (view === 'detail') setView('board'); };

  const count = (b: Bucket) => orders.filter((o) => bucketOf(o) === b).length;
  const active = orders.find((o) => o.id === activeId) || null;
  const incoming = orders.find((o) => o.id === incomingId && o.status === 'new') || null;

  // today stats (real)
  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todays = orders.filter((o) => new Date(o.created_at) >= today);
    const ingresos = todays.filter((o) => bucketOf(o) === 'completado').reduce((n, o) => n + (o.fulfillment?.paid_total ?? o.total ?? 0), 0);
    return [
      { label: L('Ingresos hoy', 'Revenue today'), value: money(ingresos), delta: '', bg: '#E3F5EA', labelC: '#1F8A4C', deltaC: '#1F9D57' },
      { label: L('Pedidos hoy', 'Orders today'), value: String(todays.length), delta: `${count('nuevo')} ${L('nuevos', 'new')}`, bg: '#FDE7EF', labelC: '#D6336C', deltaC: '#D6336C' },
      { label: L('En cocina', 'Cooking'), value: String(count('preparando')), delta: '', bg: '#EFEBFF', labelC: '#6D4DF6', deltaC: '#9A96AE' },
      { label: L('En ruta', 'En route'), value: String(count('camino')), delta: '', bg: '#FEF3C7', labelC: '#9A6A12', deltaC: '#1F9D57' },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const modeChip = (channel: string) => { const d = channel === 'delivery'; return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 7, font: "800 8.5px 'Plus Jakarta Sans'", background: d ? '#EFEBFF' : '#FCEFD6', color: d ? '#6D4DF6' : '#9A6A12' }}>{d ? L('ENTREGA', 'DELIVERY') : L('RECOGER', 'PICKUP')}</span>; };

  const cardAction = (o: ORow): { label: string; icon: string; bg: string; reject?: boolean; act: () => void } | null => {
    const b = bucketOf(o);
    if (b === 'nuevo') return { label: L('Aceptar', 'Accept'), icon: 'check', bg: '#1F9D57', reject: true, act: () => accept(o, 15) };
    if (b === 'preparando') return { label: L('Marcar listo', 'Mark ready'), icon: 'box', bg: PRI, act: () => markReady(o) };
    if (b === 'listo' && o.channel === 'delivery') return { label: L('Asignar repartidor', 'Assign driver'), icon: 'truck', bg: PRI, act: () => { setActiveId(o.id); setModal('assign'); } };
    if (b === 'listo') return { label: L('Recogido', 'Picked up'), icon: 'check', bg: '#1F9D57', act: () => deliver(o) };
    if (b === 'camino') return { label: L('Entregado', 'Delivered'), icon: 'check', bg: '#1F9D57', act: () => deliver(o) };
    return null;
  };

  // ==================== render ====================
  const headTitle = view === 'detail' ? (active?.code || L('Pedido', 'Order')) : L('Pedidos', 'Orders');
  const notifCount = 0; // owner notifications badge (real feed opens the sheet)

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <style>{`@keyframes tlsheet{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes tlfade{from{opacity:0}to{opacity:1}}@keyframes tlpop{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}@keyframes tlpulse{0%{box-shadow:0 0 0 0 rgba(240,70,110,.5)}70%{box-shadow:0 0 0 14px rgba(240,70,110,0)}100%{box-shadow:0 0 0 0 rgba(240,70,110,0)}}@keyframes tlblink{0%,100%{opacity:1}50%{opacity:.3}}.ck-ns::-webkit-scrollbar{display:none}.ck-ns{scrollbar-width:none}`}</style>
      <div style={{ position: 'relative', maxWidth: 620, margin: '0 auto', background: '#F4F2F9', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(30,27,46,.06)', minHeight: 560 }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px 11px', background: '#fff', borderBottom: '1px solid rgba(30,27,46,.07)' }}>
          {view === 'detail' && <button onClick={() => { setView('board'); setActiveId(null); }} style={hdrBtn}><Ic n="back" s={17} c={INK} sw={2.4} /></button>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "800 16px 'Plus Jakarta Sans'", color: INK, display: 'flex', alignItems: 'center', gap: 7 }}>{headTitle}
              {view === 'board' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#E3F5EA', color: '#1F8A4C', padding: '2px 7px', borderRadius: 6, font: "800 8.5px 'Plus Jakarta Sans'" }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1F9D57', animation: 'tlblink 1.4s infinite' }} />{L('EN VIVO', 'LIVE')}</span>}
            </div>
            <div style={{ font: "600 11px 'Plus Jakarta Sans'", color: '#9A96AE' }}>{view === 'detail' ? `${real?.name ?? "To'Latino"} · ${L('cocina', 'kitchen')}` : `${count('nuevo')} ${L('nuevos', 'new')} · ${count('preparando')} ${L('en cocina', 'cooking')} · ${count('camino')} ${L('en ruta', 'en route')}`}</div>
          </div>
          <button onClick={() => setModal('notif')} style={{ ...hdrBtn, position: 'relative' }}><Ic n="bell" s={17} c={INK} sw={2} />{notifCount > 0 && <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#F0466E', color: '#fff', font: "800 9px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>{notifCount}</span>}</button>
        </div>

        {/* ============ BOARD ============ */}
        {view === 'board' && (
          <div>
            <div className="ck-ns" style={{ display: 'flex', gap: 9, overflowX: 'auto', padding: '12px 14px 4px', background: '#fff' }}>
              {stats.map((s, i) => (
                <div key={i} style={{ flex: 'none', minWidth: 100, background: s.bg, borderRadius: 13, padding: '10px 12px' }}>
                  <div style={{ font: "600 9px 'Plus Jakarta Sans'", color: s.labelC }}>{s.label}</div>
                  <div style={{ font: "800 17px 'Plus Jakarta Sans'", color: INK, marginTop: 2 }}>{s.value}</div>
                  {s.delta && <div style={{ font: "800 9px 'Plus Jakarta Sans'", color: s.deltaC, marginTop: 1 }}>{s.delta}</div>}
                </div>
              ))}
            </div>
            <div className="ck-ns" style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '12px 14px', background: '#fff', borderBottom: '1px solid rgba(30,27,46,.06)' }}>
              {(['nuevo', 'preparando', 'listo', 'camino', 'completado'] as Bucket[]).map((b) => { const on = tab === b; const n = count(b); const lbl: string = ({ nuevo: L('Nuevos', 'New'), preparando: L('Preparando', 'Preparing'), listo: L('Listos', 'Ready'), camino: L('En camino', 'On the way'), completado: L('Completados', 'Completed'), rechazado: L('Rechazados', 'Rejected') } as Record<Bucket, string>)[b]; return (
                <button key={b} onClick={() => setTab(b)} style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer', padding: '8px 13px', borderRadius: 999, font: `${on ? 800 : 700} 12px 'Plus Jakarta Sans'`, background: on ? INK : '#F1EFFA', color: on ? '#fff' : '#56506E' }}>
                  {lbl}<span style={{ minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9, font: "800 10px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'rgba(255,255,255,.22)' : (b === 'nuevo' && n ? '#F0466E' : '#E2DEF4'), color: on ? '#fff' : (b === 'nuevo' && n ? '#fff' : '#6E6A85') }}>{n}</span>
                </button>
              ); })}
            </div>
            <div style={{ padding: '14px 14px 20px', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {orders.filter((o) => bucketOf(o) === tab).map((o) => { const ca = cardAction(o); const b = bucketOf(o); const itemCount = o.items.reduce((n, i) => n + i.qty, 0); return (
                <div key={o.id} style={{ background: '#fff', border: `1px solid ${b === 'nuevo' ? '#F8C7D6' : 'rgba(30,27,46,.08)'}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(60,50,110,.05)' }}>
                  <div onClick={() => { setActiveId(o.id); setView('detail'); }} style={{ padding: '13px 14px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: colorFor(o.id), color: '#fff', font: "800 13px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{initialsOf(o.customer_name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ font: "800 14px 'Plus Jakarta Sans'", color: INK }}>{o.code || o.id.slice(0, 6)}</span>{modeChip(o.channel)}</div>
                        <div style={{ font: "600 11.5px 'Plus Jakarta Sans'", color: '#8A86A0', marginTop: 2 }}>{o.customer_name || L('Cliente', 'Customer')} · {ago(o.created_at)}</div>
                      </div>
                      <div style={{ textAlign: 'right', flex: 'none' }}><div style={{ font: "800 15px 'Plus Jakarta Sans'", color: INK }}>{money(o.fulfillment?.paid_total ?? o.total ?? 0)}</div><div style={{ font: "700 10px 'Plus Jakarta Sans'", color: '#9A96AE' }}>{itemCount} art.</div></div>
                    </div>
                    <div style={{ font: "600 12px 'Plus Jakarta Sans'", color: '#4A4660', marginTop: 10, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}</div>
                    {b === 'camino' && o.fulfillment?.driver && <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9, background: '#E3F5EA', borderRadius: 9, padding: '7px 10px' }}><Ic n="truck" s={13} c="#1F8A4C" /><span style={{ font: "700 10.5px 'Plus Jakarta Sans'", color: '#176B3A' }}>{o.fulfillment.driver}{o.fulfillment.eta ? ` · ${o.fulfillment.eta}` : ''}</span></div>}
                    {b === 'completado' && <div style={{ font: "700 11px 'Plus Jakarta Sans'", color: '#9A6A12', marginTop: 8 }}>{L('Completado', 'Completed')} · {clock(o.created_at)}</div>}
                  </div>
                  {ca && (
                    <div style={{ display: 'flex', gap: 9, padding: '0 14px 13px' }}>
                      {ca.reject && <button onClick={() => { setActiveId(o.id); setModal('reject'); }} style={{ flex: 'none', border: '1.5px solid #F0C9D3', background: '#fff', color: '#D6336C', cursor: 'pointer', padding: '11px 14px', borderRadius: 11, font: "800 12px 'Plus Jakarta Sans'" }}>{L('Rechazar', 'Reject')}</button>}
                      <button onClick={ca.act} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: 'none', cursor: 'pointer', background: ca.bg, color: '#fff', padding: 11, borderRadius: 11, font: "800 12px 'Plus Jakarta Sans'" }}><Ic n={ca.icon} s={14} c="#fff" sw={2.6} />{ca.label}</button>
                    </div>
                  )}
                </div>
              ); })}
              {orders.filter((o) => bucketOf(o) === tab).length === 0 && <div style={{ textAlign: 'center', padding: '56px 20px', color: '#9A96AE', font: "600 13px 'Plus Jakarta Sans'" }}>{L('Nada por aquí ahora mismo', 'Nothing here right now')} 👍</div>}
            </div>
          </div>
        )}

        {/* ============ DETAIL ============ */}
        {view === 'detail' && active && <Detail o={active} />}

        {/* incoming dialog */}
        {incoming && !modal && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(28,24,46,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'tlfade .2s ease' }}>
            <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 70px rgba(28,24,46,.4)', animation: 'tlpop .28s cubic-bezier(.34,1.4,.5,1)' }}>
              <div style={{ background: '#F0466E', padding: '18px 18px 16px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', animation: 'tlpulse 1.6s infinite' }}><Ic n="bell" s={26} c="#F0466E" sw={2.2} /></div>
                <div style={{ font: "800 18px 'Plus Jakarta Sans'", color: '#fff' }}>{L('¡Nuevo pedido!', 'New order!')}</div>
                <div style={{ font: "600 12px 'Plus Jakarta Sans'", color: 'rgba(255,255,255,.9)', marginTop: 3 }}>{incoming.code || incoming.id.slice(0, 6)} · {incoming.channel === 'delivery' ? L('ENTREGA', 'DELIVERY') : L('RECOGER', 'PICKUP')} · {ago(incoming.created_at)}</div>
              </div>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: colorFor(incoming.id), color: '#fff', font: "800 14px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{initialsOf(incoming.customer_name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 14px 'Plus Jakarta Sans'", color: INK }}>{incoming.customer_name || L('Cliente', 'Customer')}</div><div style={{ font: "600 11px 'Plus Jakarta Sans'", color: '#9A96AE' }}>{incoming.items.reduce((n, i) => n + i.qty, 0)} {L('artículos', 'items')} · {money(incoming.fulfillment?.paid_total ?? incoming.total ?? 0)}</div></div>
                </div>
                <div style={{ background: '#F7F6FC', borderRadius: 12, padding: '11px 13px', maxHeight: 120, overflow: 'hidden' }}>
                  {incoming.items.map((i, k) => <div key={k} style={{ display: 'flex', gap: 8, padding: '3px 0' }}><span style={{ font: "800 11px 'Plus Jakarta Sans'", color: '#6D4DF6', minWidth: 20 }}>{i.qty}×</span><span style={{ flex: 1, font: "600 11.5px 'Plus Jakarta Sans'", color: '#4A4660', minWidth: 0 }}>{i.name}</span></div>)}
                </div>
                <div style={{ font: "800 11px 'Plus Jakarta Sans'", color: '#56506E', margin: '14px 0 8px' }}>{L('Tiempo de preparación', 'Prep time')}</div>
                <div style={{ display: 'flex', gap: 7 }}>
                  {[10, 15, 20, 30].map((p) => <button key={p} onClick={() => setPrep(p)} style={{ flex: 1, border: `1.5px solid ${prep === p ? '#1F9D57' : '#E2DEF4'}`, background: prep === p ? '#E9F8EF' : '#fff', color: prep === p ? '#1F8A4C' : '#56506E', cursor: 'pointer', padding: 10, borderRadius: 11, font: "800 12px 'Plus Jakarta Sans'" }}>{p} min</button>)}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => reject(incoming)} style={{ flex: 'none', border: '1.5px solid #F0C9D3', background: '#fff', color: '#D6336C', cursor: 'pointer', padding: '15px 18px', borderRadius: 14, font: "800 13.5px 'Plus Jakarta Sans'" }}>{L('Rechazar', 'Reject')}</button>
                  <button onClick={() => { accept(incoming, prep); setIncomingId(null); setTab('preparando'); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', background: '#1F9D57', color: '#fff', cursor: 'pointer', padding: 15, borderRadius: 14, font: "800 14px 'Plus Jakarta Sans'", boxShadow: '0 12px 24px rgba(31,157,87,.32)' }}><Ic n="check" s={17} c="#fff" sw={2.6} />{L('Aceptar', 'Accept')} · {prep} min</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* sheets */}
        {modal && <Sheets />}

        {/* toast */}
        {toast && <div style={{ position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)', zIndex: 42, background: INK, color: '#fff', padding: '12px 18px', borderRadius: 12, font: "700 12.5px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 12px 30px rgba(28,24,46,.4)', whiteSpace: 'nowrap', animation: 'tlpop .2s ease' }}><Ic n="check" s={14} c="#7BE0A8" sw={2.6} />{toast}</div>}
      </div>
    </div>
  );

  // ---- nested: order detail ----
  function Detail({ o }: { o: ORow }) {
    const b = bucketOf(o); const sm = STATUS_META[b]; const f = o.fulfillment; const isDelivery = o.channel === 'delivery';
    const itemCount = o.items.reduce((n, i) => n + i.qty, 0);
    const sub = f.subtotal ?? (o.total ?? 0);
    const commission = Math.round(sub * 0.15 * 100) / 100;
    const payout = Math.round((sub - commission) * 100) / 100;
    const order: Bucket[] = ['nuevo', 'preparando', 'listo', 'camino', 'completado'];
    const curIdx = order.indexOf(b === 'rechazado' ? 'nuevo' : b);
    const steps: [Bucket, string, string][] = isDelivery
      ? [['nuevo', L('Pedido recibido', 'Order received'), clock(o.created_at)], ['preparando', L('Aceptado y en preparación', 'Accepted & preparing'), ''], ['listo', L('Listo', 'Ready'), ''], ['camino', L('Repartidor en camino', 'Driver on the way'), f.driver || ''], ['completado', L('Entregado', 'Delivered'), '']]
      : [['nuevo', L('Pedido recibido', 'Order received'), clock(o.created_at)], ['preparando', L('Aceptado y en preparación', 'Accepted & preparing'), ''], ['listo', L('Listo para recoger', 'Ready for pickup'), ''], ['completado', L('Recogido', 'Picked up'), '']];
    const footer = cardAction(o);
    return (
      <div>
        <div className="ck-ns" style={{ padding: '14px 16px 16px', maxHeight: 640, overflowY: 'auto' }}>
          {/* status banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: sm.bg, border: `1px solid ${sm.border}`, borderRadius: 15, padding: '13px 14px' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Ic n={sm.icon} s={20} c={sm.c} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 14px 'Plus Jakarta Sans'", color: sm.c }}>{B(sm.title)}</div><div style={{ font: "600 11px 'Plus Jakarta Sans'", color: '#6E6A85', marginTop: 1 }}>{B(sm.sub)}</div></div>
            {modeChip(o.channel)}
          </div>

          {/* timeline */}
          <Card>
            <CardTitle>{L('Progreso del pedido', 'Order progress')}</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {steps.map(([s, title, sub2], i) => { const si = order.indexOf(s); const reached = si <= curIdx; const active = s === b; return (
                <div key={s} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', background: reached ? (active && b !== 'completado' ? PRI : '#1F9D57') : '#E3DEF2' }}>{reached && !(active && b !== 'completado') && <Ic n="check" s={11} c="#fff" sw={3.4} />}</div>
                    {i < steps.length - 1 && <div style={{ width: 2.5, height: 22, background: si < curIdx ? '#1F9D57' : '#E3DEF2', borderRadius: 2 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingBottom: 11 }}><div style={{ font: `${reached ? 800 : 600} 12.5px 'Plus Jakarta Sans'`, color: reached ? INK : '#B0ACC0' }}>{title}</div>{sub2 && <div style={{ font: "500 10.5px 'Plus Jakarta Sans'", color: '#9A96AE', marginTop: 1 }}>{sub2}</div>}</div>
                  <span style={{ font: "700 10.5px 'Plus Jakarta Sans'", color: '#B7B3C6', flex: 'none' }}>{steps[i][2] || (reached ? '' : '—')}</span>
                </div>
              ); })}
            </div>
          </Card>

          {/* customer */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: colorFor(o.id), color: '#fff', font: "800 15px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{initialsOf(o.customer_name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 14px 'Plus Jakarta Sans'", color: INK }}>{o.customer_name || L('Cliente', 'Customer')}</div><div style={{ font: "600 11px 'Plus Jakarta Sans'", color: '#9A96AE' }}>{isDelivery ? L('Cliente To’Latino', "To'Latino customer") : L('Recoge en tienda', 'Store pickup')}</div></div>
              <div style={{ display: 'flex', gap: 8, flex: 'none' }}><span style={roundBtn}><Ic n="phone" s={16} /></span><span style={roundBtn}><Ic n="msg" s={16} /></span></div>
            </div>
            {isDelivery && f.address && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(30,27,46,.06)' }}><Ic n="pin" s={16} c="#9A96AE" /><div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 12px 'Plus Jakarta Sans'", color: INK }}>{f.address_label ? `${f.address_label} · ` : ''}{f.address}</div>{f.instructions && <div style={{ font: "600 10.5px 'Plus Jakarta Sans'", color: '#9A96AE', marginTop: 2 }}>{f.instructions}</div>}</div></div>}
          </Card>

          {/* items to make */}
          <Card>
            <CardTitle>{L('Para preparar', 'To prepare')} · {itemCount} {L('artículos', 'items')}</CardTitle>
            {o.items.map((i, k) => { const note = i.opts && i.opts.includes('📝') ? i.opts.split('📝')[1].trim() : i.note; const mods = i.opts && i.opts.includes('📝') ? i.opts.split('📝')[0].replace(/·\s*$/, '').trim() : i.opts; return (
              <div key={k} style={{ display: 'flex', gap: 11, padding: '11px 0', borderBottom: k < o.items.length - 1 ? '1px solid rgba(30,27,46,.05)' : 'none' }}>
                <span style={{ minWidth: 26, height: 26, padding: '0 6px', borderRadius: 8, background: '#EFEBFF', color: '#6D4DF6', font: "800 12px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{i.qty}×</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 13px 'Plus Jakarta Sans'", color: INK }}>{i.name}</div>{mods && <div style={{ font: "500 11px 'Plus Jakarta Sans'", color: '#8A86A0', marginTop: 3, lineHeight: 1.4 }}>{mods}</div>}{note && <div style={{ font: "700 10.5px 'Plus Jakarta Sans'", color: '#D6336C', marginTop: 3 }}>⚠ {note}</div>}</div>
                {i.price != null && <span style={{ font: "800 12.5px 'Plus Jakarta Sans'", color: INK, flex: 'none' }}>{money(i.price * i.qty)}</span>}
              </div>
            ); })}
          </Card>

          {/* driver assigned */}
          {f.driver && (b === 'camino' || b === 'completado') && (
            <Card>
              <CardTitle>{L('Repartidor asignado', 'Assigned driver')}</CardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: colorFor(f.driver), color: '#fff', font: "800 15px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{initialsOf(f.driver)}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 13.5px 'Plus Jakarta Sans'", color: INK }}>{f.driver}</div>{f.driver_phone && <div style={{ font: "600 11px 'Plus Jakarta Sans'", color: '#9A96AE', marginTop: 1 }}>{f.driver_phone}</div>}</div>
                {f.eta && <span style={{ background: '#E3F5EA', color: '#1F8A4C', padding: '6px 10px', borderRadius: 9, font: "800 10.5px 'Plus Jakarta Sans'", flex: 'none' }}>{f.eta}</span>}
              </div>
            </Card>
          )}

          {/* pago / liquidación */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}><span style={{ font: "800 12.5px 'Plus Jakarta Sans'", color: INK }}>{L('Pago y liquidación', 'Payment & payout')}</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#E3F5EA', color: '#1F8A4C', padding: '3px 8px', borderRadius: 7, font: "800 9px 'Plus Jakarta Sans'" }}><Ic n="check" s={10} c="#1F8A4C" sw={3} />{L('Pagado', 'Paid')}</span></div>
            <PayRow label={L('Subtotal comida', 'Food subtotal')} value={money(sub)} />
            {isDelivery && !!f.tip && <PayRow label={L('Propina (100% al repartidor)', 'Tip (100% to driver)')} value={money(f.tip)} valueC="#9A96AE" />}
            <PayRow label={L('Comisión To’Latino (15%)', "To'Latino commission (15%)")} value={'-' + money(commission)} labelC="#D6336C" valueC="#D6336C" weight={700} />
            <div style={{ height: 1, background: 'rgba(30,27,46,.08)', margin: '9px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ font: "800 13.5px 'Plus Jakarta Sans'", color: INK }}>{L('Tu pago neto', 'Your net payout')}</span><span style={{ font: "800 17px 'Plus Jakarta Sans'", color: '#1F9D57' }}>{money(payout)}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9, background: '#F7F6FC', borderRadius: 10, padding: '9px 11px' }}><Ic n="card" s={14} /><span style={{ font: "600 10.5px 'Plus Jakarta Sans'", color: '#6E6A85' }}>{L('Depósito automático a tu banco vía Stripe', 'Auto-deposit to your bank via Stripe')}</span></div>
          </Card>
          <div style={{ height: 8 }} />
        </div>
        {footer && (
          <div style={{ padding: '11px 16px 16px', background: '#fff', borderTop: '1px solid rgba(30,27,46,.07)' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {bucketOf(o) === 'nuevo' && <button onClick={() => setModal('reject')} style={{ flex: 'none', border: '1.5px solid #F0C9D3', background: '#fff', color: '#D6336C', cursor: 'pointer', padding: '15px 18px', borderRadius: 14, font: "800 13.5px 'Plus Jakarta Sans'" }}>{L('Rechazar', 'Reject')}</button>}
              <button onClick={footer.act} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', cursor: 'pointer', background: footer.bg, color: '#fff', padding: 15, borderRadius: 14, font: "800 13.5px 'Plus Jakarta Sans'", boxShadow: `0 12px 24px ${footer.bg === '#1F9D57' ? 'rgba(31,157,87,.3)' : 'rgba(123,97,255,.3)'}` }}><Ic n={footer.icon} s={16} c="#fff" sw={2.6} />{footer.label}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- nested: sheets (assign / reject / notif) ----
  function Sheets() {
    const drivers: OwnDriver[] = (real?.settings?.drivers as OwnDriver[] | undefined) ?? [];
    const ext = [{ badge: 'U', color: '#000', name: 'Uber Direct', sub: L('Conductor bajo demanda', 'On-demand driver'), rate: '$8.50 · ~6 min' }, { badge: 'D', color: '#FF3008', name: 'DoorDash Drive', sub: L('Respaldo de flota externa', 'External fleet backup'), rate: '$9.00 · ~9 min' }];
    const rejectReasons = [L('Artículo agotado', 'Item sold out'), L('Cocina saturada', 'Kitchen overloaded'), L('Cerramos por hoy', 'Closed for today'), L('Fuera de zona de entrega', 'Out of delivery zone')];
    const title = modal === 'assign' ? L('Asignar repartidor', 'Assign driver') : modal === 'reject' ? L('Rechazar pedido', 'Reject order') : L('Notificaciones', 'Notifications');
    const o = active;
    return (
      <>
        <div onClick={() => setModal(null)} style={{ position: 'absolute', inset: 0, zIndex: 34, background: 'rgba(28,24,46,.5)', animation: 'tlfade .2s ease' }} />
        <div className="ck-ns" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 35, maxHeight: '88%', overflowY: 'auto', background: '#fff', borderRadius: '24px 24px 0 0', boxShadow: '0 -18px 50px rgba(28,24,46,.3)', animation: 'tlsheet .24s ease' }}>
          <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '9px 0 6px', display: 'flex', justifyContent: 'center' }}><span style={{ width: 42, height: 5, borderRadius: 3, background: '#E3DEF2' }} /></div>
          <div style={{ padding: '2px 18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}><span style={{ font: "800 17px 'Plus Jakarta Sans'", color: INK }}>{title}</span><button onClick={() => setModal(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#F1EFFA', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n="x" s={13} c={INK} sw={2.6} /></button></div>

            {modal === 'assign' && (
              <div>
                <Overline>{L('Tus repartidores', 'Your drivers')}</Overline>
                {drivers.length === 0 && <div style={{ font: "600 12px 'Plus Jakarta Sans'", color: '#9A96AE', padding: '2px 2px 10px' }}>{L('Aún no tienes repartidores. Agrégalos en Entregas.', 'No drivers yet. Add them in Delivery.')}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {drivers.map((d, i) => (
                    <button key={i} onClick={() => o && assignDriver(o, d.name, d.phone)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', border: '1.5px solid #E2DEF4', background: '#fff', cursor: 'pointer', padding: '11px 13px', borderRadius: 13 }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: d.color, color: '#fff', font: "800 14px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{d.initials}</div>
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}><div style={{ font: "800 13px 'Plus Jakarta Sans'", color: INK }}>{d.name}</div><div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: d.dot, flex: 'none' }} /><span style={{ font: "600 10.5px 'Plus Jakarta Sans'", color: '#9A96AE' }}>{L(d.sEs, d.sEn)}</span></div></div>
                      <span style={{ font: "800 10.5px 'Plus Jakarta Sans'", color: '#6D4DF6' }}>{L('Asignar', 'Assign')} ›</span>
                    </button>
                  ))}
                </div>
                <Overline mt>{L('Apps externas (respaldo)', 'External apps (backup)')}</Overline>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {ext.map((e) => (
                    <button key={e.name} onClick={() => o && assignDriver(o, e.name + ' (externo)', undefined, true)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', border: '1.5px solid #E2DEF4', background: '#fff', cursor: 'pointer', padding: '11px 13px', borderRadius: 13 }}>
                      <span style={{ width: 42, height: 42, borderRadius: 12, background: e.color, color: '#fff', font: "800 17px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{e.badge}</span>
                      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}><span style={{ display: 'block', font: "800 13px 'Plus Jakarta Sans'", color: INK }}>{e.name}</span><span style={{ display: 'block', font: "600 10.5px 'Plus Jakarta Sans'", color: '#9A96AE', marginTop: 1 }}>{e.sub}</span></span>
                      <span style={{ font: "800 10.5px 'Plus Jakarta Sans'", color: '#6D4DF6', flex: 'none' }}>{e.rate}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {modal === 'reject' && (
              <div>
                <div style={{ font: "500 12px 'Plus Jakarta Sans'", color: '#8A86A0', lineHeight: 1.5, marginBottom: 12 }}>{L('Elige el motivo. Se le avisará al cliente y no se le cobrará.', "Pick a reason. The customer is notified and won't be charged.")}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rejectReasons.map((r) => <button key={r} onClick={() => o && reject(o)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', border: '1.5px solid #E2DEF4', background: '#fff', cursor: 'pointer', padding: 13, borderRadius: 12, textAlign: 'left' }}><span style={{ width: 32, height: 32, borderRadius: 9, background: '#FDE7EF', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Ic n="slash" s={15} c="#D6336C" /></span><span style={{ flex: 1, font: "700 12.5px 'Plus Jakarta Sans'", color: INK }}>{r}</span></button>)}
                </div>
              </div>
            )}

            {modal === 'notif' && <NotifList />}
          </div>
        </div>
      </>
    );
  }

  function NotifList() {
    const [rows, setRows] = useState<{ kind: string; data: Record<string, unknown>; created_at: string; read: boolean }[] | null>(null);
    useEffect(() => {
      if (!persistable || !supabase || !user) { setRows([]); return; }
      let cancelled = false;
      supabase.from('notifications').select('kind,data,created_at,read').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => { if (!cancelled) setRows((data as typeof rows) ?? []); });
      return () => { cancelled = true; };
    }, []);
    const meta = (k: string): { icon: string; bg: string; c: string; title: string } => {
      if (k === 'order_new') return { icon: 'bell', bg: '#FDE7EF', c: '#D6336C', title: L('Nuevo pedido', 'New order') };
      if (k === 'order_status') return { icon: 'truck', bg: '#E3F5EA', c: '#1F8A4C', title: L('Actualización de pedido', 'Order update') };
      if (k === 'ticket_new') return { icon: 'star', bg: '#FEF3C7', c: '#9A6A12', title: L('Boletos vendidos', 'Tickets sold') };
      if (k === 'booking_new') return { icon: 'bell', bg: '#EFEBFF', c: '#6D4DF6', title: L('Nueva reserva', 'New booking') };
      return { icon: 'bell', bg: '#EFEBFF', c: '#6D4DF6', title: L('Notificación', 'Notification') };
    };
    const demo = [
      { icon: 'bell', bg: '#FDE7EF', c: '#D6336C', title: L('Nuevo pedido · #A-1091', 'New order · #A-1091'), sub: 'María López · $27.09', time: L('ahora', 'now'), unread: true },
      { icon: 'truck', bg: '#E3F5EA', c: '#1F8A4C', title: L('Sofía R. recogió #A-1082', 'Sofía R. picked up #A-1082'), sub: L('En camino · ETA 6 min', 'On the way · ETA 6 min'), time: '10 min', unread: true },
      { icon: 'star', bg: '#FEF3C7', c: '#9A6A12', title: L('Nueva reseña ★★★★★', 'New review ★★★★★'), sub: '“El mejor combo” — Miguel G.', time: '18 min', unread: true },
      { icon: 'dollar', bg: '#E3F5EA', c: '#1F8A4C', title: L('Depósito programado', 'Deposit scheduled'), sub: '$1,284.50 · vie 11 jul', time: '1 h', unread: false },
    ];
    const list = persistable ? (rows ?? []).map((r) => { const m = meta(r.kind); return { icon: m.icon, bg: m.bg, c: m.c, title: m.title, sub: JSON.stringify(r.data).slice(0, 60), time: ago(r.created_at), unread: !r.read }; }) : demo;
    if (persistable && list.length === 0) return <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9A96AE', font: "600 13px 'Plus Jakarta Sans'" }}>{L('Sin notificaciones', 'No notifications')}</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {list.map((n, i) => (
          <div key={i} style={{ display: 'flex', gap: 11, padding: '12px 0', borderBottom: '1px solid rgba(30,27,46,.06)' }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Ic n={n.icon} s={17} c={n.c} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 12.5px 'Plus Jakarta Sans'", color: INK }}>{n.title}</div><div style={{ font: "500 11px 'Plus Jakarta Sans'", color: '#8A86A0', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.sub}</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flex: 'none' }}><span style={{ font: "600 9.5px 'Plus Jakarta Sans'", color: '#B7B3C6' }}>{n.time}</span>{n.unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRI }} />}</div>
          </div>
        ))}
      </div>
    );
  }
}

const hdrBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: '50%', background: '#F1EFFA', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' };
const roundBtn: React.CSSProperties = { width: 38, height: 38, borderRadius: '50%', background: '#EFEBFF', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
function Card({ children }: { children: ReactNode }) { return <div style={{ background: '#fff', border: '1px solid rgba(30,27,46,.08)', borderRadius: 15, padding: 14, marginTop: 12 }}>{children}</div>; }
function CardTitle({ children }: { children: ReactNode }) { return <div style={{ font: "800 12.5px 'Plus Jakarta Sans'", color: INK, marginBottom: 11 }}>{children}</div>; }
function Overline({ children, mt }: { children: ReactNode; mt?: boolean }) { return <div style={{ font: "800 10px 'Plus Jakarta Sans'", color: '#A8A4B8', textTransform: 'uppercase', letterSpacing: '.06em', margin: mt ? '16px 0 9px' : '0 0 9px' }}>{children}</div>; }
function PayRow({ label, value, labelC = '#6E6A85', valueC = INK, weight = 600 }: { label: string; value: string; labelC?: string; valueC?: string; weight?: number }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ font: `${weight} 12px 'Plus Jakarta Sans'`, color: labelC }}>{label}</span><span style={{ font: `${weight} 12px 'Plus Jakarta Sans'`, color: valueC }}>{value}</span></div>;
}
