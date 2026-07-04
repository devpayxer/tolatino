'use client';

// Clientes / Pedidos / Reseñas module (business dashboard). One screen, three
// modes selected by a top toggle (initial mode derives from the `tab` prop):
//  · Clientes — KPIs, search, segment sub-tabs, customer cards, loyalty toggles.
//  · Pedidos  — KPIs, status filter chips, order cards with a real ADVANCE
//               button (new → preparing → ready → completed).
//  · Reseñas  — rating breakdown bars + review cards, each with an AI-draft
//               reply (fills an editable box) and a flag toggle.
// Mobile-first; on desktop the secondary panels move into a sticky side rail and
// lists spread into multi-column grids. All state is real & local.

import { useMemo, useState } from 'react';
import {
  Check, ChevronRight, Clock, DollarSign, Flag, Gift, Heart, RefreshCw, Search,
  ShoppingBag, Sparkles, Star, UserPlus, Users, Zap,
} from 'lucide-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';

type Mode = 'customers' | 'orders' | 'reviews';
type Seg = 'all' | 'new' | 'regulars' | 'vip' | 'risk';
type OStatus = 'new' | 'preparing' | 'ready' | 'completed';
type Channel = 'delivery' | 'dinein' | 'pickup';
type RvFilter = 'all' | 'need' | 'top' | 'low' | 'flagged';

type Customer = {
  id: number; initials: string; color: string; name: string; visits: number;
  spent: string; last: [string, string]; tag: [string, string]; vip: boolean;
  isNew: boolean; atRisk: boolean; b2b?: boolean;
};
type Order = {
  id: string; who: [string, string]; placed: [string, string]; urgent: boolean;
  channel: Channel; status: OStatus; total: string; items: [string, string];
};
type Review = {
  id: number; initials: string; color: string; name: [string, string]; stars: number;
  date: string; ch: 'Google' | 'Nearby' | 'Yelp'; helpful: number;
  text: [string, string]; ai: [string, string]; seededReply?: [string, string];
};

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';

const CH_TILE: Record<Channel, string> = {
  delivery: 'bg-pink-bg text-pink-dark',
  dinein: 'bg-lilac-2 text-primary-dark',
  pickup: 'bg-amber-bg text-amber-ink',
};
const STATUS_DOT: Record<OStatus, string> = {
  new: '#F0466E', preparing: '#F4B740', ready: '#7B61FF', completed: '#1F9D57',
};
const FLOW: Record<OStatus, OStatus | null> = {
  new: 'preparing', preparing: 'ready', ready: 'completed', completed: null,
};
const CH_REVIEW: Record<Review['ch'], string> = {
  Google: 'bg-green-bg text-green-dark',
  Nearby: 'bg-lilac-2 text-primary-dark',
  Yelp: 'bg-amber-bg text-amber-ink',
};

export function CustomersModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es, isFree, isPremium, ci } = ctx;

  const initialMode: Mode = tab === 'orders' ? 'orders' : tab === 'reviews' ? 'reviews' : 'customers';

  // ---- seed data ------------------------------------------------------------
  const customers = useMemo<Customer[]>(
    () => [
      { id: 1, initials: 'ML', color: '#7B61FF', name: 'María López', visits: 24, spent: '$1,824', last: ['hace 2 días', '2 days ago'], tag: ['VIP', 'VIP'], vip: true, isNew: false, atRisk: false },
      { id: 2, initials: 'MT', color: '#1F9D57', name: 'Mission Tech', visits: 12, spent: '$4,680', last: ['hoy', 'today'], tag: ['B2B', 'B2B'], vip: true, isNew: false, atRisk: false, b2b: true },
      { id: 3, initials: 'JT', color: '#2A5C8A', name: 'James Tate', visits: 18, spent: '$1,420', last: ['hace 1 sem', '1 wk ago'], tag: ['Recurrente', 'Regular'], vip: false, isNew: false, atRisk: false },
      { id: 4, initials: 'SR', color: '#D6336C', name: 'Sofía Reyes', visits: 14, spent: '$840', last: ['hoy', 'today'], tag: ['Recurrente', 'Regular'], vip: false, isNew: false, atRisk: false },
      { id: 5, initials: 'AF', color: '#E8954A', name: 'Anna F.', visits: 8, spent: '$986', last: ['hace 3 días', '3 days ago'], tag: ['Catas', 'Tasting'], vip: false, isNew: false, atRisk: false },
      { id: 6, initials: 'CM', color: '#9A6A12', name: 'Carlos M.', visits: 3, spent: '$184', last: ['hace 4 días', '4 days ago'], tag: ['Nuevo', 'New'], vip: false, isNew: true, atRisk: false },
      { id: 7, initials: 'RG', color: '#B5791A', name: 'Rosa G.', visits: 11, spent: '$620', last: ['hace 68 días', '68 days ago'], tag: ['En riesgo', 'At risk'], vip: false, isNew: false, atRisk: true },
    ],
    [],
  );

  const seedOrders = useMemo<Order[]>(
    () => [
      { id: '#2487', who: ['María López', 'María López'], placed: ['ahora', 'just now'], urgent: true, channel: 'delivery', status: 'new', total: '$48.20', items: ['2× Quesabirria, Horchata, Agua', '2× Quesabirria, Horchata, Water'] },
      { id: '#2486', who: ['Mesa 7', 'Table 7'], placed: ['hace 2 min', '2m ago'], urgent: false, channel: 'dinein', status: 'new', total: '$92.00', items: ['3× Tacos al pastor, Vino tinto', '3× Tacos al pastor, Red wine'] },
      { id: '#2484', who: ['James Tate', 'James Tate'], placed: ['hace 8 min', '8m ago'], urgent: false, channel: 'pickup', status: 'preparing', total: '$40.40', items: ['Canasta de pan, Bucatini', 'Bread basket, Bucatini'] },
      { id: '#2483', who: ['Mesa 12', 'Table 12'], placed: ['hace 12 min', '12m ago'], urgent: false, channel: 'dinein', status: 'preparing', total: '$280.00', items: ['Menú degustación · 5 platos', 'Tasting menu · 5 courses'] },
      { id: '#2481', who: ['Carlos M.', 'Carlos M.'], placed: ['hace 18 min', '18m ago'], urgent: false, channel: 'delivery', status: 'ready', total: '$24.50', items: ['Torta ahogada, 2× Refrescos', 'Torta ahogada, 2× Sodas'] },
      { id: '#2477', who: ['Mesa 5', 'Table 5'], placed: ['cerrado', 'closed'], urgent: false, channel: 'dinein', status: 'completed', total: '$220.00', items: ['Cena para 4, 3× Cócteles', 'Dinner for 4, 3× Cocktails'] },
    ],
    [],
  );

  const reviews = useMemo<Review[]>(
    () => [
      { id: 1, initials: 'JT', color: '#2A5C8A', name: ['James Tate', 'James Tate'], stars: 4, date: es ? '14 min' : '14m', ch: 'Google', helpful: 8, text: ['El servicio fue un poco lento pero la comida lo compensó. El menú degustación fue lo mejor.', 'Service was a bit slow but the food made up for it. The tasting menu was a highlight.'], ai: ['¡Gracias por las amables palabras, James! Nos alegra que el menú degustación te encantara. Estamos mejorando los tiempos en la cena.', 'Thanks for the kind words, James! So glad the tasting menu landed. We’re tightening up our dinner pacing.'] },
      { id: 2, initials: 'ML', color: '#7B61FF', name: ['María López', 'María López'], stars: 5, date: '2h', ch: 'Nearby', helpful: 14, text: ['El mejor al pastor de Houston. Los martes de 2x1 son una experiencia religiosa.', 'Best al pastor in Houston. Taco Tuesday is a religious experience.'], ai: ['¡Mil gracias, María! Nos llena de alegría — significa mucho para todo el equipo. ¡Te esperamos pronto!', 'Thank you so much, María! We’re thrilled — it means the world to the whole team.'] },
      { id: 3, initials: 'DK', color: '#D6336C', name: ['Daniel Kim', 'Daniel Kim'], stars: 5, date: '3d', ch: 'Google', helpful: 22, text: ['Cena de cumpleaños — trajeron una vela en el pastel. Hicieron la noche.', 'Birthday dinner — they brought out a candle on the cake. Made the night.'], ai: ['', ''], seededReply: ['¡Mil gracias por las amables palabras — nos vemos pronto!', 'Thank you so much for the kind words — see you again soon!'] },
      { id: 4, initials: 'A', color: '#9A96AE', name: ['Anónimo', 'Anonymous'], stars: 1, date: '2d', ch: 'Yelp', helpful: 0, text: ['Nunca comí aquí pero el dueño es claramente caro y grosero. Una estrella.', 'Never even ate here but the owner is clearly overpriced and rude. One star.'], ai: ['Hola — tomamos en serio toda retroalimentación, pero no tenemos registro de una visita con este nombre. Si cenaste con nosotros, contáctanos directamente.', 'Hi — we take all feedback seriously, but we have no record of a visit under this name. Please reach out directly.'] },
    ],
    [es],
  );

  // ---- state ----------------------------------------------------------------
  const [mode, setMode] = useState<Mode>(initialMode);
  const [query, setQuery] = useState('');
  const [seg, setSeg] = useState<Seg>('all');
  const [loyaltyOn, setLoyaltyOn] = useState(true);
  const [rewards, setRewards] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: false });

  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [oStatus, setOStatus] = useState<OStatus>('new');

  const [rvFilter, setRvFilter] = useState<RvFilter>('all');
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [posted, setPosted] = useState<Record<number, [string, string]>>(() => {
    const seeded: Record<number, [string, string]> = {};
    reviews.forEach((r) => { if (r.seededReply) seeded[r.id] = r.seededReply; });
    return seeded;
  });
  const [flagged, setFlagged] = useState<Record<number, boolean>>({ 4: true });

  const [toast, setToast] = useState('');
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 1900);
  };

  // ---- derived --------------------------------------------------------------
  const inFlight = orders.filter((o) => o.status !== 'completed').length;
  const needReply = reviews.filter((r) => !posted[r.id] && !flagged[r.id]).length;

  const modes: [Mode, string, number][] = [
    ['customers', L('Clientes', 'Customers'), 0],
    ['orders', L('Pedidos', 'Orders'), inFlight],
    ['reviews', L('Reseñas', 'Reviews'), needReply],
  ];

  // ---- shared bits ----------------------------------------------------------
  const chip = (on: boolean) =>
    `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;

  const Kpi = ({ Icon, c, bg, label, value, delta, dC }: { Icon: typeof Users; c: string; bg: string; label: string; value: string; delta: string; dC?: string }) => (
    <div className={`${cardCls} p-3.5`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: bg }}>
        <Icon size={15} strokeWidth={2.2} style={{ color: c }} />
      </span>
      <div className="mt-2.5 text-[10.5px] font-bold text-muted">{label}</div>
      <div className="mt-0.5 text-[19px] font-extrabold text-ink">{value}</div>
      <div className="text-[9.5px] font-extrabold" style={{ color: dC ?? '#1F9D57' }}>{delta}</div>
    </div>
  );

  // ---- CLIENTES -------------------------------------------------------------
  const custKpis = [
    { Icon: Users, c: '#6D4DF6', bg: '#EFEBFF', label: L('Total', 'Total'), value: '4,284', delta: '▲ 6%' },
    { Icon: UserPlus, c: '#D6336C', bg: '#FDE7EF', label: L('Nuevos 30d', 'New 30d'), value: '62', delta: '▲ 28%' },
    { Icon: RefreshCw, c: '#1F8A4C', bg: '#E3F5EA', label: L('Recurrencia', 'Return rate'), value: '72%', delta: '▲ 4pp' },
    { Icon: DollarSign, c: '#9A6A12', bg: '#FCEFD6', label: L('LTV prom.', 'Avg LTV'), value: '$184', delta: '▲ 9%' },
  ];

  const segTabs: [Seg, string][] = [
    ['all', L('Todos', 'All')],
    ['new', L('Nuevos', 'New')],
    ['regulars', L('Recurrentes', 'Regulars')],
    ['vip', 'VIP'],
    ['risk', L('En riesgo', 'At risk')],
  ];

  const custList = useMemo(() => {
    let l = customers;
    if (seg === 'new') l = l.filter((c) => c.isNew);
    else if (seg === 'regulars') l = l.filter((c) => c.visits >= 9 && !c.vip && !c.atRisk);
    else if (seg === 'vip') l = l.filter((c) => c.vip);
    else if (seg === 'risk') l = l.filter((c) => c.atRisk);
    const q = query.trim().toLowerCase();
    if (q) l = l.filter((c) => c.name.toLowerCase().includes(q));
    return l;
  }, [customers, seg, query]);

  const tagStyle = (c: Customer) =>
    c.atRisk ? 'bg-amber-bg text-amber-ink' : c.isNew ? 'bg-green-bg text-green-dark' : c.b2b ? 'bg-lilac text-primary-dark' : c.vip ? 'bg-amber-bg text-amber-ink' : 'bg-lilac-2 text-muted-2';

  const segments: [string, string, string, string, number][] = [
    [L('VIP · top 10%', 'VIP · top 10%'), '428', '$840', '#4F46E5', 86],
    [L('Recurrentes', 'Regulars'), '1,284', '$184', '#7C6BFF', 64],
    [L('Ocasionales', 'Occasional'), '2,104', '$58', '#A78BFA', 42],
    [L('Nuevos', 'New'), '184', '$24', '#34D399', 12],
  ];

  const rewardDefs: [string, string][] = [
    [L('Regalo de cumpleaños', 'Birthday gift'), L('Postre gratis', 'Free dessert')],
    [L('10ª visita · $20 crédito', '10th visit · $20 credit'), L('Automático', 'Automatic')],
    [L('Refiere un amigo · $10', 'Refer a friend · $10'), L('Ambos ganan', 'Both earn')],
    [L('Cliente perdido · 20%', 'Lapsed comeback · 20% off'), L('Sin pedir 60d', 'No order 60d')],
  ];

  const Toggle = ({ on, onClick, big }: { on: boolean; onClick: () => void; big?: boolean }) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`relative flex-none cursor-pointer rounded-full transition-colors ${big ? 'h-[25px] w-[44px]' : 'h-[22px] w-[38px]'} ${on ? 'bg-primary' : 'bg-lilac-line'}`}
    >
      <span className={`absolute top-[3px] rounded-full bg-white shadow-sm transition-all ${big ? 'h-[19px] w-[19px]' : 'h-[16px] w-[16px]'} ${on ? (big ? 'left-[22px]' : 'left-[19px]') : 'left-[3px]'}`} />
    </button>
  );

  const customersView = (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {custKpis.map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 rounded-field border-[1.5px] border-lilac-line bg-white px-3.5 py-2.5 focus-within:border-primary">
            <Search size={16} strokeWidth={2.2} className="flex-none text-muted-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L('Buscar por nombre, teléfono…', 'Search by name, phone…')}
              className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-muted"
            />
          </div>

          <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
            {segTabs.map(([k, label]) => (
              <button key={k} onClick={() => setSeg(k)} className={chip(seg === k)}>{label}</button>
            ))}
          </div>

          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-1">
            {custList.length === 0 ? (
              <div className={`${cardCls} p-9 text-center md:col-span-2 xl:col-span-1`}>
                <div className="text-[13px] font-semibold text-muted">{L('Ningún cliente en este segmento.', 'No customers in this segment.')}</div>
              </div>
            ) : (
              custList.map((c) => (
                <div key={c.id} className={`${cardCls} flex items-center gap-3 p-3`}>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: c.color }}>{c.initials}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-extrabold text-ink">{c.name}</span>
                      {c.vip && <span className="flex-none rounded bg-amber-bg px-1.5 py-px text-[8px] font-extrabold text-amber-ink">VIP</span>}
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold text-muted-2">
                      {c.visits} {L('visitas', 'visits')} · {L('última', 'last')} {L(c.last[0], c.last[1])}
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="text-[13px] font-extrabold text-ink">{c.spent}</div>
                    <span className={`mt-1 inline-block rounded px-1.5 py-px text-[8.5px] font-extrabold ${tagStyle(c)}`}>{L(c.tag[0], c.tag[1])}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-[74px]">
          {/* segments */}
          <div className={`${cardCls} p-4`}>
            <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Segmentos de clientes', 'Customer segments')}</div>
            <div className="flex flex-col gap-2.5">
              {segments.map(([name, n, ltv, barC, w]) => (
                <div key={name}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="font-bold text-ink">{name}</span>
                    <span className="font-semibold text-muted-2">{n} · {ltv} LTV</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-lilac-2">
                    <div className="h-full rounded-full" style={{ width: `${w}%`, background: barC }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* loyalty */}
          <div className={`${cardCls} p-4`}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-ink">{L('Lealtad y recompensas', 'Loyalty & rewards')}</span>
              <Toggle big on={loyaltyOn} onClick={() => { setLoyaltyOn((v) => !v); flash(loyaltyOn ? L('Programa de lealtad pausado', 'Loyalty program paused') : L('Programa de lealtad activo', 'Loyalty program on')); }} />
            </div>
            <div className="rounded-btn-lg bg-lilac-3 p-3" style={{ opacity: loyaltyOn ? 1 : 0.45 }}>
              <div className="text-[11.5px] font-extrabold text-ink">{L('Gana 1 punto por cada $1', 'Earn 1 point per $1 spent')}</div>
              <div className="mt-1 text-[10.5px] font-semibold leading-snug text-ink-3">
                {L('100 pts = $10 de crédito · 284 inscritos · $4,820 canjeados este mes.', '100 pts = $10 credit · 284 enrolled · $4,820 redeemed this month.')}
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2" style={{ opacity: loyaltyOn ? 1 : 0.45 }}>
              {rewardDefs.map(([label, sub], i) => (
                <div key={label} className="flex items-center gap-2.5 rounded-lg bg-app px-3 py-2.5">
                  <Gift size={14} strokeWidth={2.2} className="flex-none text-primary-dark" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-extrabold text-ink">{label}</span>
                    <span className="block text-[9.5px] font-semibold text-muted-2">{sub}</span>
                  </span>
                  <Toggle on={!!rewards[i]} onClick={() => setRewards((r) => ({ ...r, [i]: !r[i] }))} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ---- PEDIDOS --------------------------------------------------------------
  const orderKpis = [
    { Icon: ShoppingBag, c: '#D6336C', bg: '#FDE7EF', label: L('Pedidos hoy', 'Orders today'), value: '38', delta: '▲ 18%', dC: '#1F9D57' },
    { Icon: Clock, c: '#9A6A12', bg: '#FCEFD6', label: L('En curso', 'In flight'), value: String(inFlight), delta: L('1 urgente', '1 urgent'), dC: '#9A96AE' },
    { Icon: DollarSign, c: '#1F8A4C', bg: '#E3F5EA', label: L('Ingresos', 'Revenue'), value: '$1,847', delta: '▲ 12%', dC: '#1F9D57' },
    { Icon: Clock, c: '#6D4DF6', bg: '#EFEBFF', label: L('Prep prom.', 'Avg prep'), value: '18m', delta: '▼ 2m', dC: '#1F9D57' },
  ];

  const statusMeta: Record<OStatus, [string, string]> = {
    new: [L('Nuevos', 'New'), 'new'], preparing: [L('Preparando', 'Preparing'), 'preparing'], ready: [L('Listos', 'Ready'), 'ready'], completed: [L('Completados', 'Completed'), 'completed'],
  };
  const statusKeys: OStatus[] = ['new', 'preparing', 'ready', 'completed'];
  const advLabel = (s: OStatus, ch: Channel) =>
    s === 'new' ? L('Aceptar', 'Accept') : s === 'preparing' ? L('Marcar listo', 'Mark ready') : ch === 'delivery' ? L('Dar al repartidor', 'Hand to driver') : L('Completar', 'Complete');
  const chLabel = (ch: Channel) => ch === 'delivery' ? L('Entrega', 'Delivery') : ch === 'dinein' ? L('Mostrador', 'Dine-in') : L('Recoger', 'Pickup');

  const advance = (o: Order) => {
    const nx = FLOW[o.status];
    if (!nx) return;
    setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status: nx } : x)));
    flash(`${o.id} → ${statusMeta[nx][0]}`);
  };

  const orderList = orders.filter((o) => o.status === oStatus);
  const channelMix: [string, Channel, string, string][] = [
    ['#6D4DF6', 'dinein', L('Mostrador', 'Dine-in'), '42%'],
    ['#D6336C', 'delivery', L('Entrega', 'Delivery'), '34%'],
    ['#9A6A12', 'pickup', L('Recoger', 'Pickup'), '24%'],
  ];

  const ordersView = (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {orderKpis.map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
            {statusKeys.map((k) => {
              const on = oStatus === k;
              const n = orders.filter((o) => o.status === k).length;
              return (
                <button key={k} onClick={() => setOStatus(k)} className={`flex flex-none cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT[k] }} />
                  {statusMeta[k][0]}
                  <span className={`font-extrabold ${on ? 'text-white/80' : 'text-muted-2'}`}>{n}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
            {orderList.length === 0 ? (
              <div className={`${cardCls} p-9 text-center md:col-span-2`}>
                <div className="text-[13px] font-semibold text-muted">{L('No hay pedidos en este estado.', 'No orders in this status.')}</div>
              </div>
            ) : (
              orderList.map((o) => {
                const done = o.status === 'completed';
                return (
                  <div key={o.id} className={`overflow-hidden rounded-card-sm border bg-white shadow-card ${o.urgent && !done ? 'border-[rgba(240,70,110,.35)]' : 'border-hair'}`}>
                    <div className="p-3.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="font-mono text-[11.5px] font-extrabold text-primary-dark">{o.id}</span>
                        <span className="text-[9.5px] font-semibold text-muted-2">{L(o.placed[0], o.placed[1])}</span>
                      </div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-[13px] font-extrabold text-ink">{L(o.who[0], o.who[1])}</span>
                        {o.urgent && !done && <span className="flex items-center gap-0.5 rounded bg-pink-bg px-1.5 py-px text-[8px] font-extrabold text-pink-dark"><Zap size={9} strokeWidth={2.6} />{L('Urgente', 'Urgent')}</span>}
                      </div>
                      <div className="line-clamp-2 text-[11px] font-semibold leading-snug text-ink-3">{L(o.items[0], o.items[1])}</div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className={`rounded px-2 py-0.5 text-[9px] font-extrabold ${CH_TILE[o.channel]}`}>{chLabel(o.channel)}</span>
                        <span className="text-[14px] font-extrabold text-ink">{o.total}</span>
                      </div>
                      {done ? (
                        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] font-extrabold text-green-dark">
                          <Check size={12} strokeWidth={3} />{L('Pagado y cerrado', 'Paid & closed')}
                        </div>
                      ) : (
                        <button onClick={() => advance(o)} className="mt-3 flex w-full items-center justify-center gap-1 rounded-field bg-primary py-2.5 text-[11.5px] font-extrabold text-white shadow-cta-sm">
                          {advLabel(o.status, o.channel)}<ChevronRight size={14} strokeWidth={2.6} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-[74px]">
          <div className={`${cardCls} p-4`}>
            <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Por canal · hoy', 'By channel · today')}</div>
            <div className="flex flex-col gap-2.5">
              {channelMix.map(([c, ch, label, pct]) => (
                <div key={ch} className="flex items-center gap-2 text-[12px] font-bold text-ink-soft">
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: c }} />
                  <span className="flex-1">{label}</span>
                  <span className="font-extrabold text-ink">{pct}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-btn-lg bg-lilac-2 p-3">
              <div className="text-[12px] font-extrabold text-primary-dark">⏱ {L('Prep prom. bajó a 18 min', 'Avg prep down to 18 min')}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-ink-3">{L('2 min más rápido que la semana pasada.', '2 min faster than last week.')}</div>
            </div>
          </div>
          <div className={`${cardCls} p-4`}>
            <div className="mb-2 text-[13px] font-extrabold text-ink">{L('Cola en vivo', 'Live queue')}</div>
            <div className="grid grid-cols-2 gap-2.5">
              {statusKeys.map((k) => (
                <button key={k} onClick={() => setOStatus(k)} className={`rounded-btn-lg p-2.5 text-left ${oStatus === k ? 'bg-lilac-2' : 'bg-app'}`}>
                  <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wide text-muted">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT[k] }} />{statusMeta[k][0]}
                  </div>
                  <div className="mt-1 text-[17px] font-extrabold text-ink">{orders.filter((o) => o.status === k).length}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ---- RESEÑAS --------------------------------------------------------------
  const ratingBars: [number, number, string][] = [
    [5, 78, '#1F9D57'], [4, 14, '#1F9D57'], [3, 5, '#F4B740'], [2, 2, '#D6336C'], [1, 1, '#D6336C'],
  ];
  const rvFilters: [RvFilter, string, number | null][] = [
    ['all', L('Todas', 'All'), null],
    ['need', L('Sin responder', 'Need reply'), needReply],
    ['top', '5★', null],
    ['low', '≤3★', null],
    ['flagged', L('Reportadas', 'Flagged'), null],
  ];
  const reviewList = reviews.filter((r) => {
    if (rvFilter === 'need') return !posted[r.id] && !flagged[r.id];
    if (rvFilter === 'top') return r.stars === 5;
    if (rvFilter === 'low') return r.stars <= 3;
    if (rvFilter === 'flagged') return flagged[r.id];
    return true;
  });

  const aiDraft = (r: Review) => {
    setReplyText((t) => ({ ...t, [r.id]: L(r.ai[0], r.ai[1]) }));
    flash(L('Borrador con IA listo — revísalo', 'AI draft ready — review it'));
  };
  const sendReply = (r: Review) => {
    const text = (replyText[r.id] ?? '').trim();
    if (!text) return flash(L('Escribe una respuesta primero', 'Write a reply first'));
    setPosted((p) => ({ ...p, [r.id]: [text, text] }));
    flash(L('Respuesta publicada', 'Reply posted'));
  };
  const toggleFlag = (r: Review) => {
    const on = !flagged[r.id];
    setFlagged((f) => ({ ...f, [r.id]: on }));
    flash(on ? L('Reseña reportada', 'Review flagged') : L('Reporte quitado', 'Review unflagged'));
  };

  const Stars = ({ n }: { n: number }) => (
    <span className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={12} strokeWidth={0} className={i < n ? 'fill-amber text-amber' : 'fill-lilac-line text-lilac-line'} />
      ))}
    </span>
  );

  const reviewsView = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        {/* rating summary (mobile: on top) */}
        <div className={`${cardCls} flex items-center gap-5 p-5 xl:hidden`}>
          <div className="flex-none text-center">
            <div className="text-[38px] font-extrabold leading-none text-ink">4.8</div>
            <div className="mt-1 flex justify-center"><Stars n={5} /></div>
            <div className="mt-1 text-[9.5px] font-semibold text-muted-2">412 {L('reseñas', 'reviews')}</div>
          </div>
          <div className="min-w-0 flex-1">
            {ratingBars.map(([star, pct, c]) => (
              <div key={star} className="mb-1 flex items-center gap-2">
                <span className="w-4 text-[9.5px] font-bold text-ink-soft">{star}★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-lilac-2">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                </div>
                <span className="w-7 text-right text-[9px] font-bold text-muted-2">{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
          {rvFilters.map(([k, label, n]) => (
            <button key={k} onClick={() => setRvFilter(k)} className={chip(rvFilter === k)}>
              {label}
              {n != null && n > 0 && <span className={`ml-1.5 font-extrabold ${rvFilter === k ? 'text-white/80' : 'text-pink-dark'}`}>{n}</span>}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {reviewList.length === 0 ? (
            <div className={`${cardCls} p-9 text-center`}>
              <div className="text-[13px] font-semibold text-muted">{L('No hay reseñas con este filtro.', 'No reviews for this filter.')}</div>
            </div>
          ) : (
            reviewList.map((r) => {
              const reply = posted[r.id];
              const isFlagged = flagged[r.id];
              const draft = replyText[r.id] ?? '';
              return (
                <div key={r.id} className={`rounded-card-sm border bg-white p-4 shadow-card ${isFlagged ? 'border-[rgba(240,70,110,.3)]' : 'border-hair'}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: r.color }}>{r.initials}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12.5px] font-extrabold text-ink">{L(r.name[0], r.name[1])}</span>
                        <span className={`rounded px-1.5 py-px text-[8px] font-extrabold ${CH_REVIEW[r.ch]}`}>{r.ch}</span>
                        {isFlagged && <span className="rounded bg-pink-bg px-1.5 py-px text-[8px] font-extrabold text-pink-dark">{L('Reportada', 'Flagged')}</span>}
                      </div>
                      <div className="mt-1"><Stars n={r.stars} /></div>
                    </div>
                    <span className="flex-none text-[9px] font-semibold text-muted-faint">{r.date}</span>
                  </div>

                  <div className="mt-2.5 text-[12px] font-medium leading-relaxed text-ink-body">{L(r.text[0], r.text[1])}</div>

                  {reply ? (
                    <div className="mt-3 rounded-r-lg border-l-[3px] border-ink bg-app px-3 py-2.5">
                      <div className="mb-1 flex items-center gap-1.5 text-[9.5px] font-extrabold text-ink">
                        <span className="flex h-4 w-4 items-center justify-center rounded bg-primary text-[7px] font-extrabold text-white">{ci.initials}</span>
                        {ci.name.split(' ')[0]} · {L('respuesta del dueño', 'owner reply')}
                      </div>
                      <div className="text-[11px] font-medium leading-snug text-ink-3">{reply[0]}</div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-btn-lg border border-dashed border-lilac-ring p-3">
                      <div className="mb-2 flex items-center gap-1.5 text-[9.5px] font-extrabold text-primary-dark">
                        <Sparkles size={12} strokeWidth={2.2} />{L('Respuesta sugerida por IA', 'AI-suggested reply')}
                      </div>
                      <textarea
                        value={draft}
                        onChange={(e) => setReplyText((t) => ({ ...t, [r.id]: e.target.value }))}
                        rows={draft ? 3 : 2}
                        placeholder={L('Escribe una respuesta o genera un borrador con IA…', 'Write a reply or draft one with AI…')}
                        className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[11.5px] font-medium leading-snug text-ink outline-none placeholder:text-muted focus:border-primary"
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                        <button onClick={() => toggleFlag(r)} className="flex cursor-pointer items-center gap-1 rounded-field px-2.5 py-2 text-[10px] font-extrabold text-pink-dark">
                          <Flag size={11} strokeWidth={2.4} />{isFlagged ? L('Quitar reporte', 'Unflag') : L('Reportar', 'Flag')}
                        </button>
                        <button onClick={() => aiDraft(r)} className="flex cursor-pointer items-center gap-1 rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2 text-[10.5px] font-extrabold text-primary-dark">
                          <Sparkles size={11} strokeWidth={2.4} />{L('Borrador IA', 'AI draft')}
                        </button>
                        <button onClick={() => sendReply(r)} className="cursor-pointer rounded-field bg-primary px-3.5 py-2 text-[10.5px] font-extrabold text-white shadow-cta-sm">
                          {L('Responder', 'Send reply')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center gap-3 text-[10px] font-semibold text-muted-2">
                    <span className="flex items-center gap-1"><Heart size={12} strokeWidth={2.2} className="text-pink" /> {r.helpful} {L('útil', 'helpful')}</span>
                    {!reply && !isFlagged && (
                      <button onClick={() => toggleFlag(r)} className="flex cursor-pointer items-center gap-1 text-pink-dark xl:hidden"><Flag size={11} strokeWidth={2.2} />{L('Reportar', 'Flag')}</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* desktop rail */}
      <div className="hidden flex-col gap-4 xl:sticky xl:top-[74px] xl:flex">
        <div className={`${cardCls} p-5`}>
          <div className="text-center">
            <div className="text-[40px] font-extrabold leading-none text-ink">4.8</div>
            <div className="mt-1 flex justify-center"><Stars n={5} /></div>
            <div className="mt-1 text-[10px] font-semibold text-muted-2">412 {L('reseñas', 'reviews')}</div>
          </div>
          <div className="mt-4">
            {ratingBars.map(([star, pct, c]) => (
              <div key={star} className="mb-1.5 flex items-center gap-2">
                <span className="w-4 text-[9.5px] font-bold text-ink-soft">{star}★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-lilac-2">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                </div>
                <span className="w-7 text-right text-[9px] font-bold text-muted-2">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`${cardCls} p-4`}>
          <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Reputación', 'Reputation')}</div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              [L('Respuestas', 'Replied'), '88%', '▲ 5%'],
              [L('Recomiendan', 'Recommend'), '94%', '▲ 2%'],
              [L('Resp. prom.', 'Avg reply'), '3h', '▼ 1h'],
              [L('Sin responder', 'Need reply'), String(needReply), ''],
            ].map(([l, v, d]) => (
              <div key={l} className="rounded-btn-lg bg-app p-3">
                <div className="text-[10px] font-bold text-muted">{l}</div>
                <div className="mt-0.5 text-[17px] font-extrabold text-ink">{v}</div>
                {d && <div className="text-[9.5px] font-extrabold text-green">{d}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ---- shell ----------------------------------------------------------------
  return (
    <div className="relative flex flex-col gap-4 pb-8">
      {/* mode toggle */}
      <div className="flex gap-2">
        {modes.map(([m, label, n]) => {
          const on = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-btn px-3 py-2.5 text-[12.5px] font-extrabold transition-colors ${on ? 'bg-ink text-white shadow-cta-sm' : 'bg-lilac-2 text-ink-2'}`}
            >
              {label}
              {n > 0 && <span className={`rounded-full px-1.5 py-px text-[9px] font-extrabold text-white ${on ? 'bg-primary' : 'bg-pink-dark'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      {isFree && (
        <div className="flex flex-wrap items-center gap-3 rounded-card-sm bg-amber-bg p-4">
          <span className="text-[20px]">⚠️</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold text-ink">{L('Pedidos y reseñas necesitan verificación.', 'Orders & reviews need verification.')}</span>
            <span className="block text-[11.5px] font-semibold text-amber-ink">{L('Verifica tu negocio para desbloquear pedidos, respuestas y lealtad.', 'Verify your business to unlock orders, replies and loyalty.')}</span>
          </span>
          <button onClick={() => ctx.go('billing')} className="flex-none cursor-pointer rounded-btn bg-ink px-3.5 py-2 text-[12px] font-extrabold text-white">{L('Verificar', 'Verify')}</button>
        </div>
      )}

      {mode === 'customers' && customersView}
      {mode === 'orders' && ordersView}
      {mode === 'reviews' && reviewsView}

      {!isPremium && mode === 'reviews' && (
        <div className="flex flex-wrap items-center gap-3 rounded-card-sm p-4 text-white shadow-band" style={{ background: 'linear-gradient(140deg,#1E1B2E,#3A2E6E)' }}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-[rgba(244,183,64,.2)]"><Sparkles size={18} className="text-amber" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-extrabold">{L('Respuestas con IA en un toque', 'One-tap AI replies')}</span>
            <span className="block text-[11.5px] font-semibold leading-snug text-[rgba(255,255,255,.7)]">{L('Premium redacta respuestas según el tono de tu marca. $49/mes.', 'Premium drafts replies in your brand voice. $49/mo.')}</span>
          </span>
          <button onClick={() => ctx.go('billing')} className="flex-none cursor-pointer rounded-btn bg-amber px-4 py-2.5 text-[12px] font-extrabold text-ink">{L('Mejorar', 'Upgrade')}</button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-4 py-3 text-[12.5px] font-bold text-white shadow-modal">
          <Check size={14} strokeWidth={2.6} className="text-[#7BE0A8]" />
          {toast}
        </div>
      )}
    </div>
  );
}
