'use client';

// Renta / Rental module (business dashboard). Sub-tabs Artículos / Calendario /
// Depósitos / Daños / Precios. Tapping an item opens a detail page (rates
// hour/day/week + units + waiver). A "rentar" 3-step flow (renter → period/qty →
// review → success), a "return condition check" flow that computes a refund, and
// an "add item" 3-step wizard that appends to the list on success. Mobile-first:
// single column with a horizontal sub-tab bar; on desktop it expands to
// multi-column grids plus a sticky summary rail. Every drill-in (detail / rent-out
// / return / add-item) takes over the screen as a full ModulePage — no cramped
// bottom sheets. Real state: sub-tabs, selected item, wizard/flow steps, refund
// calc, toasts.

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Boxes, CalendarDays, Check, ChevronLeft, DollarSign, Minus,
  Pencil, Plus, Shield,
} from 'lucide-react';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { useBizAdmin } from '@/lib/bizAdmin';
import { supabase } from '@/lib/supabase';
import { formatPhone } from '@/lib/phone';
import { insertBizItem, listBizItems, type BizItemRow, type NewBizItem } from '@/lib/bizItems';

type Cat = 'space' | 'furniture' | 'tableware' | 'equipo';
type Period = 'hour' | 'day' | 'week';
type Condition = 'perfect' | 'minor' | 'major';
type Sub = 'items' | 'requests' | 'calendar' | 'deposits' | 'damage' | 'pricing';

// An incoming customer rental (business_rentals) — the other side of the
// consumer's "Rentar" action on a listing. customer_name is stored on insert.
type RentalReq = {
  id: string; customer_name: string | null; item_name: string; start_at: string;
  end_at: string | null; qty: number; total: number | null; deposit: number | null; status: string;
};
const REQ_STATUS: Record<string, { es: string; en: string; cls: string }> = {
  pending:   { es: 'Pendiente',  en: 'Pending',   cls: 'bg-amber-bg text-amber-ink' },
  confirmed: { es: 'Confirmada', en: 'Confirmed', cls: 'bg-green-bg text-green-dark' },
  out:       { es: 'En uso',     en: 'Out',       cls: 'bg-lilac text-primary-dark' },
  returned:  { es: 'Devuelto',   en: 'Returned',  cls: 'bg-lilac-2 text-ink-2' },
  cancelled: { es: 'Cancelado',  en: 'Cancelled', cls: 'bg-lilac-2 text-ink-2' },
};

type Item = {
  id: number; dbId?: string; es: string; en: string; cat: Cat; tile: string; booked: number;
  stock: number; out: number; unitEs: string; unitEn: string; dep: number;
  hour: number | null; day: number; week: number; availEs: string; availEn: string;
};

const RENTAL_CATS = new Set<Cat>(['space', 'furniture', 'tableware', 'equipo']);
// Map a business_items row (kind='rental') ↔ the module's bilingual Item.
function rowToRental(r: BizItemRow, idx: number): Item {
  const a = (r.attrs ?? {}) as Record<string, unknown>;
  const cat = (r.section as Cat) ?? 'equipo';
  const safeCat = RENTAL_CATS.has(cat) ? cat : 'equipo';
  return {
    id: idx + 1,
    dbId: r.id,
    es: r.name,
    en: String(a.nameEn ?? r.name),
    cat: safeCat,
    tile: String(a.tile ?? ''),
    booked: Number(a.booked ?? 0),
    stock: Number(a.stock ?? 0),
    out: Number(a.out ?? 0),
    unitEs: String(a.unitEs ?? r.unit ?? ''),
    unitEn: String(a.unitEn ?? ''),
    dep: Number(a.dep ?? 0),
    hour: a.hour != null ? Number(a.hour) : null,
    day: Number(a.day ?? r.price ?? 0),
    week: Number(a.week ?? 0),
    availEs: String(a.availEs ?? ''),
    availEn: String(a.availEn ?? ''),
  };
}
function rentalToRow(it: Item, businessId: string, sort: number): NewBizItem {
  return {
    business_id: businessId,
    kind: 'rental',
    name: it.es,
    description: null,
    price: it.day,
    unit: it.unitEs,
    section: it.cat,
    available: true,
    sort,
    image_url: null,
    attrs: { nameEn: it.en, unitEn: it.unitEn, tile: it.tile, booked: it.booked, stock: it.stock, out: it.out, dep: it.dep, hour: it.hour, day: it.day, week: it.week, availEs: it.availEs, availEn: it.availEn },
  };
}

const CAT_TILE: Record<Cat, string> = {
  space: '#EAE2F8 0 8px,#DCCEF2 8px 16px',
  furniture: '#F3E2CE 0 8px,#ECD3B4 8px 16px',
  tableware: '#FBEFD3 0 8px,#F5E1B0 8px 16px',
  equipo: '#EDE0D4 0 8px,#DFCBB6 8px 16px',
};

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';
const fieldCls =
  'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted-faint focus:border-primary';
const money = (n: number) => '$' + n.toLocaleString();

export function RentalModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  void tab;
  const { L, es, isFree, isPremium } = ctx;

  const catLabel = (c: Cat) =>
    ({ space: L('Espacio', 'Space'), furniture: L('Mobiliario', 'Furniture'), tableware: L('Vajilla', 'Tableware'), equipo: L('Equipo', 'Equipment') }[c]);

  const seed = useMemo<Item[]>(
    () => [
      { id: 1, es: 'Renta de espacio · medio día', en: 'Space rental · half-day', cat: 'space', tile: CAT_TILE.space, booked: 6, stock: 1, out: 1, unitEs: 'espacio', unitEn: 'space', dep: 80, hour: 60, day: 320, week: 1400, availEs: 'Lun–Mar 6–11 AM', availEn: 'Mon–Tue 6–11 AM' },
      { id: 2, es: 'Mesa larga · 8 lugares', en: 'Long table · 8 seats', cat: 'furniture', tile: CAT_TILE.furniture, booked: 2, stock: 4, out: 0, unitEs: 'mesa', unitEn: 'table', dep: 40, hour: null, day: 45, week: 180, availEs: 'Siempre', availEn: 'Always' },
      { id: 3, es: 'Vajilla de boda · 100', en: 'Wedding plate set · 100', cat: 'tableware', tile: CAT_TILE.tableware, booked: 1, stock: 2, out: 0, unitEs: 'juego', unitEn: 'set', dep: 250, hour: null, day: 180, week: 640, availEs: '48h aviso', availEn: '48h notice' },
      { id: 4, es: 'Máquina de espresso pro', en: 'Pro espresso machine', cat: 'equipo', tile: CAT_TILE.equipo, booked: 0, stock: 1, out: 0, unitEs: 'máquina', unitEn: 'machine', dep: 120, hour: null, day: 240, week: 960, availEs: 'Entre semana', availEn: 'Weekdays' },
      { id: 5, es: 'Carro de horno de leña', en: 'Wood-fired oven cart', cat: 'equipo', tile: '#FCE3DC 0 8px,#F6CEC2 8px 16px', booked: 1, stock: 1, out: 1, unitEs: 'carro', unitEn: 'cart', dep: 300, hour: null, day: 600, week: 2400, availEs: '48h aviso', availEn: '48h notice' },
      { id: 6, es: 'Recipientes de catering · 6', en: 'Catering chafing dishes · 6', cat: 'tableware', tile: '#E3F5EA 0 8px,#D6E7D0 8px 16px', booked: 3, stock: 5, out: 0, unitEs: 'juego', unitEn: 'set', dep: 95, hour: null, day: 95, week: 380, availEs: 'Siempre', availEn: 'Always' },
    ],
    [],
  );

  const [items, setItems] = useState<Item[]>(seed);
  const admin = useBizAdmin();
  const real = admin.active;
  const persistable = !admin.demo && !!real; // real signed-in business → persist

  // Load the real business's rental items (demo keeps the sample seed).
  useEffect(() => {
    if (!persistable || !real) {
      setItems(seed);
      return;
    }
    let cancelled = false;
    (async () => {
      const rows = await listBizItems(real.id, 'rental');
      if (!cancelled) setItems(rows.map(rowToRental));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  const persistNewRental = async (it: Item) => {
    if (!persistable || !real) return;
    const dbId = await insertBizItem(rentalToRow(it, real.id, items.length));
    if (dbId) setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, dbId } : x)));
  };
  const [sub, setSub] = useState<Sub>('items');
  const [openId, setOpenId] = useState<number | null>(null);
  const [flow, setFlow] = useState<null | 'rentout' | 'return' | 'wizard'>(null);
  const [toast, setToast] = useState('');

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };

  // Incoming customer rental requests (business_rentals). Real owner → load their
  // rows; demo keeps a small sample so the tab is never empty in the prototype.
  const [reqRows, setReqRows] = useState<RentalReq[] | null>(null);
  useEffect(() => {
    if (!persistable || !real || !supabase) { setReqRows(null); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!
        .from('business_rentals')
        .select('id,customer_name,item_name,start_at,end_at,qty,total,deposit,status')
        .eq('business_id', real.id)
        .order('start_at', { ascending: false });
      if (cancelled) return;
      setReqRows(error || !Array.isArray(data) ? [] : (data as unknown as RentalReq[]));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  const setReqStatus = async (id: string, status: string) => {
    setReqRows((rows) => (rows ? rows.map((r) => (r.id === id ? { ...r, status } : r)) : rows));
    if (persistable && supabase) await supabase.from('business_rentals').update({ status }).eq('id', id);
    flash(L('Renta actualizada', 'Rental updated'));
  };

  const selected = items.find((i) => i.id === openId) ?? null;

  // ---- Free gate ----
  if (isFree) {
    return (
      <div className="pb-8">
        <div className={`${cardCls} flex flex-col items-center gap-3 p-8 text-center`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-btn-lg bg-lilac-2">
            <Boxes size={22} strokeWidth={2.2} className="text-primary-dark" />
          </span>
          <div className="text-[15px] font-extrabold text-ink">{L('La renta es parte del kit verificado', 'Rentals are part of the verified toolkit')}</div>
          <div className="max-w-[420px] text-[12.5px] font-semibold leading-relaxed text-muted">
            {L('Publica artículos para rentar por hora, día o semana — con depósitos, calendario y control de daños. Verifica tu negocio para activarlo.', 'List items to rent by hour, day or week — with deposits, a calendar and damage tracking. Verify your business to turn it on.')}
          </div>
          <button onClick={() => ctx.go('billing')} className="mt-1 cursor-pointer rounded-btn bg-primary px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm">
            {L('Iniciar verificación', 'Start verification')}
          </button>
        </div>
      </div>
    );
  }

  const kpis = [
    { Icon: Boxes, c: '#6D4DF6', bg: '#EFEBFF', label: L('Artículos', 'Items'), value: String(items.length), delta: L('6 categorías', '6 categories'), dC: 'text-muted-2' },
    { Icon: CalendarDays, c: '#D6336C', bg: '#FDE7EF', label: L('Rentados/mes', 'Rented/mo'), value: '38', delta: '▲ 22%', dC: 'text-green' },
    { Icon: DollarSign, c: '#1F8A4C', bg: '#E3F5EA', label: L('Ingresos 30d', 'Revenue 30d'), value: '$4,820', delta: '▲ 28%', dC: 'text-green' },
    { Icon: AlertTriangle, c: '#9A6A12', bg: '#FCEFD6', label: L('Depósitos', 'Deposits'), value: '$1,840', delta: L('6 activos', '6 active'), dC: 'text-muted-2' },
  ];

  const subTabs: [Sub, string][] = [
    ['items', L('Artículos', 'Items')],
    ['requests', L('Solicitudes', 'Requests')],
    ['calendar', L('Calendario', 'Calendar')],
    ['deposits', L('Depósitos', 'Deposits')],
    ['damage', L('Daños', 'Damage')],
    ['pricing', L('Precios', 'Pricing')],
  ];

  const availOf = (it: Item) => it.stock - it.out;
  const statusOf = (it: Item) => {
    const a = availOf(it);
    return a <= 0
      ? { cls: 'bg-pink-bg text-pink-dark', dot: '#D6336C', label: L('Reservado', 'Booked') }
      : a <= 1
        ? { cls: 'bg-amber-bg text-amber-ink', dot: '#9A6A12', label: L('Limitado', 'Limited') }
        : { cls: 'bg-green-bg text-green-dark', dot: '#1F8A4C', label: L('Disponible', 'Available') };
  };

  const chip = (on: boolean) =>
    `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12.5px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;

  // ===== ITEMS =====
  const itemsPane = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className={`${cardCls} p-3.5`}>
              <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: k.bg }}>
                <k.Icon size={15} strokeWidth={2.2} style={{ color: k.c }} />
              </span>
              <div className="mt-2 text-[11px] font-bold text-muted">{k.label}</div>
              <div className="mt-0.5 text-[19px] font-extrabold text-ink">{k.value}</div>
              <div className={`text-[10px] font-extrabold ${k.dC}`}>{k.delta}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
          {items.map((it) => {
            const s = statusOf(it);
            return (
              <button
                key={it.id}
                onClick={() => { setOpenId(it.id); setFlow(null); }}
                className={`${cardCls} flex cursor-pointer gap-3 p-3 text-left transition-shadow hover:shadow-card-lg`}
              >
                <span className="h-[62px] w-[62px] flex-none rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${it.tile})` }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-extrabold leading-tight text-ink">{L(it.es, it.en)}</span>
                    <span className="whitespace-nowrap text-[12.5px] font-extrabold text-ink">{money(it.day)}/{L('día', 'day')}</span>
                  </span>
                  <span className="mt-1 block text-[10px] font-medium text-muted-2">
                    {L(it.availEs, it.availEn)} · {availOf(it)}/{it.stock} {L(it.unitEs, it.unitEn)}{it.stock > 1 ? 's' : ''}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-lilac-2 px-2 py-0.5 text-[9.5px] font-bold text-ink-2">{catLabel(it.cat)}</span>
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9.5px] font-extrabold ${s.cls}`}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />{s.label}
                    </span>
                    <span className="text-[9.5px] font-semibold text-muted-2">{it.booked}× {L('este mes', 'this month')}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* desktop sticky rail */}
      <div className="hidden flex-col gap-4 xl:sticky xl:top-[74px] xl:flex">
        <div className={`${cardCls} p-4`}>
          <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Disponibilidad', 'Availability')}</div>
          {[
            { l: L('Unidades libres', 'Units free'), v: items.reduce((a, it) => a + availOf(it), 0), c: 'text-green' },
            { l: L('Unidades rentadas', 'Units out'), v: items.reduce((a, it) => a + it.out, 0), c: 'text-pink-dark' },
            { l: L('Rentas este mes', 'Rentals this month'), v: items.reduce((a, it) => a + it.booked, 0), c: 'text-ink' },
          ].map((r) => (
            <div key={r.l} className="flex items-center justify-between border-b border-hair py-2 last:border-0">
              <span className="text-[11.5px] font-semibold text-muted">{r.l}</span>
              <span className={`text-[15px] font-extrabold ${r.c}`}>{r.v}</span>
            </div>
          ))}
        </div>
        <div className={`${cardCls} p-4`}>
          <div className="mb-2 text-[13px] font-extrabold text-ink">{L('Más rentados', 'Most rented')}</div>
          <div className="flex flex-col gap-2.5">
            {[...items].sort((a, b) => b.booked - a.booked).slice(0, 3).map((it) => (
              <div key={it.id} className="flex items-center gap-2.5">
                <span className="h-8 w-8 flex-none rounded-[9px]" style={{ background: `repeating-linear-gradient(135deg,${it.tile})` }} />
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-extrabold text-ink">{L(it.es, it.en)}</span>
                <span className="text-[11px] font-extrabold text-primary-dark">{it.booked}×</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => setFlow('wizard')} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm">
          <Plus size={16} strokeWidth={2.6} />{L('Agregar artículo', 'Add rental item')}
        </button>
      </div>
    </div>
  );

  // ===== REQUESTS (incoming customer rentals) =====
  const reqSeed: RentalReq[] = [
    { id: 's1', customer_name: 'Mariana Vélez', item_name: L('Vajilla de fiesta · 100', 'Party tableware · 100'), start_at: '2026-07-12T15:00:00Z', end_at: '2026-07-13T15:00:00Z', qty: 1, total: 320, deposit: 200, status: 'pending' },
    { id: 's2', customer_name: 'Coffee Mfg.', item_name: L('Bocina y micrófono', 'Speaker & microphone'), start_at: '2026-07-17T18:00:00Z', end_at: '2026-07-17T23:00:00Z', qty: 1, total: 170, deposit: 80, status: 'confirmed' },
  ];
  const reqList = reqRows ?? reqSeed;
  const fmtReqDate = (iso: string) => new Date(iso).toLocaleDateString(es ? 'es-US' : 'en-US', { day: 'numeric', month: 'short' });
  const requestsPane = (
    <div className="flex flex-col gap-3">
      <div className="text-[11.5px] font-medium leading-relaxed text-muted">
        {L('Solicitudes de renta de tus clientes. Confirma para reservar el artículo y retener el depósito.', 'Rental requests from your customers. Confirm to reserve the item and hold the deposit.')}
      </div>
      {reqList.length === 0 ? (
        <div className={`${cardCls} p-6 text-center text-[12.5px] font-semibold text-muted`}>{L('Sin solicitudes por ahora.', 'No requests yet.')}</div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {reqList.map((r) => {
            const st = REQ_STATUS[r.status] ?? REQ_STATUS.pending;
            return (
              <div key={r.id} className={`${cardCls} p-3.5`}>
                <div className="flex items-start gap-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-extrabold text-ink">{r.customer_name || L('Cliente', 'Customer')}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-semibold text-muted-2">{r.item_name}</span>
                  </span>
                  <span className={`flex-none rounded-md px-2 py-1 text-[9px] font-extrabold ${st.cls}`}>{L(st.es, st.en)}</span>
                </div>
                <div className="mt-2.5 flex items-center gap-2 border-t border-hair pt-2.5 text-[10.5px] font-semibold text-muted-2">
                  <span className="min-w-0 truncate">{r.qty}× · {fmtReqDate(r.start_at)}{r.end_at ? ` – ${fmtReqDate(r.end_at)}` : ''}</span>
                  <span className="ml-auto flex-none text-[12px] font-extrabold text-ink">{r.total != null ? money(Number(r.total)) : '—'}</span>
                </div>
                {r.deposit != null && Number(r.deposit) > 0 && (
                  <div className="mt-1 text-[10px] font-semibold text-muted-2">{L('Depósito', 'Deposit')} {money(Number(r.deposit))}</div>
                )}
                {(r.status === 'pending' || r.status === 'confirmed' || r.status === 'out') && (
                  <div className="mt-2.5 flex gap-2">
                    {r.status === 'pending' && (
                      <button onClick={() => setReqStatus(r.id, 'confirmed')} className="flex-1 cursor-pointer rounded-field bg-primary py-2 text-[11px] font-extrabold text-white shadow-cta-sm">{L('Confirmar', 'Confirm')}</button>
                    )}
                    {r.status === 'confirmed' && (
                      <button onClick={() => setReqStatus(r.id, 'out')} className="flex-1 cursor-pointer rounded-field bg-primary py-2 text-[11px] font-extrabold text-white shadow-cta-sm">{L('Entregar', 'Hand out')}</button>
                    )}
                    {r.status === 'out' && (
                      <button onClick={() => setReqStatus(r.id, 'returned')} className="flex-1 cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white py-2 text-[11px] font-extrabold text-ink">{L('Marcar devuelto', 'Mark returned')}</button>
                    )}
                    {r.status === 'pending' && (
                      <button onClick={() => setReqStatus(r.id, 'cancelled')} className="flex-none cursor-pointer rounded-field bg-lilac-2 px-3 py-2 text-[11px] font-extrabold text-ink-2">{L('Rechazar', 'Decline')}</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ===== CALENDAR =====
  const dows = es ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const evDays: Record<number, string[]> = { 8: ['#7B61FF'], 15: ['#7B61FF'], 17: ['#1F9D57'], 19: ['#D6336C'], 22: ['#1F9D57'], 27: ['#F4B740', '#D6336C'] };
  const upcoming = [
    { mon: 'OCT', day: '15', name: 'Mariana V.', es: 'Vajilla de boda · 100 · sáb', en: 'Wedding plates · 100 · Sat', tag: 'warn' as const, online: true },
    { mon: 'OCT', day: '17', name: 'Coffee Mfg.', es: 'Máquina espresso · demo 1 día', en: 'Espresso machine · 1-day demo', tag: 'success' as const, online: false },
    { mon: 'OCT', day: '19', name: 'Park Studios', es: 'Espacio foto · 6–11 AM', en: 'Photo space · 6–11 AM', tag: 'coral' as const, online: false },
    { mon: 'OCT', day: '27', name: 'Mission Tech', es: 'Carro de horno · fiesta', en: 'Oven cart · party', tag: 'warn' as const, online: false },
  ];
  const dtCls: Record<'warn' | 'success' | 'coral', string> = { warn: 'bg-amber-bg text-amber-ink', success: 'bg-green-bg text-green-dark', coral: 'bg-pink-bg text-pink-dark' };

  const calendarPane = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1.3fr_1fr]">
      <div className={`${cardCls} p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-extrabold text-ink">{L('Octubre', 'October')} 2025</span>
          <span className="text-[11px] font-bold text-muted-2">{L('Hoy · 14', 'Today · 14')}</span>
        </div>
        <div className="mb-1.5 grid grid-cols-7 gap-1">
          {dows.map((d, i) => <span key={i} className="text-center text-[9px] font-extrabold text-muted-faint">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }, (_, i) => {
            const dn = i - 1, visible = dn >= 0 && dn < 31, day = dn + 1, isToday = day === 14;
            const dots = visible ? evDays[day] ?? [] : [];
            return (
              <div key={i} className={`flex aspect-square flex-col items-center justify-center rounded-lg text-[11px] font-extrabold ${isToday ? 'bg-lilac text-primary-dark' : visible ? 'bg-app text-ink' : 'text-transparent'}`}>
                <span>{visible ? day : ''}</span>
                <span className="mt-0.5 flex h-1 gap-0.5">
                  {dots.map((c, j) => <span key={j} className="h-1 w-1 rounded-full" style={{ background: c }} />)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="mb-2 px-0.5 text-[12px] font-extrabold text-ink">{L('Rentas próximas', 'Upcoming rentals')}</div>
        <div className="flex flex-col gap-2.5">
          {upcoming.map((u, i) => (
            <div key={i} className={`${cardCls} flex items-center gap-3 p-3`}>
              <span className={`flex-none rounded-[10px] px-2 py-1.5 text-center ${dtCls[u.tag]}`}>
                <span className="block text-[8px] font-bold leading-none">{u.mon}</span>
                <span className="block text-[14px] font-extrabold leading-tight">{u.day}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-[12px] font-extrabold text-ink">{u.name}</span>
                  {u.online && <span className="rounded bg-pink-bg px-1.5 py-px text-[8px] font-extrabold text-pink-dark">{L('Nuevo', 'New')}</span>}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-medium text-muted-2">{L(u.es, u.en)}</span>
              </span>
              <span className={`flex-none self-center rounded-md px-2 py-1 text-[9px] font-extrabold ${u.online ? 'bg-amber-bg text-amber-ink' : 'bg-green-bg text-green-dark'}`}>
                {u.online ? L('Confirmar', 'Confirm') : L('$ retenido', '$ held')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ===== DEPOSITS =====
  const deposits = [
    { initials: 'MV', color: '#7B61FF', name: 'Mariana V.', es: 'Vajilla de boda · 100', en: 'Wedding plates · 100', amount: '$250', held: true },
    { initials: 'CM', color: '#1F9D57', name: 'Coffee Mfg.', es: 'Máquina de espresso', en: 'Espresso machine', amount: '$120', held: true },
    { initials: 'PS', color: '#E8954A', name: 'Park Studios', es: 'Espacio de foto', en: 'Photo space', amount: '$80', held: true },
    { initials: 'JT', color: '#2A5C8A', name: 'James T.', es: 'Mesa larga · devuelto', en: 'Long table · returned', amount: '$40', held: false },
  ];
  const depositsPane = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:max-w-md">
        <div className={`${cardCls} p-3.5`}>
          <div className="text-[10px] font-bold text-muted">{L('Retenido', 'Held now')}</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-ink">$1,840</div>
          <div className="text-[9.5px] font-extrabold text-muted-2">6 {L('activos', 'active')}</div>
        </div>
        <div className={`${cardCls} p-3.5`}>
          <div className="text-[10px] font-bold text-muted">{L('Devuelto 30d', 'Refunded 30d')}</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-ink">$3,420</div>
          <div className="text-[9.5px] font-extrabold text-green">18 {L('devoluciones', 'returns')}</div>
        </div>
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {deposits.map((d) => (
          <div key={d.name + d.amount} className={`${cardCls} flex items-center gap-3 p-3`}>
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: d.color }}>{d.initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-extrabold text-ink">{d.name}</span>
              <span className="block truncate text-[10px] font-medium text-muted-2">{L(d.es, d.en)}</span>
            </span>
            <span className="flex-none text-right">
              <span className="block text-[13px] font-extrabold text-ink">{d.amount}</span>
              <span className={`mt-0.5 inline-block rounded px-1.5 py-px text-[8.5px] font-extrabold ${d.held ? 'bg-amber-bg text-amber-ink' : 'bg-green-bg text-green-dark'}`}>
                {d.held ? L('Retenido', 'Held') : L('Devuelto', 'Refunded')}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // ===== DAMAGE =====
  const damage = [
    { es: 'Carro de horno de leña', en: 'Wood-fired oven cart', renter: 'Mission Tech', date: '27 Oct', sev: 'minor' as const, noteEs: 'Rayón en la puerta. Funcional, estético menor.', noteEn: 'Scratch on the door. Functional, minor cosmetic.', charge: '$45', tile: '#FCE3DC 0 8px,#F6CEC2 8px 16px' },
    { es: 'Vajilla de boda · 100', en: 'Wedding plates · 100', renter: 'Mariana V.', date: '12 Oct', sev: 'major' as const, noteEs: '3 platos rotos de 100. Reemplazo necesario.', noteEn: '3 plates broken of 100. Replacement needed.', charge: '$90', tile: '#FBEFD3 0 8px,#F5E1B0 8px 16px' },
  ];
  const sevMeta: Record<'minor' | 'major', { cls: string; border: string; label: string }> = {
    minor: { cls: 'bg-amber-bg text-amber-ink', border: 'border-amber/40', label: L('Menor', 'Minor') },
    major: { cls: 'bg-pink-bg text-pink-dark', border: 'border-pink/40', label: L('Mayor', 'Major') },
  };
  const damagePane = (
    <div className="flex flex-col gap-3">
      <div className="text-[11.5px] font-medium leading-relaxed text-muted">{L('Reporta daños al devolver. Deduce del depósito si aplica.', 'Report damage on return. Deduct from deposit if needed.')}</div>
      <div className="grid gap-3 md:grid-cols-2">
        {damage.map((r) => {
          const m = sevMeta[r.sev];
          return (
            <div key={r.es} className={`rounded-card-sm border ${m.border} bg-white p-3 shadow-card`}>
              <div className="flex items-center gap-3">
                <span className="h-11 w-11 flex-none rounded-[11px]" style={{ background: `repeating-linear-gradient(135deg,${r.tile})` }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-extrabold text-ink">{L(r.es, r.en)}</span>
                  <span className="block text-[10px] font-medium text-muted-2">{r.renter} · {r.date}</span>
                </span>
                <span className={`flex-none rounded-md px-2 py-1 text-[9px] font-extrabold ${m.cls}`}>{m.label}</span>
              </div>
              <div className="mt-2.5 border-t border-hair pt-2.5 text-[11px] font-medium leading-relaxed text-ink-3">{L(r.noteEs, r.noteEn)}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-muted-2">{L('Deducir del depósito', 'Deduct from deposit')}</span>
                <span className="text-[12px] font-extrabold text-pink-dark">−{r.charge}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ===== PRICING =====
  const pricingPane = (
    <div className="flex flex-col gap-3">
      <div className="text-[11.5px] font-medium leading-relaxed text-muted">{L('Tarifas por hora, día y semana, más depósito por artículo.', 'Hourly, daily and weekly rates, plus deposit per item.')}</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => (
          <div key={it.id} className={`${cardCls} p-3`}>
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="h-9 w-9 flex-none rounded-[10px]" style={{ background: `repeating-linear-gradient(135deg,${it.tile})` }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-extrabold text-ink">{L(it.es, it.en)}</span>
                <span className="block text-[9.5px] font-semibold text-muted-2">{L('Depósito', 'Deposit')} {money(it.dep)}</span>
              </span>
            </div>
            <div className="flex gap-1.5">
              {[
                { l: L('Hora', 'Hour'), v: it.hour, on: it.hour != null },
                { l: L('Día', 'Day'), v: it.day, on: true },
                { l: L('Semana', 'Week'), v: it.week, on: true },
              ].map((r) => (
                <div key={r.l} className={`flex-1 rounded-[9px] py-2 text-center ${r.on ? 'bg-app' : 'bg-lilac-3'}`}>
                  <div className="text-[8.5px] font-semibold text-muted-2">{r.l}</div>
                  <div className={`mt-0.5 text-[12px] font-extrabold ${r.on ? 'text-ink' : 'text-muted-faint'}`}>{r.v != null ? money(r.v) : '—'}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ---- Drill-in pages take over the screen as full ModulePages (no cramped popups) ----
  if (selected && flow === null) {
    return (
      <>
        <ItemDetail
          item={selected}
          ctx={ctx}
          catLabel={catLabel}
          statusOf={statusOf}
          onClose={() => setOpenId(null)}
          onEdit={() => flash(L('Edición próximamente', 'Editing coming soon'))}
          onRentOut={() => setFlow('rentout')}
          onReturn={() => setFlow('return')}
        />
        <Toast msg={toast} />
      </>
    );
  }

  if (selected && flow === 'rentout') {
    return (
      <>
        <RentOutFlow
          item={selected}
          ctx={ctx}
          onBackToDetail={() => setFlow(null)}
          onDone={() => { setFlow(null); setOpenId(null); flash(L('Rentado · depósito cobrado', 'Rented · deposit charged')); }}
        />
        <Toast msg={toast} />
      </>
    );
  }

  if (selected && flow === 'return') {
    return (
      <>
        <ReturnFlow
          item={selected}
          ctx={ctx}
          onClose={() => setFlow(null)}
          onDone={() => { setFlow(null); setOpenId(null); flash(L('Depósito devuelto', 'Deposit refunded')); }}
        />
        <Toast msg={toast} />
      </>
    );
  }

  if (flow === 'wizard') {
    return (
      <>
        <AddItemWizard
          ctx={ctx}
          catLabel={catLabel}
          onClose={() => setFlow(null)}
          onDone={(it) => {
            const withId = { ...it, id: Math.max(0, ...items.map((p) => p.id)) + 1 };
            setItems((prev) => [withId, ...prev]);
            persistNewRental(withId);
            setFlow(null); setSub('items');
            flash(L('Artículo agregado', 'Item added'));
          }}
        />
        <Toast msg={toast} />
      </>
    );
  }

  return (
    <div className="relative pb-8">
      {/* sub-tabs + add */}
      <div className="mb-4 flex items-center gap-3">
        <div className="no-scrollbar -mx-1 flex flex-1 gap-2 min-w-0 overflow-x-auto px-1">
          {subTabs.map(([k, label]) => (
            <button key={k} onClick={() => setSub(k)} className={chip(sub === k)}>{label}</button>
          ))}
        </div>
        <button onClick={() => setFlow('wizard')} className="hidden flex-none cursor-pointer items-center gap-1.5 rounded-btn bg-primary px-3.5 py-2.5 text-[12px] font-extrabold text-white shadow-cta-sm md:flex xl:hidden">
          <Plus size={15} strokeWidth={2.6} />{L('Agregar', 'Add')}
        </button>
      </div>

      {sub === 'items' && itemsPane}
      {sub === 'requests' && requestsPane}
      {sub === 'calendar' && calendarPane}
      {sub === 'deposits' && depositsPane}
      {sub === 'damage' && damagePane}
      {sub === 'pricing' && pricingPane}

      {/* mobile add button (all sub-tabs) */}
      <button onClick={() => setFlow('wizard')} className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm md:hidden">
        <Plus size={16} strokeWidth={2.6} />{L('Agregar artículo', 'Add rental item')}
      </button>

      {/* premium teaser */}
      {!isPremium && sub === 'items' && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card-sm p-4 text-white shadow-band" style={{ background: 'linear-gradient(140deg,#1E1B2E,#3A2E6E)' }}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-[rgba(244,183,64,.2)] text-[18px]">✦</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-extrabold">{L('Renta con seguro y verificación de ID', 'Rentals with insurance & ID checks')}</span>
            <span className="mt-0.5 block text-[11.5px] font-semibold leading-snug text-[rgba(255,255,255,.7)]">{L('Cobros de depósito automáticos y verificación del cliente con Premium.', 'Automatic deposit holds and renter verification with Premium.')}</span>
          </span>
          <button onClick={() => ctx.go('billing')} className="flex-none cursor-pointer rounded-btn bg-amber px-4 py-2.5 text-[12px] font-extrabold text-ink">{L('Mejorar', 'Upgrade')}</button>
        </div>
      )}

      <Toast msg={toast} />
    </div>
  );
}

// ---------- Item detail page ----------
function ItemDetail({
  item, ctx, catLabel, statusOf, onClose, onEdit, onRentOut, onReturn,
}: {
  item: Item; ctx: PanelCtx; catLabel: (c: Cat) => string;
  statusOf: (it: Item) => { cls: string; dot: string; label: string };
  onClose: () => void; onEdit: () => void; onRentOut: () => void; onReturn: () => void;
}) {
  const { L } = ctx;
  const s = statusOf(item);
  const [waivers, setWaivers] = useState<boolean[]>([true, true, true, false]);
  const waiverDefs = [
    L('Exención de responsabilidad', 'Liability waiver'),
    L('Depósito reembolsable', 'Refundable deposit'),
    L('Cargo por retraso · $50/h', 'Late fee · $50/hr'),
    L('Verificación de seguro', 'Insurance verification'),
  ];
  const rates = [
    { l: L('Hora', 'Hour'), v: item.hour },
    { l: L('Día', 'Day'), v: item.day },
    { l: L('Semana', 'Week'), v: item.week },
  ];

  return (
    <ModulePage
      title={L(item.es, item.en)}
      subtitle={`${catLabel(item.cat)} · ${L(item.availEs, item.availEn)}`}
      onBack={onClose}
      action={<span className={`rounded-md px-2 py-1 text-[9px] font-extrabold ${s.cls}`}>{s.label}</span>}
      footer={
        <div className="flex gap-2.5">
          <button onClick={onEdit} className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-btn bg-lilac-2" aria-label={L('Editar', 'Edit')}>
            <Pencil size={16} strokeWidth={2} className="text-primary-dark" />
          </button>
          <button onClick={onRentOut} className="flex-1 cursor-pointer rounded-btn bg-primary py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm">{L('Rentar', 'Rent out')}</button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-card-sm border border-hair">
          <div className="relative h-[110px]" style={{ background: `repeating-linear-gradient(135deg,${item.tile})` }}>
            <span className={`absolute right-2.5 top-2.5 rounded-md px-2 py-1 text-[9px] font-extrabold ${s.cls}`}>{s.label}</span>
          </div>
          <div className="p-3.5">
            <div className="text-[11px] font-semibold text-muted-2">{catLabel(item.cat)} · {L(item.availEs, item.availEn)}</div>
            <div className="mt-2.5 flex gap-1.5">
              {rates.map((r) => (
                <div key={r.l} className="flex-1 rounded-[10px] bg-app py-2.5 text-center">
                  <div className="text-[14px] font-extrabold text-ink">{r.v != null ? money(r.v) : '—'}</div>
                  <div className="mt-0.5 text-[8.5px] font-semibold text-muted-2">{r.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-[12px] font-extrabold text-ink">{L('Unidades', 'Units')} · {item.stock}</div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: item.stock }, (_, i) => {
              const out = i < item.out;
              const unit = L(item.unitEs, item.unitEn);
              return (
                <div key={i} className={`${cardCls} flex items-center gap-3 p-2.5`}>
                  <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-[11px] font-extrabold ${out ? 'bg-pink-bg text-pink-dark' : 'bg-green-bg text-green-dark'}`}>#{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-extrabold capitalize text-ink">{unit} {i + 1}</span>
                    <span className="block text-[10px] font-medium text-muted-2">{out ? L('Rentado · regresa 19 Oct', 'Rented · back Oct 19') : L('Disponible ahora', 'Available now')}</span>
                  </span>
                  {out ? (
                    <button onClick={onReturn} className="flex-none cursor-pointer rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-1.5 text-[10.5px] font-extrabold text-ink">{L('Devolver', 'Return')}</button>
                  ) : (
                    <span className="flex-none rounded-md bg-green-bg px-2 py-1 text-[9px] font-extrabold text-green-dark">{L('Libre', 'Free')}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[12px] font-extrabold text-ink">{L('Exención y políticas', 'Waiver & policies')}</div>
          <div className={`${cardCls} px-3.5`}>
            {waiverDefs.map((w, i) => (
              <div key={w} className="flex items-center justify-between gap-3 border-b border-hair py-3 last:border-0">
                <span className="text-[12px] font-semibold text-ink">{w}</span>
                <Toggle on={waivers[i]} onClick={() => setWaivers((prev) => prev.map((v, j) => (j === i ? !v : v)))} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModulePage>
  );
}

// ---------- Rent-out 3-step flow ----------
function RentOutFlow({ item, ctx, onBackToDetail, onDone }: {
  item: Item; ctx: PanelCtx; onBackToDetail: () => void; onDone: () => void;
}) {
  const { L } = ctx;
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [waiver, setWaiver] = useState(true);
  const [period, setPeriod] = useState<Period>('day');
  const [qty, setQty] = useState(1);
  const [start, setStart] = useState('');

  const rate = (period === 'hour' ? item.hour : period === 'week' ? item.week : item.day) ?? item.day;
  const fee = rate * qty;
  const total = fee + item.dep;
  const periodLabel = { hour: L('Hora', 'Hour'), day: L('Día', 'Day'), week: L('Semana', 'Week') }[period];

  const steps = [L('Cliente', 'Renter'), L('Periodo', 'Period'), L('Confirmar', 'Confirm')];
  const canNext = step === 0 ? name.trim().length > 0 : true;

  if (done) {
    return (
      <SuccessSheet
        ctx={ctx}
        title={L('¡Rentado!', 'Rented!')}
        sub={L('Se cobró el depósito y el artículo quedó marcado como rentado.', 'Deposit charged and the item is marked as rented.')}
        onClose={onDone}
      />
    );
  }

  const next = () => { if (step >= 2) { setDone(true); return; } setStep((s) => s + 1); };
  const back = () => { if (step === 0) { onBackToDetail(); return; } setStep((s) => s - 1); };

  return (
    <ModulePage
      title={L('Rentar artículo', 'Rent out')}
      subtitle={`${L('Paso', 'Step')} ${step + 1}/3`}
      onBack={back}
      backLabel={step === 0 ? L('Cancelar', 'Cancel') : L('Atrás', 'Back')}
      footer={
        <div className="flex items-center gap-3">
          <button onClick={back} aria-label={L('Atrás', 'Back')} className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-btn bg-lilac-2">
            <ChevronLeft size={18} strokeWidth={2.4} className="text-ink" />
          </button>
          <span className="flex-1 text-center text-[11px] font-semibold text-muted-2">{`${L('Paso', 'Step')} ${step + 1} ${L('de 3', 'of 3')}`}</span>
          <button
            onClick={next}
            disabled={!canNext}
            className={`flex-1 rounded-btn py-3 text-[13px] font-extrabold text-white ${!canNext ? 'cursor-not-allowed bg-lilac-line' : 'cursor-pointer bg-primary shadow-cta-sm'}`}
          >
            {step >= 2 ? L('Cobrar y rentar', 'Charge & rent') : L('Continuar', 'Continue')}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <StepBar steps={steps} step={step} onGo={(i) => i <= step && setStep(i)} />
        <ItemStrip item={item} ctx={ctx} right={`${money(item.day)}/${L('día', 'day')} · ${L('Depósito', 'Deposit')} ${money(item.dep)}`} />

        <div className={`${cardCls} flex flex-col gap-3.5 p-4`}>
          <div className="text-[13.5px] font-extrabold text-ink">{[L('Datos del cliente', 'Renter details'), L('Periodo y cantidad', 'Period & quantity'), L('Confirmar renta', 'Confirm rental')][step]}</div>

          {step === 0 && (
            <>
              <Field label={`${L('Nombre del cliente', 'Renter name')} *`}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('Ej. Mariana Vélez', 'e.g. Mariana Velez')} className={fieldCls} />
              </Field>
              <Field label={L('Teléfono', 'Phone')}>
                <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(415) 555-0148" className={fieldCls} inputMode="tel" autoComplete="tel" />
              </Field>
              <div className="flex items-center gap-3 rounded-field border border-hair bg-app p-3">
                <Shield size={17} strokeWidth={2} className="flex-none text-primary-dark" />
                <span className="flex-1 text-[11px] font-semibold leading-snug text-ink-soft">{L('Exención de responsabilidad firmada', 'Liability waiver signed')}</span>
                <Toggle on={waiver} onClick={() => setWaiver((v) => !v)} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Field label={L('Periodo de renta', 'Rental period')}>
                <div className="flex gap-1.5">
                  {(['hour', 'day', 'week'] as Period[]).map((p) => (
                    <button key={p} onClick={() => setPeriod(p)} className={`flex-1 rounded-[9px] py-2 text-[11.5px] font-extrabold ${period === p ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'}`}>
                      {{ hour: L('Hora', 'Hour'), day: L('Día', 'Day'), week: L('Semana', 'Week') }[p]}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="flex gap-3">
                <Field label={L('Cantidad', 'Quantity')} className="flex-1">
                  <div className="flex items-center overflow-hidden rounded-field border-[1.5px] border-lilac-line">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-[42px] w-10 items-center justify-center bg-app text-ink-2"><Minus size={15} strokeWidth={2.6} /></button>
                    <span className="flex-1 text-center text-[14px] font-extrabold text-ink">{qty}</span>
                    <button onClick={() => setQty((q) => Math.min(item.stock, q + 1))} className="flex h-[42px] w-10 items-center justify-center bg-app text-ink-2"><Plus size={15} strokeWidth={2.6} /></button>
                  </div>
                </Field>
                <Field label={L('Fecha inicio', 'Start date')} className="flex-1">
                  <input value={start} onChange={(e) => setStart(e.target.value)} placeholder="15 Oct" className={fieldCls} />
                </Field>
              </div>
              <div className="rounded-field bg-lilac-2 p-3.5">
                <Line l={L('Tarifa de renta', 'Rental fee')} v={money(fee)} />
                <Line l={L('Depósito', 'Deposit')} v={money(item.dep)} />
                <div className="mt-2 flex items-center justify-between border-t border-lilac-line pt-2">
                  <span className="text-[12px] font-extrabold text-ink">{L('Total a cobrar', 'Total due')}</span>
                  <span className="text-[15px] font-extrabold text-primary-dark">{money(total)}</span>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-3 rounded-field border border-green/40 bg-green-bg p-3">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-white text-green-dark"><Check size={16} strokeWidth={3} /></span>
                <span className="flex-1">
                  <span className="block text-[12px] font-extrabold text-green-dark">{L('Listo para rentar', 'Ready to rent')}</span>
                  <span className="block text-[10.5px] font-semibold leading-snug text-green-dark/80">{L('Se cobra el depósito y se marca como rentado.', 'Deposit is charged and item marked rented.')}</span>
                </span>
              </div>
              <div className="overflow-hidden rounded-field border border-hair">
                {[
                  [L('Cliente', 'Renter'), name || '—'],
                  [L('Artículo', 'Item'), L(item.es, item.en)],
                  [L('Periodo', 'Period'), `${qty} × ${periodLabel}`],
                  [L('Total', 'Total'), money(total)],
                ].map(([k, v], i, a) => (
                  <div key={k} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}>
                    <span className="w-[80px] flex-none text-[10.5px] font-semibold text-muted-2">{k}</span>
                    <span className="min-w-0 flex-1 text-[11.5px] font-extrabold text-ink">{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </ModulePage>
  );
}

// ---------- Return / condition-check flow ----------
function ReturnFlow({ item, ctx, onClose, onDone }: { item: Item; ctx: PanelCtx; onClose: () => void; onDone: () => void }) {
  const { L } = ctx;
  const [condition, setCondition] = useState<Condition>('perfect');
  const [done, setDone] = useState(false);

  const deduction = condition === 'minor' ? 45 : condition === 'major' ? item.dep : 0;
  const refund = Math.max(0, item.dep - deduction);

  const conds: { key: Condition; label: string; sub: string; icon: string; iconCls: string }[] = [
    { key: 'perfect', label: L('Perfecto', 'Perfect'), sub: L('Sin daños · reembolso completo', 'No damage · full refund'), icon: '✓', iconCls: 'bg-green-bg text-green-dark' },
    { key: 'minor', label: L('Daño menor', 'Minor damage'), sub: L('Deduce parte del depósito', 'Deduct part of deposit'), icon: '~', iconCls: 'bg-amber-bg text-amber-ink' },
    { key: 'major', label: L('Daño mayor', 'Major damage'), sub: L('Deduce o retén el depósito', 'Deduct or hold deposit'), icon: '!', iconCls: 'bg-pink-bg text-pink-dark' },
  ];

  if (done) {
    return (
      <SuccessSheet
        ctx={ctx}
        title={L('Devolución registrada', 'Return recorded')}
        sub={`${L('Reembolso al cliente', 'Refund to renter')}: ${money(refund)}`}
        onClose={onDone}
      />
    );
  }

  return (
    <ModulePage
      title={L('Devolución', 'Return')}
      onBack={onClose}
      footer={
        <button onClick={() => setDone(true)} className="w-full cursor-pointer rounded-btn bg-primary py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm">
          {L('Registrar y reembolsar', 'Record & refund')}
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <ItemStrip item={item} ctx={ctx} right={`${L('Devuelto por', 'Returned by')} James T.`} />

        <div className={`${cardCls} p-4`}>
          <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Revisión de condición', 'Condition check')}</div>
          <div className="flex flex-col gap-2">
            {conds.map((c) => {
              const on = condition === c.key;
              return (
                <button key={c.key} onClick={() => setCondition(c.key)} className={`flex items-center gap-3 rounded-field border-[1.5px] p-3 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                  <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[1.5px] ${on ? 'border-primary' : 'border-muted-faint'}`}>
                    {on && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                  <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[14px] font-extrabold ${c.iconCls}`}>{c.icon}</span>
                  <span className="flex-1">
                    <span className="block text-[12px] font-extrabold text-ink">{c.label}</span>
                    <span className="block text-[10px] font-medium text-muted-2">{c.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${cardCls} p-4`}>
          <Line l={L('Depósito retenido', 'Deposit held')} v={money(item.dep)} />
          {deduction > 0 && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-pink-dark">{L('Deducción por daño', 'Damage deduction')}</span>
              <span className="text-[12px] font-bold text-pink-dark">−{money(deduction)}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-hair pt-2.5">
            <span className="text-[12px] font-extrabold text-ink">{L('Reembolso al cliente', 'Refund to renter')}</span>
            <span className="text-[16px] font-extrabold text-green">{money(refund)}</span>
          </div>
        </div>
      </div>
    </ModulePage>
  );
}

// ---------- Add-item 3-step wizard ----------
function AddItemWizard({ ctx, catLabel, onClose, onDone }: {
  ctx: PanelCtx; catLabel: (c: Cat) => string; onClose: () => void;
  onDone: (item: Omit<Item, 'id'>) => void;
}) {
  const { L } = ctx;
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [cat, setCat] = useState<Cat>('equipo');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('');
  const [hour, setHour] = useState('');
  const [day, setDay] = useState('');
  const [week, setWeek] = useState('');
  const [dep, setDep] = useState('');
  const [policies, setPolicies] = useState<boolean[]>([true, true, true, false]);

  const ready = name.trim().length > 0 && day.trim().length > 0;
  const steps = [L('Detalles', 'Details'), L('Tarifas', 'Rates'), L('Políticas', 'Policies')];
  const canNext = step === 0 ? name.trim().length > 0 : step === 1 ? day.trim().length > 0 : ready;

  const catDefs: [Cat, string][] = [['equipo', L('Equipo', 'Equipment')], ['space', L('Espacio', 'Space')], ['furniture', L('Mobiliario', 'Furniture')], ['tableware', L('Vajilla', 'Tableware')]];
  const polDefs = [
    [L('Exención de responsabilidad', 'Liability waiver'), L('Requerida al rentar', 'Required at rental')],
    [L('Depósito reembolsable', 'Refundable deposit'), L('Se devuelve al regresar', 'Returned on return')],
    [L('Cargo por retraso', 'Late return fee'), L('$50/hora después', '$50/hour after')],
    [L('Seguro requerido', 'Insurance required'), L('Verificación de cobertura', 'Coverage verification')],
  ];

  const finish = () => {
    onDone({
      es: name.trim(), en: name.trim(), cat, tile: CAT_TILE[cat], booked: 0,
      stock: Number(stock) || 1, out: 0, unitEs: unit.trim() || 'unidad', unitEn: unit.trim() || 'unit',
      dep: Number(dep) || 0, hour: hour ? Number(hour) : null, day: Number(day) || 0, week: Number(week) || 0,
      availEs: 'Siempre', availEn: 'Always',
    });
  };
  const next = () => { if (step >= 2) { finish(); return; } setStep((s) => s + 1); };
  const back = () => { if (step === 0) { onClose(); return; } setStep((s) => s - 1); };

  return (
    <ModulePage
      title={L('Agregar artículo', 'Add rental item')}
      subtitle={`${catLabel(cat)} · ${L('Paso', 'Step')} ${step + 1}/3`}
      onBack={back}
      backLabel={step === 0 ? L('Cancelar', 'Cancel') : L('Atrás', 'Back')}
      maxW={940}
      footer={
        <div className="flex items-center gap-3">
          <button onClick={back} aria-label={L('Atrás', 'Back')} className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-btn bg-lilac-2">
            <ChevronLeft size={18} strokeWidth={2.4} className="text-ink" />
          </button>
          <span className="flex-1 text-center text-[11px] font-semibold text-muted-2">{`${L('Paso', 'Step')} ${step + 1} ${L('de 3', 'of 3')}`}</span>
          <button
            onClick={next}
            disabled={!canNext}
            className={`flex-1 rounded-btn py-3 text-[13px] font-extrabold text-white ${!canNext ? 'cursor-not-allowed bg-lilac-line' : 'cursor-pointer bg-primary shadow-cta-sm'}`}
          >
            {step >= 2 ? L('Publicar artículo', 'Publish item') : L('Continuar', 'Continue')}
          </button>
        </div>
      }
    >
      <div className="mb-4"><StepBar steps={steps} step={step} onGo={(i) => i <= step && setStep(i)} /></div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
        <div className="order-2 xl:order-1">
          <div className={`${cardCls} flex flex-col gap-3.5 p-4`}>
            <div className="text-[13.5px] font-extrabold text-ink">{[L('Detalles del artículo', 'Item details'), L('Tarifas y depósito', 'Rates & deposit'), L('Políticas y exención', 'Policies & waiver')][step]}</div>

            {step === 0 && (
              <>
                <Field label={`${L('Nombre del artículo', 'Item name')} *`}>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('Ej. Bici eléctrica', 'e.g. E-bike')} className={fieldCls} />
                </Field>
                <Field label={`${L('Categoría', 'Category')} *`}>
                  <div className="no-scrollbar flex gap-2 min-w-0 overflow-x-auto pb-0.5">
                    {catDefs.map(([c, lab]) => (
                      <button key={c} onClick={() => setCat(c)} className={`flex-none rounded-full px-3.5 py-2 text-[12px] ${cat === c ? 'bg-primary font-extrabold text-white' : 'bg-lilac-2 font-bold text-ink-soft'}`}>{lab}</button>
                    ))}
                  </div>
                </Field>
                <div className="flex gap-3">
                  <Field label={L('Cuántos', 'How many')} className="flex-1">
                    <input value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="1" className={fieldCls} />
                  </Field>
                  <Field label={L('Unidad', 'Unit')} className="flex-1">
                    <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={L('mesa, set…', 'table, set…')} className={fieldCls} />
                  </Field>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="text-[11px] font-medium leading-snug text-muted">{L('Define al menos la tarifa diaria. Hora y semana son opcionales.', 'Set at least the daily rate. Hour and week are optional.')}</div>
                <div className="flex gap-3">
                  <Field label={L('Hora', 'Hour')} className="flex-1"><MoneyInput value={hour} onChange={setHour} placeholder="—" /></Field>
                  <Field label={`${L('Día', 'Day')} *`} className="flex-1"><MoneyInput value={day} onChange={setDay} placeholder="0" /></Field>
                </div>
                <div className="flex gap-3">
                  <Field label={L('Semana', 'Week')} className="flex-1"><MoneyInput value={week} onChange={setWeek} placeholder="—" /></Field>
                  <Field label={L('Depósito', 'Deposit')} className="flex-1"><MoneyInput value={dep} onChange={setDep} placeholder="0" /></Field>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="text-[11px] font-extrabold text-ink-soft">{L('Políticas', 'Policies')}</div>
                {polDefs.map(([label, sub], i) => (
                  <div key={label} className="flex items-center gap-3 rounded-field border border-hair bg-app p-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-bold text-ink">{label}</span>
                      <span className="block text-[10px] font-medium text-muted-2">{sub}</span>
                    </span>
                    <Toggle on={policies[i]} onClick={() => setPolicies((prev) => prev.map((v, j) => (j === i ? !v : v)))} />
                  </div>
                ))}
                <div className={`mt-1 flex items-center gap-3 rounded-field border p-3 ${ready ? 'border-green/40 bg-green-bg' : 'border-amber/40 bg-amber-bg'}`}>
                  <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-white text-[14px] font-extrabold ${ready ? 'text-green-dark' : 'text-amber-ink'}`}>{ready ? '✓' : '⚠'}</span>
                  <span className="flex-1">
                    <span className={`block text-[12px] font-extrabold ${ready ? 'text-green-dark' : 'text-amber-ink'}`}>{ready ? L('Listo para publicar', 'Ready to publish') : L('Faltan datos', 'A few essentials missing')}</span>
                    <span className="block text-[10.5px] font-semibold leading-snug text-ink-3">{ready ? L('Aparecerá disponible para rentar.', 'It’ll appear available to rent.') : L('Agrega nombre y tarifa diaria.', 'Add a name and daily rate.')}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="order-1 xl:order-2 xl:sticky xl:top-0">
          <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[.06em] text-muted-faint">{L('Vista previa en vivo', 'Live preview')}</div>
          <div className="overflow-hidden rounded-card-sm border border-hair">
            <div className="h-[80px]" style={{ background: `repeating-linear-gradient(135deg,${CAT_TILE[cat]})` }} />
            <div className="flex items-start justify-between gap-2.5 p-3">
              <div className="min-w-0">
                <div className={`text-[14px] font-extrabold ${name ? 'text-ink' : 'text-muted-faint'}`}>{name || L('Nombre del artículo', 'Item name')}</div>
                <div className="mt-0.5 text-[10.5px] font-medium text-muted-2">{catLabel(cat)}</div>
              </div>
              <span className="whitespace-nowrap text-[13px] font-extrabold text-ink">{day ? `${money(Number(day))}/${L('día', 'day')}` : '$0'}</span>
            </div>
          </div>
        </div>
      </div>
    </ModulePage>
  );
}

// ---------- shared bits ----------
function SuccessSheet({ ctx, title, sub, onClose }: { ctx: PanelCtx; title: string; sub: string; onClose: () => void }) {
  const { L } = ctx;
  return (
    <ModulePage
      title={title}
      onBack={onClose}
      footer={
        <button onClick={onClose} className="w-full cursor-pointer rounded-btn bg-primary py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm">{L('Listo', 'Done')}</button>
      }
    >
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-bg text-green-dark">
          <Check size={28} strokeWidth={3} />
        </span>
        <div className="text-[16px] font-extrabold text-ink">{title}</div>
        <div className="max-w-[320px] text-[12.5px] font-semibold leading-relaxed text-muted">{sub}</div>
      </div>
    </ModulePage>
  );
}

function StepBar({ steps, step, onGo }: { steps: string[]; step: number; onGo: (i: number) => void }) {
  return (
    <div className="no-scrollbar flex gap-2 min-w-0 overflow-x-auto">
      {steps.map((label, i) => {
        const active = i === step, done = i < step;
        return (
          <button key={label} onClick={() => onGo(i)} className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${active ? 'bg-primary text-white' : done ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted-2'}`}>
            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white ${active ? 'bg-white/25' : done ? 'bg-primary' : 'bg-muted-faint'}`}>{done ? '✓' : i + 1}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ItemStrip({ item, ctx, right }: { item: Item; ctx: PanelCtx; right: string }) {
  const { L } = ctx;
  return (
    <div className={`${cardCls} flex items-center gap-3 p-3`}>
      <span className="h-11 w-11 flex-none rounded-[11px]" style={{ background: `repeating-linear-gradient(135deg,${item.tile})` }} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold text-ink">{L(item.es, item.en)}</span>
        <span className="block truncate text-[10px] font-medium text-muted-2">{right}</span>
      </span>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-extrabold text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function MoneyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center rounded-field border-[1.5px] border-lilac-line px-3 focus-within:border-primary">
      <span className="text-[12px] font-bold text-muted-2">$</span>
      <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder={placeholder} className="w-full bg-transparent px-1.5 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted-faint" />
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative h-[25px] w-[42px] flex-none rounded-full transition-colors ${on ? 'bg-primary' : 'bg-lilac-line'}`} aria-pressed={on}>
      <span className={`absolute top-[3px] h-[19px] w-[19px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.18)] transition-all ${on ? 'left-[20px]' : 'left-[3px]'}`} />
    </button>
  );
}

function Line({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold text-ink-2">{l}</span>
      <span className="text-[12px] font-bold text-ink">{v}</span>
    </div>
  );
}
