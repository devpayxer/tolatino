'use client';

// Menú de comida / Food module (business dashboard). The largest module.
// 7 sub-tabs (Platillos / Categorías / Modificadores / Horarios / Promociones /
// Alérgenos / Stock 86) plus a 6-step "add item" wizard with a live preview
// card, an edit bottom-sheet, stock/86 toggles and toasts. Mobile-first: item
// grid + wizard collapse to one column; on desktop they expand to a multi-column
// grid with a sticky preview/side rail. Real state: sub-tab, filters, edit sheet,
// wizard step + draft fields, per-row toggles, toasts.

import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle, Cake, Calendar, Check, ChevronRight, Clock, Coffee, Copy, Croissant,
  Gift, Info, LayoutGrid, Link2, Pizza, Plus, Salad, Search, ShieldCheck, ShoppingBag,
  Sparkles, Tag, Truck, Upload, Utensils, Wine, X, Zap,
} from 'lucide-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';

// ---------- domain types ----------
type Stock = 'in' | 'low' | 'out';
type CatId = 'bread' | 'pastry' | 'pizza' | 'pasta' | 'salad' | 'drinks' | 'wine';
type Item = {
  id: number; name: string; cat: CatId; price: number; es: string; en: string;
  diet: string[]; stock: Stock; popular: boolean; isNew: boolean; loves: number; visible: boolean;
};
type Cat = { id: CatId; es: string; en: string; tile: string; Icon: LucideIcon };

const CATS: Cat[] = [
  { id: 'bread', es: 'Pan y panes', en: 'Bread & loaves', tile: '#F3E2CE 0 8px,#ECD3B4 8px 16px', Icon: Croissant },
  { id: 'pastry', es: 'Pan dulce', en: 'Pastries', tile: '#FBEFD3 0 8px,#F5E1B0 8px 16px', Icon: Cake },
  { id: 'pizza', es: 'Pizza', en: 'Pizza', tile: '#FCE3DC 0 8px,#F6CEC2 8px 16px', Icon: Pizza },
  { id: 'pasta', es: 'Pasta', en: 'Pasta', tile: '#FCE3DC 0 8px,#F6CEC2 8px 16px', Icon: Utensils },
  { id: 'salad', es: 'Ensaladas', en: 'Salads', tile: '#E3F5EA 0 8px,#D6E7D0 8px 16px', Icon: Salad },
  { id: 'drinks', es: 'Café y té', en: 'Coffee & tea', tile: '#EDE0D4 0 8px,#DFCBB6 8px 16px', Icon: Coffee },
  { id: 'wine', es: 'Vino y cócteles', en: 'Wine & cocktails', tile: '#F3D9E2 0 8px,#E8BFCD 8px 16px', Icon: Wine },
];
const catOf = (id: CatId) => CATS.find((c) => c.id === id) ?? CATS[0];
const money = (n: number | string) => '$' + Number(n || 0).toFixed(2);

type Draft = {
  name: string; desc: string; cat: CatId; price: string; compareAt: string;
  channels: Record<string, boolean>; sched: string; days: number[];
  mods: Record<string, boolean>; diet: string[]; allergens: number[];
  flags: Record<string, boolean>; dailyLimit: string; visible: boolean; publishMode: string;
  rules: Record<number, boolean>; photos: number;
};
const newDraft = (): Draft => ({
  name: '', desc: '', cat: 'pizza', price: '', compareAt: '',
  channels: { dinein: true, pickup: true, delivery: true, catering: false },
  sched: 'all-day', days: [1, 1, 1, 1, 1, 1, 1], mods: {}, diet: ['Vegetariano'],
  allergens: [0, 0, 0, 0, 0, 0], flags: { isNew: true, popular: false, featured: false },
  dailyLimit: '', visible: true, publishMode: 'now', rules: { 0: true, 1: true, 2: false }, photos: 0,
});

// ---------- shared UI atoms ----------
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-[25px] w-[42px] flex-none cursor-pointer rounded-full transition-colors ${on ? 'bg-primary' : 'bg-lilac-line'}`}
      aria-pressed={on}
    >
      <span className={`absolute top-[3px] h-[19px] w-[19px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.18)] transition-all ${on ? 'left-[20px]' : 'left-[3px]'}`} />
    </button>
  );
}

const chip = (on: boolean) =>
  `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;

const sectionLabel = 'text-[10px] font-extrabold uppercase tracking-[.06em] text-muted-faint';
const fieldLabel = 'mb-1.5 text-[11px] font-extrabold text-ink-soft';
const inputCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted focus:border-primary';
const addBtn = 'mt-3.5 w-full cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-app py-3 text-[12.5px] font-extrabold text-primary-dark';

const STOCK_META: Record<Stock, { es: string; en: string; badge: string; dot: string }> = {
  in: { es: 'En stock', en: 'In stock', badge: 'bg-green-bg text-green-dark', dot: 'bg-green-dark' },
  low: { es: 'Bajo · 6', en: 'Low · 6', badge: 'bg-amber-bg text-amber-ink', dot: 'bg-amber-ink' },
  out: { es: 'Agotado', en: 'Sold out', badge: 'bg-pink-bg text-pink-dark', dot: 'bg-pink-dark' },
};

// =====================================================================
export function FoodModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es, ci } = ctx;
  void tab;

  const seed = useMemo<Item[]>(
    () => [
      { id: 1, name: 'Country Loaf', cat: 'bread', price: 12, es: 'Pan de campo de masa madre. Trigo integral, horneado a diario.', en: 'Naturally-leavened country bread. Whole wheat, baked daily.', diet: ['V'], stock: 'in', popular: true, isNew: false, loves: 184, visible: true },
      { id: 2, name: 'Pizza Margherita', cat: 'pizza', price: 18, es: 'Tomate San Marzano, fior di latte, albahaca, AOVE. 90 seg al horno.', en: 'San Marzano tomato, fior di latte, basil. Wood-fired 90 sec.', diet: ['V'], stock: 'in', popular: true, isNew: false, loves: 142, visible: true },
      { id: 3, name: 'Morning Bun', cat: 'pastry', price: 5, es: 'Masa de croissant con azúcar de canela y naranja.', en: 'Croissant dough with cinnamon-orange sugar.', diet: ['V'], stock: 'low', popular: false, isNew: true, loves: 126, visible: true },
      { id: 4, name: 'Menú degustación', cat: 'wine', price: 140, es: '5 tiempos, maridaje opcional (+$60). Mar–Dom, solo cena.', en: '5 courses, optional pairing (+$60). Tue–Sun, dinner only.', diet: [], stock: 'in', popular: true, isNew: false, loves: 42, visible: true },
      { id: 5, name: 'Ensalada de jitomate', cat: 'salad', price: 13, es: 'Jitomates heirloom, albahaca, sal de mar, AOVE.', en: 'Heritage tomatoes, basil, sea salt, EVOO.', diet: ['VG'], stock: 'in', popular: false, isNew: true, loves: 38, visible: true },
      { id: 6, name: 'Tiramisú', cat: 'pastry', price: 9, es: 'Clásico — savoiardi al espresso, mascarpone, cacao.', en: 'Classic — espresso savoiardi, mascarpone, cocoa.', diet: ['V'], stock: 'in', popular: false, isNew: false, loves: 58, visible: true },
      { id: 7, name: 'Cortado', cat: 'drinks', price: 4.5, es: 'Espresso y leche vaporizada a partes iguales.', en: 'Equal parts espresso & steamed milk.', diet: ['V'], stock: 'in', popular: false, isNew: false, loves: 320, visible: true },
      { id: 8, name: 'Masa madre sin gluten', cat: 'bread', price: 14, es: 'Receta sin gluten, fermento de 36h. Cantidad limitada.', en: 'Gluten-free recipe, 36-hour ferment. Limited daily.', diet: ['GF', 'V'], stock: 'out', popular: false, isNew: false, loves: 24, visible: true },
      { id: 9, name: 'Pizza anchoa y burrata', cat: 'pizza', price: 22, es: 'Anchoa del Cantábrico, burrata, limón, aceite de oliva.', en: 'Cantabrian anchovy, burrata, lemon, olive oil.', diet: [], stock: 'in', popular: false, isNew: false, loves: 72, visible: false },
    ],
    [],
  );

  const [items, setItems] = useState<Item[]>(seed);
  const [subtab, setSubtab] = useState<'items' | 'categories' | 'mods' | 'schedules' | 'promos' | 'allergens' | 'stock'>('items');
  const [view, setView] = useState<'module' | 'wizard' | 'success'>('module');
  const [cat, setCat] = useState<'all' | CatId>('all');
  const [query, setQuery] = useState('');
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [edit, setEdit] = useState<Item | null>(null);
  const [wizStep, setWizStep] = useState(0);
  const [wizMax, setWizMax] = useState(0);
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [catState, setCatState] = useState<Record<number, boolean>>({});
  const [daypartState, setDaypartState] = useState<Record<number, boolean>>({});
  const [ruleState, setRuleState] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: false });
  const [toast, setToast] = useState('');

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };
  const upDraft = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const lowCount = items.filter((i) => i.stock === 'low').length;
  const outCount = items.filter((i) => i.stock === 'out').length;
  const visibleCount = items.filter((i) => i.visible).length;

  const startAdd = () => { setDraft(newDraft()); setWizStep(0); setWizMax(0); setView('wizard'); };

  // ============ SUB-TAB CHIPS ============
  const subtabDefs: [typeof subtab, string][] = [
    ['items', L('Platillos', 'Items')],
    ['categories', L('Categorías', 'Categories')],
    ['mods', L('Modificadores', 'Modifiers')],
    ['schedules', L('Horarios', 'Schedules')],
    ['promos', L('Promociones', 'Promos')],
    ['allergens', L('Alérgenos', 'Allergens')],
    ['stock', L('Stock & 86', 'Stock & 86')],
  ];

  // ============ ITEMS ============
  const renderItems = () => {
    let filtered = cat === 'all' ? items : items.filter((i) => i.cat === cat);
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter((i) => (i.name + ' ' + i.es + ' ' + i.en).toLowerCase().includes(q));
    }

    const catFilters: ['all' | CatId, string, number][] = [
      ['all', L('Todos', 'All'), items.length],
      ...CATS.filter((c) => items.some((i) => i.cat === c.id)).map(
        (c) => [c.id, L(c.es, c.en), items.filter((i) => i.cat === c.id).length] as ['all' | CatId, string, number],
      ),
    ];

    const smartSets: [LucideIcon, string, number, string][] = [
      [Sparkles, L('Popular', 'Popular'), items.filter((i) => i.popular).length, 'text-amber-ink'],
      [Sparkles, L('Nuevo', 'New'), items.filter((i) => i.isNew).length, 'text-primary-dark'],
      [AlertTriangle, L('Bajo/agotado', 'Low/out'), lowCount + outCount, 'text-amber-ink'],
      [X, L('Ocultos', 'Hidden'), items.length - visibleCount, 'text-muted-2'],
    ];

    const sorted = [...items].sort((a, b) => b.loves - a.loves);
    const maxLoves = sorted[0]?.loves || 1;
    const barCs = ['#4F46E5', '#7C6BFF', '#A78BFA', '#F4B740', '#10B981'];
    const top5 = sorted.slice(0, 5);

    const attention = [
      ...items.filter((i) => i.stock === 'out').map((i) => ({
        rose: true, title: `${i.name} — ${L('agotado', 'out of stock')}`,
        sub: L('86’d en tu listado. Los clientes ven “Agotado hoy”.', 'Customers see “Sold out today”.'),
        action: L('Reabastecer', 'Restock'),
      })),
      ...items.filter((i) => i.stock === 'low').map((i) => ({
        rose: false, title: `${i.name} — ${L('bajo stock', 'low stock')}`,
        sub: L('Marca en stock al reabastecer.', 'Mark in-stock once replenished.'),
        action: L('En stock', 'In stock'),
      })),
    ];

    const perfCard = (
      <div className={`${cardCls} p-4`}>
        <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Rendimiento del menú · 30 días', 'Menu performance · 30 days')}</div>
        <div className="mb-3 grid grid-cols-3 gap-2.5">
          {[
            [L('Ingresos', 'Revenue'), '$48.2k', '▲ 18%'],
            [L('Precio prom.', 'Avg price'), '$14.20', '▲ 4%'],
            [L('Más amado', 'Most loved'), 'Country Loaf', '184 ♥'],
          ].map(([lab, val, delta]) => (
            <div key={lab} className="rounded-btn-lg bg-app p-2.5">
              <div className="text-[9px] font-bold text-muted-2">{lab}</div>
              <div className="mt-1 text-[15px] font-extrabold leading-tight text-ink">{val}</div>
              <div className="mt-0.5 text-[9px] font-extrabold text-green">{delta}</div>
            </div>
          ))}
        </div>
        <div className={`mb-2 ${sectionLabel}`}>{L('Top 5 por ♥', 'Top 5 by ♥')}</div>
        {top5.map((i, idx) => (
          <div key={i.id} className="flex items-center gap-2.5 py-1.5">
            <span className="w-4 flex-none text-[11px] font-extrabold text-muted-faint">{idx + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="mb-1 flex justify-between text-[11.5px] font-bold text-ink">
                <span className="truncate">{i.name}</span>
                <span className="flex-none text-muted-2">{i.loves} ♥ · {money(i.price)}</span>
              </span>
              <span className="block h-[5px] overflow-hidden rounded-full bg-lilac-2">
                <span className="block h-full rounded-full" style={{ width: `${Math.round((i.loves / maxLoves) * 100)}%`, background: barCs[idx] }} />
              </span>
            </span>
          </div>
        ))}
      </div>
    );

    const attnCard = attention.length > 0 && (
      <div className={`${cardCls} p-4`}>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-ink">
            <AlertTriangle size={14} strokeWidth={2.2} className="text-amber-ink" />{L('Requiere atención', 'Needs attention')}
          </span>
          <span className="rounded-md bg-amber-bg px-2 py-0.5 text-[9.5px] font-extrabold text-amber-ink">{lowCount + outCount}</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {attention.map((a) => (
            <div key={a.title} className={`flex items-center gap-2.5 rounded-btn-lg border p-2.5 ${a.rose ? 'border-pink-bg bg-pink-bg/40' : 'border-amber-bg bg-amber-bg/40'}`}>
              <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-white ${a.rose ? 'text-pink-dark' : 'text-amber-ink'}`}>
                {a.rose ? <X size={13} strokeWidth={2.8} /> : <AlertTriangle size={13} strokeWidth={2.4} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[11.5px] font-extrabold ${a.rose ? 'text-pink-dark' : 'text-amber-ink'}`}>{a.title}</span>
                <span className="block text-[10.5px] font-medium leading-snug text-muted-2">{a.sub}</span>
              </span>
              <button className="flex-none cursor-pointer self-center rounded-lg border border-hair-strong bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-ink">{a.action}</button>
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          {/* listing link banner */}
          <div className="flex items-center gap-3 rounded-tile bg-lilac-2 p-3">
            <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-primary"><Link2 size={15} className="text-white" strokeWidth={2.2} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-extrabold text-ink">{L('Este menú alimenta tu listado', 'This menu powers your listing')}</span>
              <span className="block text-[10.5px] font-medium leading-snug text-ink-3">{L('Cada cambio aparece en tu página pública.', 'Every edit appears on your public page.')}</span>
            </span>
          </div>

          {/* search */}
          <div className="flex items-center gap-2.5 rounded-field border border-hair-strong bg-white px-3 py-2.5">
            <Search size={15} className="text-muted-2" strokeWidth={2.2} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L('Buscar platillos, ingredientes…', 'Search items, ingredients…')} className="min-w-0 flex-1 border-none bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-muted-2" />
          </div>

          {/* category filter */}
          <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1 py-1">
            {catFilters.map(([id, label, n]) => (
              <button key={id} onClick={() => setCat(id)} className={chip(cat === id)}>
                {label}<span className={`ml-1.5 font-extrabold ${cat === id ? 'text-white/80' : 'text-muted-2'}`}>{n}</span>
              </button>
            ))}
          </div>

          {/* smart sets */}
          <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
            {smartSets.map(([Icon, label, n, c]) => (
              <span key={label} className="flex flex-none items-center gap-1.5 rounded-full border border-hair bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink-2">
                <Icon size={12} strokeWidth={2.2} className={c} />{label}<span className="font-extrabold text-ink">{n}</span>
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between px-0.5">
            <span className="text-[13px] font-extrabold text-ink">
              {cat === 'all' ? L('Todos los platillos', 'All items') : L(catOf(cat).es, catOf(cat).en)} <span className="text-muted-2">{filtered.length}</span>
            </span>
            <span className="text-[11px] font-semibold text-muted-2">{lowCount}{L(' bajo · ', ' low · ')}{outCount} 86&apos;d</span>
          </div>

          {/* item cards */}
          <div className="grid gap-2.5 md:grid-cols-2">
            {filtered.length === 0 ? (
              <div className={`${cardCls} col-span-full p-9 text-center text-[13px] font-semibold text-muted`}>
                {L('Ningún platillo coincide con tu búsqueda.', 'No items match your search.')}
              </div>
            ) : filtered.map((i) => {
              const c = catOf(i.cat); const sm = STOCK_META[i.stock];
              const ribbon = i.isNew || i.stock === 'low';
              return (
                <button
                  key={i.id}
                  onClick={() => { setSheetId(i.id); setEdit({ ...i }); }}
                  className="flex cursor-pointer gap-3 rounded-tile border border-hair bg-white p-3 text-left"
                  style={{ opacity: i.visible ? 1 : 0.6 }}
                >
                  <span className="relative h-[62px] w-[62px] flex-none overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${c.tile})` }}>
                    {ribbon && (
                      <span className={`absolute left-0 top-0 rounded-br-[7px] px-1.5 py-0.5 text-[8px] font-extrabold text-white ${i.isNew ? 'bg-primary' : 'bg-amber'}`}>
                        {i.isNew ? L('Nuevo', 'New') : L('Bajo', 'Low')}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[13.5px] font-extrabold text-ink">{i.name}</span>
                      <span className="flex-none text-[13.5px] font-extrabold text-ink">{money(i.price)}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[11px] font-medium leading-snug text-muted">{L(i.es, i.en)}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9.5px] font-extrabold ${sm.badge}`}>
                        <span className={`h-[5px] w-[5px] rounded-full ${sm.dot}`} />{L(sm.es, sm.en)}
                      </span>
                      <span className="rounded-md bg-lilac-2 px-2 py-0.5 text-[9.5px] font-bold text-ink-2">{L(c.es, c.en)}</span>
                      {i.popular && <span className="rounded-md bg-amber-bg px-2 py-0.5 text-[9.5px] font-extrabold text-amber-ink">🔥 {L('Popular', 'Popular')}</span>}
                      {i.diet.map((d) => <span key={d} className="rounded-md bg-green-bg px-1.5 py-0.5 text-[9px] font-extrabold text-green-dark">{d}</span>)}
                      {!i.visible && <span className="rounded-md bg-lilac-line px-2 py-0.5 text-[9.5px] font-extrabold text-muted-2">{L('Oculto', 'Hidden')}</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <button onClick={startAdd} className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[14px] font-extrabold text-white shadow-cta-sm">
            <Plus size={16} strokeWidth={2.6} />{L('Agregar platillo', 'Add item')}
          </button>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-[74px]">
          {perfCard}
          {attnCard}
        </div>
      </div>
    );
  };

  // ============ CATEGORIES ============
  const renderCategories = () => {
    const catData = [
      { id: 1, es: 'Pan y panes', en: 'Bread & loaves', n: 14, Icon: Croissant, tile: '#F3E2CE 0 8px,#ECD3B4 8px 16px', sEs: 'Todo el día', sEn: 'All day' },
      { id: 2, es: 'Pan dulce', en: 'Pastries', n: 18, Icon: Cake, tile: '#FBEFD3 0 8px,#F5E1B0 8px 16px', sEs: 'Mañana · 7–11', sEn: 'Morning · 7–11' },
      { id: 3, es: 'Pizza', en: 'Pizza', n: 9, Icon: Pizza, tile: '#FCE3DC 0 8px,#F6CEC2 8px 16px', sEs: 'Cena · 5–10', sEn: 'Dinner · 5–10' },
      { id: 4, es: 'Pasta', en: 'Pasta', n: 7, Icon: Utensils, tile: '#FCE3DC 0 8px,#F6CEC2 8px 16px', sEs: 'Cena · 5–10', sEn: 'Dinner · 5–10' },
      { id: 5, es: 'Ensaladas', en: 'Salads', n: 6, Icon: Salad, tile: '#E3F5EA 0 8px,#D6E7D0 8px 16px', sEs: 'Comida y cena', sEn: 'Lunch & dinner' },
      { id: 6, es: 'Vino y cócteles', en: 'Wine & cocktails', n: 24, Icon: Wine, tile: '#F3D9E2 0 8px,#E8BFCD 8px 16px', sEs: 'Desde 4 PM', sEn: 'From 4 PM' },
      { id: 9, es: 'Menú infantil', en: 'Kids menu', n: 5, Icon: Cake, tile: '#FBEFD3 0 8px,#F5E1B0 8px 16px', sEs: 'Todo el día', sEn: 'All day', off: true },
    ];
    const isOn = (c: (typeof catData)[number]) => catState[c.id] ?? !c.off;
    return (
      <div>
        <div className="mb-3 text-[11.5px] font-medium leading-relaxed text-muted">
          {catData.length}{L(' categorías · arrastra para ordenar · activa/desactiva para mostrar', ' categories · drag to order · toggle to show')}
        </div>
        <div className="grid gap-2.5 md:grid-cols-2">
          {catData.map((c) => {
            const on = isOn(c);
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-btn-lg border border-hair bg-white p-3" style={{ opacity: on ? 1 : 0.6 }}>
                <span className="relative flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${c.tile})` }}>
                  <c.Icon size={18} className="text-white" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[13px] font-extrabold text-ink">{L(c.es, c.en)}</span>
                    {!on && <span className="rounded bg-lilac-line px-1.5 py-0.5 text-[8.5px] font-extrabold text-muted-2">{L('Oculto', 'Hidden')}</span>}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded bg-lilac-2 px-1.5 py-0.5 text-[9px] font-bold text-ink-2">🕐 {L(c.sEs, c.sEn)}</span>
                    <span className="text-[10px] font-semibold text-muted-2">{c.n} {L('platillos', 'items')}</span>
                  </span>
                </span>
                <Toggle on={on} onClick={() => setCatState((s) => ({ ...s, [c.id]: !on }))} />
              </div>
            );
          })}
        </div>
        <button className={addBtn}>+ {L('Agregar categoría', 'Add category')}</button>
      </div>
    );
  };

  // ============ MODIFIERS ============
  const renderMods = () => {
    const modGroups = [
      { es: 'Tamaño', en: 'Size', single: true, req: true, used: L('9 platillos', '9 items'), opts: [['Personal 8"', '+$0'], ['Estándar 12"', '+$0'], ['Grande 16"', '+$6']] },
      { es: 'Extras', en: 'Add-ons', single: false, req: false, used: L('9 platillos', '9 items'), opts: [['Anchoa', '+$2'], ['Burrata', '+$4'], ['Trufa', '+$8']] },
      { es: 'Masa', en: 'Crust', single: true, req: true, used: L('9 platillos', '9 items'), opts: [['Original', '+$0'], ['Sin gluten', '+$3'], ['Masa madre', '+$0']] },
      { es: 'Tipo de leche', en: 'Milk choice', single: true, req: false, used: L('8 platillos', '8 items'), opts: [['Entera', '+$0'], ['Avena', '+$.75'], ['Almendra', '+$.75']] },
      { es: 'Maridaje de vino', en: 'Wine pairing', single: true, req: false, used: L('2 platillos', '2 items'), opts: [['Sin maridaje', '+$0'], ['Estándar', '+$60'], ['Reserva', '+$120']] },
    ];
    return (
      <div>
        <div className="mb-3.5 flex items-center gap-3 rounded-tile bg-lilac-2 p-3">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-primary"><Zap size={15} className="text-white" strokeWidth={2.2} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-extrabold text-ink">{L('Reutilizables en tus platillos', 'Reusable across items')}</span>
            <span className="block text-[10.5px] font-medium leading-snug text-ink-3">{L('Crea un grupo una vez, úsalo en cualquier platillo.', 'Build a group once, use it on any item.')}</span>
          </span>
        </div>
        <div className="grid gap-2.5 md:grid-cols-2">
          {modGroups.map((m) => (
            <div key={m.es} className="rounded-btn-lg border border-hair bg-white p-3.5">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-[13px] font-extrabold text-ink">{L(m.es, m.en)}</span>
                {m.req && <span className="rounded bg-lilac px-1.5 py-0.5 text-[8.5px] font-extrabold text-primary-dark">{L('Obligatorio', 'Required')}</span>}
                <span className="ml-auto text-[10px] font-semibold text-muted-2">{m.single ? L('Elige uno', 'Choose one') : L('Elige varios', 'Choose multiple')} · {m.used}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.opts.map(([label, price]) => (
                  <span key={label} className="rounded-lg border border-hair bg-app px-2.5 py-1.5 text-[10.5px] font-bold text-ink-soft">
                    {label} <span className={price === '+$0' ? 'text-muted-2' : 'text-ink'}>{price}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className={addBtn}>+ {L('Nuevo grupo', 'New group')}</button>
      </div>
    );
  };

  // ============ SCHEDULES ============
  const renderSchedules = () => {
    const startH = 7, totalH = 16;
    const dayLabels = es ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const dp = [
      { es: 'Mañana · Pan dulce y café', en: 'Morning · Pastries & coffee', color: '#F59E0B', bg: '#FEF3C7', span: [7, 11], lane: 0, days: [1, 1, 1, 1, 1, 1, 1], items: 26, time: '7:00–11:00 AM' },
      { es: 'Comida', en: 'Lunch', color: '#22C55E', bg: '#DCFCE7', span: [11, 14], lane: 0, days: [1, 1, 1, 1, 1, 1, 1], items: 32, time: '11:00 AM–2:00 PM' },
      { es: 'Cena · Pizza y pasta', en: 'Dinner · Pizza & pasta', color: '#7B61FF', bg: '#EFEBFF', span: [17, 22], lane: 0, days: [0, 1, 1, 1, 1, 1, 1], items: 41, time: '5:00–10:00 PM' },
      { es: 'Vino y cócteles', en: 'Wine & cocktails', color: '#D6336C', bg: '#FDE7EF', span: [16, 22], lane: 1, days: [1, 1, 1, 1, 1, 1, 1], items: 24, time: '4:00–10:00 PM' },
    ];
    const dpOn = (i: number) => daypartState[i] ?? true;
    return (
      <div>
        <div className="mb-3 text-[11.5px] font-medium leading-relaxed text-muted">{L('Define qué se muestra y cuándo a lo largo del día.', 'Set what shows and when through the day.')}</div>
        {/* week mini grid */}
        <div className={`mb-3.5 ${cardCls} p-3.5`}>
          <div className="mb-3 text-[12.5px] font-extrabold text-ink">{L('Horario semanal del menú', 'Weekly menu schedule')}</div>
          {dayLabels.map((d, di) => (
            <div key={di} className="mb-1.5 flex items-center gap-2.5">
              <span className="w-[26px] flex-none text-[10.5px] font-bold text-ink-2">{d}</span>
              <span className="relative h-[18px] flex-1 overflow-hidden rounded-md bg-app">
                {dp.map((p, pi) => (p.days[di] && dpOn(pi) ? (
                  <span key={pi} className="absolute h-[7px] rounded-[3px] opacity-90" style={{ top: p.lane === 0 ? 2 : 9, left: `${((p.span[0] - startH) / totalH) * 100}%`, width: `${((p.span[1] - p.span[0]) / totalH) * 100}%`, background: p.color }} />
                ) : null))}
              </span>
            </div>
          ))}
          <div className="mt-2.5 flex flex-wrap gap-3 border-t border-hair pt-2.5">
            {dp.slice(0, 3).map((p) => (
              <span key={p.es} className="flex items-center gap-1.5 text-[9.5px] font-bold text-ink-2">
                <span className="h-2 w-2 rounded-[3px]" style={{ background: p.color }} />{L(p.es, p.en).split(' · ')[0]}
              </span>
            ))}
          </div>
        </div>
        <div className="mb-2.5 px-0.5 text-[12px] font-extrabold text-ink">{L('Franjas del día', 'Dayparts')}</div>
        <div className="grid gap-2.5 md:grid-cols-2">
          {dp.map((p, i) => {
            const on = dpOn(i);
            return (
              <div key={p.es} className="flex items-center gap-3 rounded-tile border border-hair bg-white p-3" style={{ opacity: on ? 1 : 0.6 }}>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px]" style={{ background: p.bg }}><Clock size={16} style={{ color: p.color }} strokeWidth={2.2} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-extrabold text-ink">{L(p.es, p.en)}</span>
                  <span className="block text-[10.5px] font-medium text-muted-2">{p.time} · {p.items} {L('platillos', 'items')}</span>
                </span>
                <Toggle on={on} onClick={() => setDaypartState((s) => ({ ...s, [i]: !on }))} />
              </div>
            );
          })}
        </div>
        <button className={addBtn}>+ {L('Nueva franja', 'New daypart')}</button>
      </div>
    );
  };

  // ============ PROMOTIONS ============
  const renderPromos = () => {
    const stats: [string, string, string?][] = [
      [L('Activas', 'Active'), '4'],
      [L('Canjes · 30d', 'Redeems · 30d'), '840', '▲ 18%'],
      [L('Ingreso promo', 'Promo rev'), '$10.3k', '▲ 12%'],
    ];
    const promoTypes: [LucideIcon, string, string, string, string][] = [
      [Tag, L('% descuento', '% off'), L('Descuento porcentual', 'Percentage discount'), '#4338CA', '#EFEBFF'],
      [ShoppingBag, 'Combo', L('Agrupa a un precio', 'Group at one price'), '#065F46', '#E3F5EA'],
      [Gift, 'BOGO', L('Compra uno, lleva uno', 'Buy one, get one'), '#9A3412', '#FCEFD6'],
      [Clock, 'Happy hour', L('Precio por horario', 'Time-based pricing'), '#9F1239', '#FDE7EF'],
    ];
    const promos = [
      { es: 'Domingos de masa madre', en: 'Sourdough Sundays', type: '% off', typeCls: 'bg-lilac text-primary-dark', status: L('Activa', 'Active'), statusCls: 'bg-green-bg text-green-dark', dEs: '20% en todos los panes los domingos', dEn: '20% off all loaves on Sundays', redeem: '184', rev: '$2,940', tile: '#F3E2CE 0 8px,#ECD3B4 8px 16px', op: 1 },
      { es: 'Happy hour de vino', en: 'Happy hour wine', type: L('Horario', 'Time deal'), typeCls: 'bg-pink-bg text-pink-dark', status: L('Activa', 'Active'), statusCls: 'bg-green-bg text-green-dark', dEs: 'Copas de la casa a $8, 4–6 PM', dEn: '$8 house wine, 4–6 PM', redeem: '312', rev: '$2,496', tile: '#F3D9E2 0 8px,#E8BFCD 8px 16px', op: 1 },
      { es: 'Compra pizza, llévate tiramisú', en: 'Buy a pizza, get a tiramisù', type: 'BOGO', typeCls: 'bg-amber-bg text-amber-ink', status: L('Programada', 'Scheduled'), statusCls: 'bg-amber-bg text-amber-ink', dEs: 'Tiramisú gratis con cualquier pizza', dEn: 'Free tiramisù with any pizza', redeem: '—', rev: '—', tile: '#FCE3DC 0 8px,#F6CEC2 8px 16px', op: 0.85 },
    ];
    return (
      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3.5 grid grid-cols-3 gap-2.5">
            {stats.map(([lab, val, delta]) => (
              <div key={lab} className={`${cardCls} p-3`}>
                <div className="text-[9px] font-bold text-muted-2">{lab}</div>
                <div className="mt-0.5 text-[19px] font-extrabold text-ink">{val}</div>
                {delta && <div className="text-[9px] font-extrabold text-green">{delta}</div>}
              </div>
            ))}
          </div>
          <div className={`mb-2.5 ${sectionLabel}`}>{L('Tus promociones', 'Your promotions')}</div>
          <div className="grid gap-3 md:grid-cols-2">
            {promos.map((p) => (
              <div key={p.es} className="overflow-hidden rounded-tile border border-hair bg-white" style={{ opacity: p.op }}>
                <div className="relative h-16" style={{ background: `repeating-linear-gradient(135deg,${p.tile})` }}>
                  <span className={`absolute left-2.5 top-2.5 rounded-md px-2 py-0.5 text-[9px] font-extrabold ${p.typeCls}`}>{p.type}</span>
                  <span className={`absolute right-2.5 top-2.5 rounded-md px-2 py-0.5 text-[9px] font-extrabold ${p.statusCls}`}>{p.status}</span>
                </div>
                <div className="p-3">
                  <div className="text-[13.5px] font-extrabold text-ink">{L(p.es, p.en)}</div>
                  <div className="mt-1 text-[11px] font-medium leading-snug text-ink-3">{L(p.dEs, p.dEn)}</div>
                  <div className="mt-2.5 flex gap-5 border-t border-hair pt-2.5">
                    <div><div className="text-[9px] font-bold text-muted-2">{L('Canjeado', 'Redeemed')}</div><div className="text-[14px] font-extrabold text-ink">{p.redeem}</div></div>
                    <div><div className="text-[9px] font-bold text-muted-2">{L('Ingresos', 'Revenue')}</div><div className="text-[14px] font-extrabold text-ink">{p.rev}</div></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="xl:sticky xl:top-[74px]">
          <div className={`${cardCls} p-4`}>
            <div className={`mb-2.5 ${sectionLabel}`}>{L('Crear promoción', 'Create a promotion')}</div>
            <div className="flex flex-col gap-2.5">
              {promoTypes.map(([Icon, label, sub, c, bg]) => (
                <button key={label} className="flex cursor-pointer items-center gap-3 rounded-btn-lg border border-hair bg-white p-2.5 text-left">
                  <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px]" style={{ background: bg }}><Icon size={16} style={{ color: c }} strokeWidth={2.2} /></span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-extrabold text-ink">{label}</span>
                    <span className="block text-[9.5px] font-medium leading-snug text-muted-2">{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ ALLERGENS ============
  const renderAllergens = () => {
    const cols = es ? ['Gluten', 'Lácteo', 'Huevo', 'Nuez', 'Soya', 'Marisco', 'Ajonjolí'] : ['Gluten', 'Dairy', 'Eggs', 'Nuts', 'Soy', 'Shell', 'Sesame'];
    const rows: { nm: string; cat: CatId; a: number[] }[] = [
      { nm: 'Country Loaf', cat: 'bread', a: [2, 0, 0, 0, 0, 0, 1] },
      { nm: 'Masa madre GF', cat: 'bread', a: [0, 0, 0, 0, 0, 0, 1] },
      { nm: 'Pizza Margherita', cat: 'pizza', a: [2, 2, 0, 0, 0, 0, 0] },
      { nm: 'Pizza anchoa burrata', cat: 'pizza', a: [2, 2, 0, 0, 0, 2, 0] },
      { nm: 'Morning Bun', cat: 'pastry', a: [2, 2, 2, 1, 0, 0, 0] },
      { nm: 'Tiramisú', cat: 'pastry', a: [2, 2, 2, 0, 0, 0, 0] },
    ];
    const cell = (v: number) =>
      v === 2 ? <span className="flex h-5 w-5 items-center justify-center rounded-md bg-pink-bg text-[11px] font-extrabold text-pink-dark">✓</span>
        : v === 1 ? <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-bg text-[12px] font-extrabold text-amber-ink">~</span>
          : <span className="h-1.5 w-1.5 rounded-full bg-lilac-line" />;
    return (
      <div>
        <div className="mb-3.5 flex items-center gap-3 rounded-tile bg-lilac-2 p-3">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-primary"><ShieldCheck size={15} className="text-white" strokeWidth={2.2} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-extrabold text-ink">{L('Los alérgenos se muestran en tu menú público', 'Allergens appear on your public menu')}</span>
            <span className="block text-[10.5px] font-medium leading-snug text-ink-3">{L('Marca con precisión. Los clientes filtran por necesidad dietética.', 'Mark accurately. Guests filter by dietary need.')}</span>
          </span>
        </div>
        <div className="mb-3 flex gap-4 px-0.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink-2"><span className="flex h-[18px] w-[18px] items-center justify-center rounded-md bg-pink-bg text-[10px] font-extrabold text-pink-dark">✓</span>{L('Contiene', 'Contains')}</span>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-ink-2"><span className="flex h-[18px] w-[18px] items-center justify-center rounded-md bg-amber-bg text-[11px] font-extrabold text-amber-ink">~</span>{L('Puede contener', 'May contain')}</span>
        </div>
        <div className={`min-w-0 overflow-x-auto ${cardCls}`}>
          <div className="min-w-[540px]">
            <div className="grid grid-cols-[1.6fr_repeat(7,1fr)] border-b border-hair bg-app px-3 py-2.5">
              <span className={sectionLabel}>{L('Platillo', 'Item')}</span>
              {cols.map((c) => <span key={c} className="text-center text-[8.5px] font-extrabold uppercase text-muted-faint">{c}</span>)}
            </div>
            {rows.map((r, ri) => (
              <div key={r.nm} className={`grid grid-cols-[1.6fr_repeat(7,1fr)] items-center px-3 py-2.5 ${ri < rows.length - 1 ? 'border-b border-hair' : ''}`}>
                <div className="min-w-0">
                  <div className="whitespace-nowrap text-[12px] font-bold text-ink">{r.nm}</div>
                  <div className="text-[9.5px] font-medium text-muted-2">{L(catOf(r.cat).es, catOf(r.cat).en)}</div>
                </div>
                {r.a.map((v, ci2) => <span key={ci2} className="flex justify-center">{cell(v)}</span>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ============ STOCK (86) ============
  const renderStock = () => {
    const stock86 = items.filter((i) => i.stock === 'out');
    const setStock = (id: number, s: Stock) => { setItems((xs) => xs.map((i) => (i.id === id ? { ...i, stock: s } : i))); flash(s === 'in' ? L('Platillo reabastecido', 'Item restocked') : L('Platillo 86’d', 'Item 86’d')); };
    const stockLow = [
      { name: 'Country Loaf', left: 14, limit: 80, pct: 18, tile: '#F3E2CE 0 8px,#ECD3B4 8px 16px' },
      { name: 'Morning Bun', left: 6, limit: 60, pct: 10, tile: '#FBEFD3 0 8px,#F5E1B0 8px 16px' },
      { name: 'Tiramisú', left: 9, limit: 40, pct: 22, tile: '#EDE0D4 0 8px,#DFCBB6 8px 16px' },
      { name: 'Mermelada 6oz', left: 5, limit: 24, pct: 21, tile: '#F3D9E2 0 8px,#E8BFCD 8px 16px' },
    ];
    const rules = [
      { es: 'Auto-86 al llegar a cero', en: 'Auto-86 at zero', sEs: 'Oculta del menú automáticamente.', sEn: 'Hide from menu automatically.' },
      { es: 'Avisar al personal en bajo stock', en: 'Notify staff at low stock', sEs: 'Alerta a la cocina bajo el umbral.', sEn: 'Alert the kitchen below threshold.' },
      { es: 'Reiniciar conteo diario a las 5 AM', en: 'Reset counts daily at 5 AM', sEs: 'Los límites se recargan cada mañana.', sEn: 'Daily limits refill each morning.' },
      { es: 'Permitir pedidos por adelantado', en: 'Allow back-orders', sEs: 'Pedir agotados para después.', sEn: 'Order out-of-stock for later.' },
    ];
    const inStock = items.filter((i) => i.stock === 'in').length;
    return (
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-3 gap-2.5">
            <div className={`${cardCls} p-3`}><div className="text-[9px] font-bold text-muted-2">{L('En stock', 'In stock')}</div><div className="mt-0.5 text-[19px] font-extrabold text-ink">{inStock}</div><div className="text-[9px] font-extrabold text-green">✓ {L('Disponible', 'Available')}</div></div>
            <div className="rounded-card-sm border border-amber-bg bg-amber-bg/40 p-3"><div className="text-[9px] font-bold text-amber-ink">{L('Bajo', 'Low')}</div><div className="mt-0.5 text-[19px] font-extrabold text-ink">{lowCount}</div><div className="text-[9px] font-extrabold text-amber-ink">⚠ {L('Reabastecer', 'Restock')}</div></div>
            <div className="rounded-card-sm border border-pink-bg bg-pink-bg/40 p-3"><div className="text-[9px] font-bold text-pink-dark">86&apos;d</div><div className="mt-0.5 text-[19px] font-extrabold text-ink">{outCount}</div><div className="text-[9px] font-extrabold text-pink-dark">✕ {L('Oculto', 'Hidden')}</div></div>
          </div>

          {/* 86'd list */}
          <div className="overflow-hidden rounded-tile border border-pink-bg bg-white">
            <div className="flex items-center gap-1.5 bg-pink-bg/50 px-3.5 py-2.5">
              <X size={14} className="text-pink-dark" strokeWidth={2.6} />
              <span className="text-[12px] font-extrabold text-pink-dark">{L('86’d ahora · oculto del menú', "Currently 86'd · hidden")}</span>
            </div>
            {stock86.length === 0 ? (
              <div className="px-3.5 py-5 text-center text-[12px] font-semibold text-muted">{L('Nada 86’d ahora mismo.', 'Nothing 86’d right now.')}</div>
            ) : stock86.map((s) => {
              const c = catOf(s.cat);
              return (
                <div key={s.id} className="flex items-center gap-3 border-t border-hair px-3.5 py-2.5">
                  <span className="h-10 w-10 flex-none rounded-[10px]" style={{ background: `repeating-linear-gradient(135deg,${c.tile})` }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-extrabold text-ink">{s.name}</span>
                    <span className="block text-[10px] font-medium text-pink-dark">{L('Regresa mañana 10 AM', 'Back tomorrow 10 AM')}</span>
                  </span>
                  <button onClick={() => setStock(s.id, 'in')} className="flex-none cursor-pointer self-center rounded-[9px] bg-primary px-3 py-2 text-[10px] font-extrabold text-white">{L('Reabastecer', 'Restock')}</button>
                </div>
              );
            })}
          </div>

          {/* in-stock items you can 86 */}
          <div>
            <div className="mb-2 px-0.5 text-[12px] font-extrabold text-ink">{L('Disponibles · toca para 86', 'Available · tap to 86')}</div>
            <div className="overflow-hidden rounded-tile border border-hair bg-white">
              {items.filter((i) => i.stock !== 'out').map((s, i, a) => {
                const c = catOf(s.cat);
                return (
                  <div key={s.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}>
                    <span className="h-9 w-9 flex-none rounded-[10px]" style={{ background: `repeating-linear-gradient(135deg,${c.tile})` }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-extrabold text-ink">{s.name}</span>
                      <span className={`block text-[10px] font-semibold ${s.stock === 'low' ? 'text-amber-ink' : 'text-muted-2'}`}>{s.stock === 'low' ? L('Bajo stock', 'Low stock') : L('En stock', 'In stock')}</span>
                    </span>
                    <button onClick={() => setStock(s.id, 'out')} className="flex-none cursor-pointer rounded-[9px] border border-pink-bg bg-white px-3 py-2 text-[10px] font-extrabold text-pink-dark">86</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* low stock */}
          <div>
            <div className="mb-2 px-0.5 text-[12px] font-extrabold text-ink">{L('Bajo stock', 'Low stock')}</div>
            <div className="overflow-hidden rounded-tile border border-hair bg-white">
              {stockLow.map((s, i, a) => (
                <div key={s.name} className={`flex items-center gap-3 px-3.5 py-2.5 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}>
                  <span className="h-10 w-10 flex-none rounded-[10px]" style={{ background: `repeating-linear-gradient(135deg,${s.tile})` }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-extrabold text-ink">{s.name}</span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-lilac-2"><span className="block h-full rounded-full" style={{ width: `${s.pct}%`, background: s.pct <= 15 ? '#D6336C' : '#9A6A12' }} /></span>
                      <span className="flex-none text-[10px] font-semibold text-muted-2">{s.left}/{s.limit}</span>
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* automation */}
          <div>
            <div className="mb-2 px-0.5 text-[12px] font-extrabold text-ink">{L('Automatización', 'Automation')}</div>
            <div className="rounded-tile border border-hair bg-white px-3.5">
              {rules.map((r, i, a) => {
                const on = ruleState[i] ?? false;
                return (
                  <div key={r.es} className={`flex items-center gap-3 py-3 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-bold text-ink">{L(r.es, r.en)}</span>
                      <span className="block text-[10px] font-medium leading-snug text-muted-2">{L(r.sEs, r.sEn)}</span>
                    </span>
                    <Toggle on={on} onClick={() => setRuleState((s) => ({ ...s, [i]: !on }))} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ WIZARD ============
  const draftCat = catOf(draft.cat);
  const chanDefs: [string, string, LucideIcon][] = [
    ['dinein', L('Mostrador', 'Dine-in'), Utensils],
    ['pickup', L('Recoger', 'Pickup'), ShoppingBag],
    ['delivery', L('Entrega', 'Delivery'), Truck],
    ['catering', 'Catering', Gift],
  ];
  const modLib: { id: string; es: string; en: string; req: boolean; Icon: LucideIcon; mEs: string; mEn: string }[] = [
    { id: 'size', es: 'Tamaño', en: 'Size', req: true, Icon: LayoutGrid, mEs: 'Elige uno · 3 opciones', mEn: 'Choose one · 3 options' },
    { id: 'toppings', es: 'Extras', en: 'Add-ons', req: false, Icon: Plus, mEs: 'Elige varios · máx 4', mEn: 'Choose multiple · max 4' },
    { id: 'crust', es: 'Masa', en: 'Crust', req: true, Icon: Pizza, mEs: 'Elige uno · 3 opciones', mEn: 'Choose one · 3 options' },
    { id: 'milk', es: 'Tipo de leche', en: 'Milk choice', req: false, Icon: Coffee, mEs: 'Elige uno · 4 opciones', mEn: 'Choose one · 4 options' },
    { id: 'wine', es: 'Maridaje', en: 'Wine pairing', req: false, Icon: Wine, mEs: 'Elige uno · 3 opciones', mEn: 'Choose one · 3 options' },
  ];
  const dietDefs = [L('Vegetariano', 'Vegetarian'), L('Vegano', 'Vegan'), L('Sin gluten', 'Gluten-free'), L('Sin lácteos', 'Dairy-free'), 'Halal', L('Picante', 'Spicy')];
  const algNames = es ? ['Gluten', 'Lácteo', 'Huevo', 'Nuez', 'Soya', 'Marisco'] : ['Gluten', 'Dairy', 'Eggs', 'Nuts', 'Soy', 'Shellfish'];
  const dayLabels = es ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const ready = !!draft.name && !!draft.price;

  const wizStepDefs = [
    L('Detalles', 'Details'), L('Precio', 'Pricing'), L('Modif.', 'Mods'),
    L('Dieta', 'Dietary'), L('Stock', 'Stock'), L('Revisar', 'Review'),
  ];
  const wizTitle = [
    L('Detalles del platillo', 'Item details'), L('Precio y canales', 'Pricing & channels'),
    L('Opciones y modificadores', 'Options & modifiers'), L('Dieta y alérgenos', 'Dietary & allergens'),
    L('Stock y disponibilidad', 'Stock & availability'), L('Revisar y publicar', 'Review & publish'),
  ][wizStep];

  const wizNext = () => {
    if (wizStep >= wizStepDefs.length - 1) { setView('success'); return; }
    const n = wizStep + 1; setWizStep(n); setWizMax((m) => Math.max(m, n));
  };
  const wizBack = () => { if (wizStep === 0) { setView('module'); return; } setWizStep((s) => s - 1); };
  const nextGated =
    wizStep === 0 ? !!draft.name.trim() :
      wizStep === 1 ? !!draft.price && chanDefs.some((c) => draft.channels[c[0]]) :
        true;

  const previewCard = (
    <div className="overflow-hidden rounded-tile border border-hair bg-white">
      <div className="relative h-[104px]" style={{ background: `repeating-linear-gradient(135deg,${draftCat.tile})` }}>
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          {draft.flags.isNew && <span className="rounded-md bg-lilac px-2 py-0.5 text-[9px] font-extrabold text-primary-dark">{L('Nuevo', 'New')}</span>}
          {draft.flags.popular && <span className="rounded-md bg-amber-bg px-2 py-0.5 text-[9px] font-extrabold text-amber-ink">{L('Popular', 'Popular')}</span>}
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2.5">
          <span className={`text-[15px] font-extrabold ${draft.name ? 'text-ink' : 'text-muted-faint'}`}>{draft.name || L('Nombre del platillo', 'Item name')}</span>
          <span className="flex-none text-[15px] font-extrabold text-ink">{draft.price ? '$' + draft.price : '$0.00'}</span>
        </div>
        <div className="mt-1 text-[11.5px] font-medium leading-relaxed text-ink-3">{draft.desc || L('La descripción aparece aquí…', 'Description appears here…')}</div>
      </div>
    </div>
  );

  const renderWizardStep = () => {
    if (wizStep === 0) return (
      <div className="flex flex-col gap-3.5">
        <div><div className={fieldLabel}>{L('Nombre del platillo', 'Item name')} *</div><input value={draft.name} onChange={(e) => upDraft({ name: e.target.value })} placeholder={L('Ej. Margherita al horno', 'e.g. Wood-fired Margherita')} className={inputCls} /></div>
        <div><div className={fieldLabel}>{L('Descripción', 'Description')}</div><textarea value={draft.desc} onChange={(e) => upDraft({ desc: e.target.value })} placeholder={L('Ingredientes clave, qué lo hace especial…', 'Key ingredients, what makes it special…')} rows={3} className={`${inputCls} resize-none`} /></div>
        <div>
          <div className={fieldLabel}>{L('Categoría', 'Category')} *</div>
          <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
            {CATS.map((c) => <button key={c.id} onClick={() => upDraft({ cat: c.id })} className={chip(draft.cat === c.id)}>{L(c.es, c.en)}</button>)}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Etiquetas', 'Flags')}</div>
          <div className="flex gap-2">
            {([['isNew', L('Nuevo', 'New')], ['popular', L('Popular', 'Popular')], ['featured', L('Destacado', 'Featured')]] as [string, string][]).map(([k, lab]) => (
              <button key={k} onClick={() => upDraft({ flags: { ...draft.flags, [k]: !draft.flags[k] } })} className={chip(!!draft.flags[k])}>{lab}</button>
            ))}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Fotos', 'Photos')}</div>
          <button onClick={() => upDraft({ photos: draft.photos > 0 ? 0 : 1 })} className="relative flex h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-tile border-[1.5px] border-dashed border-lilac-line bg-app">
            {draft.photos > 0 && <span className="absolute inset-0" style={{ background: `repeating-linear-gradient(135deg,${draftCat.tile})` }} />}
            {draft.photos === 0 && <>
              <Upload size={20} className="text-primary" strokeWidth={2} />
              <span className="text-[12px] font-bold text-ink-soft">{L('Arrastra o toca para subir', 'Drag or tap to upload')}</span>
              <span className="text-[10px] font-medium text-muted-2">{L('JPG o PNG · 4:3 ideal', 'JPG or PNG · 4:3 best')}</span>
            </>}
          </button>
        </div>
      </div>
    );

    if (wizStep === 1) return (
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Precio', 'Price')} *</div><div className="flex items-center rounded-field border-[1.5px] border-lilac-line px-3 focus-within:border-primary"><span className="text-[13px] font-bold text-muted-2">$</span><input value={draft.price} onChange={(e) => upDraft({ price: e.target.value })} placeholder="0.00" className="min-w-0 flex-1 border-none bg-transparent px-2 py-2.5 text-[13px] font-semibold text-ink outline-none" /></div></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Precio anterior', 'Compare-at')}</div><div className="flex items-center rounded-field border-[1.5px] border-lilac-line px-3 focus-within:border-primary"><span className="text-[13px] font-bold text-muted-2">$</span><input value={draft.compareAt} onChange={(e) => upDraft({ compareAt: e.target.value })} placeholder="—" className="min-w-0 flex-1 border-none bg-transparent px-2 py-2.5 text-[13px] font-semibold text-ink outline-none" /></div></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Se vende en', 'Sold in')}</div>
          <div className="grid grid-cols-2 gap-2">
            {chanDefs.map(([k, lab, Icon]) => {
              const on = draft.channels[k];
              return (
                <button key={k} onClick={() => upDraft({ channels: { ...draft.channels, [k]: !on } })} className={`flex items-center gap-2 rounded-field border-[1.5px] px-3 py-2.5 ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                  <span className={`flex h-4 w-4 flex-none items-center justify-center rounded ${on ? 'bg-primary' : 'bg-lilac-line'}`}>{on && <Check size={10} className="text-white" strokeWidth={3.4} />}</span>
                  <Icon size={15} strokeWidth={2} className={on ? 'text-primary-dark' : 'text-muted-2'} />
                  <span className="text-[12px] font-bold text-ink">{lab}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Horario', 'Schedule')}</div>
          <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
            {([['all-day', L('Todo el día', 'All day')], ['morning', L('Mañana', 'Morning')], ['lunch', L('Comida', 'Lunch')], ['dinner', L('Cena', 'Dinner')], ['weekends', L('Fines', 'Weekends')]] as [string, string][]).map(([k, lab]) => (
              <button key={k} onClick={() => upDraft({ sched: k })} className={chip(draft.sched === k)}>{lab}</button>
            ))}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Días disponibles', 'Days available')}</div>
          <div className="flex gap-1.5">
            {dayLabels.map((d, i) => (
              <button key={i} onClick={() => { const nd = [...draft.days]; nd[i] = nd[i] ? 0 : 1; upDraft({ days: nd }); }} className={`h-[34px] w-[34px] flex-none cursor-pointer rounded-[9px] text-[11px] font-extrabold ${draft.days[i] ? 'bg-primary text-white' : 'bg-lilac-2 text-muted-2'}`}>{d}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-field bg-green-bg px-3 py-2.5">
          <Info size={15} className="flex-none text-green-dark" strokeWidth={2} />
          <div className="text-[10.5px] font-medium leading-snug text-green-dark">{L('Los pedidos por Entrega incluyen 12% de comisión.', 'Delivery orders include a 12% partner fee.')}</div>
        </div>
      </div>
    );

    if (wizStep === 2) return (
      <div className="flex flex-col gap-2.5">
        <div className="text-[11px] font-medium leading-relaxed text-muted">{L('Adjunta grupos reutilizables: tamaños, extras, opciones. Opcional.', 'Attach reusable groups: sizes, add-ons, choices. Optional.')}</div>
        {modLib.map((m) => {
          const on = !!draft.mods[m.id];
          return (
            <button key={m.id} onClick={() => upDraft({ mods: { ...draft.mods, [m.id]: !on } })} className={`flex w-full items-center gap-3 rounded-btn-lg border-[1.5px] p-3 ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
              <span className={`flex h-4 w-4 flex-none items-center justify-center rounded ${on ? 'bg-primary' : 'bg-lilac-line'}`}>{on && <Check size={10} className="text-white" strokeWidth={3.4} />}</span>
              <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-lilac"><m.Icon size={16} className="text-primary-dark" strokeWidth={2} /></span>
              <span className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-extrabold text-ink">{L(m.es, m.en)}</span>
                  {m.req && <span className="rounded bg-lilac px-1.5 py-px text-[8px] font-extrabold text-primary-dark">{L('Obligatorio', 'Required')}</span>}
                </span>
                <span className="mt-0.5 block text-[10px] font-medium text-muted-2">{L(m.mEs, m.mEn)}</span>
              </span>
            </button>
          );
        })}
        <button className="mt-1 w-full cursor-pointer rounded-field border-[1.5px] border-dashed border-lilac-line bg-app py-3 text-[12px] font-extrabold text-primary-dark">+ {L('Nuevo grupo', 'New group')}</button>
      </div>
    );

    if (wizStep === 3) return (
      <div className="flex flex-col gap-3.5">
        <div>
          <div className={fieldLabel}>{L('Etiquetas dietéticas', 'Dietary tags')}</div>
          <div className="flex flex-wrap gap-2">
            {dietDefs.map((d) => {
              const has = draft.diet.includes(d);
              return <button key={d} onClick={() => upDraft({ diet: has ? draft.diet.filter((x) => x !== d) : [...draft.diet, d] })} className={chip(has)}>{d}</button>;
            })}
          </div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Alérgenos · toca para ciclar', 'Allergens · tap to cycle')}</div>
          <div className="grid grid-cols-2 gap-2">
            {algNames.map((a, i) => {
              const v = draft.allergens[i];
              const st = v === 1 ? L('Contiene', 'Contains') : v === 2 ? L('Puede contener', 'May contain') : L('Libre de', 'Free of');
              const stC = v === 1 ? 'text-pink-dark' : v === 2 ? 'text-amber-ink' : 'text-muted-2';
              const swCls = v === 1 ? 'bg-pink-bg text-pink-dark' : v === 2 ? 'bg-amber-bg text-amber-ink' : 'bg-lilac-2 text-muted-faint';
              const border = v === 1 ? 'border-pink-bg' : v === 2 ? 'border-amber-bg' : 'border-lilac-line';
              return (
                <button key={a} onClick={() => { const na = [...draft.allergens]; na[i] = (na[i] + 1) % 3; upDraft({ allergens: na }); }} className={`flex items-center gap-2.5 rounded-field border-[1.5px] bg-white px-3 py-2.5 ${border}`}>
                  <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-md text-[12px] font-extrabold ${swCls}`}>{v === 1 ? '✓' : v === 2 ? '~' : '·'}</span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[11.5px] font-extrabold text-ink">{a}</span>
                    <span className={`block text-[9.5px] font-semibold ${stC}`}>{st}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );

    if (wizStep === 4) return (
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <div className="flex-1"><div className={fieldLabel}>{L('Límite diario', 'Daily limit')}</div><input value={draft.dailyLimit} onChange={(e) => upDraft({ dailyLimit: e.target.value })} placeholder={L('Ilimitado', 'Unlimited')} className={inputCls} /></div>
          <div className="flex-1"><div className={fieldLabel}>{L('Al agotarse', 'When out')}</div><div className="rounded-field border-[1.5px] border-lilac-line px-3 py-2.5 text-[12.5px] font-semibold text-ink">{L('Auto-pausar en 0', 'Auto-pause at 0')}</div></div>
        </div>
        <div>
          <div className={fieldLabel}>{L('Automatización', 'Automation')}</div>
          <div className="flex flex-col gap-2.5">
            {([[L('Auto-86 al llegar a cero', 'Auto-86 at zero'), L('Oculta del menú automáticamente.', 'Hide from menu automatically.')], [L('Reiniciar conteo a las 5 AM', 'Reset count at 5 AM'), L('Recarga el límite cada mañana.', 'Refill limit each morning.')], [L('Avisar a cocina en bajo stock', 'Alert kitchen at low stock'), L('Notifica antes de agotarse.', 'Notify before it sells out.')]] as [string, string][]).map(([title, sub], i) => {
              const on = draft.rules[i] ?? false;
              return (
                <div key={i} className="flex items-center gap-3 rounded-field border border-hair bg-app p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-bold text-ink">{title}</span>
                    <span className="block text-[10px] font-medium text-muted-2">{sub}</span>
                  </span>
                  <Toggle on={on} onClick={() => upDraft({ rules: { ...draft.rules, [i]: !on } })} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-field border border-hair bg-app p-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-bold text-ink">{L('Visible al publicar', 'Visible at publish')}</span>
            <span className="block text-[10px] font-medium leading-snug text-muted-2">{L('Apágalo para publicar oculto y revelar luego.', 'Turn off to publish hidden, reveal later.')}</span>
          </span>
          <Toggle on={draft.visible} onClick={() => upDraft({ visible: !draft.visible })} />
        </div>
      </div>
    );

    // step 5 — review
    const chansSel = chanDefs.filter((c) => draft.channels[c[0]]).map((c) => c[1]);
    const modsSel = modLib.filter((m) => draft.mods[m.id]).map((m) => L(m.es, m.en));
    const algC = draft.allergens.filter((v) => v === 1).length;
    const algM = draft.allergens.filter((v) => v === 2).length;
    const reviewRows: [string, string, boolean, number][] = [
      [L('Nombre', 'Name'), draft.name || '—', !!draft.name, 0],
      [L('Categoría', 'Category'), L(draftCat.es, draftCat.en), true, 0],
      [L('Precio', 'Price'), draft.price ? '$' + draft.price + (draft.compareAt ? `  (${L('antes', 'was')} $${draft.compareAt})` : '') : '—', !!draft.price, 1],
      [L('Canales', 'Channels'), chansSel.length ? chansSel.join(' · ') : L('Ninguno', 'None'), chansSel.length > 0, 1],
      [L('Modificadores', 'Modifiers'), modsSel.length ? modsSel.join(', ') : L('Ninguno', 'None'), true, 2],
      [L('Dieta', 'Dietary'), draft.diet.length ? draft.diet.join(', ') : L('Ninguna', 'None'), true, 3],
      [L('Alérgenos', 'Allergens'), (algC ? algC + L(' contiene', ' contains') : '') + (algC && algM ? ' · ' : '') + (algM ? algM + L(' puede', ' may') : '') || L('Ninguno', 'None marked'), true, 3],
      ['Stock', (draft.dailyLimit ? L('Límite ', 'Limit ') + draft.dailyLimit : L('Ilimitado', 'Unlimited')) + ' · ' + (draft.visible ? L('Visible', 'Visible') : L('Oculto', 'Hidden')), true, 4],
    ];
    return (
      <div className="flex flex-col gap-3.5">
        <div className={`flex items-center gap-3 rounded-btn-lg border p-3 ${ready ? 'border-green-bg bg-green-bg/50' : 'border-amber-bg bg-amber-bg/50'}`}>
          <span className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-white ${ready ? 'text-green-dark' : 'text-amber-ink'}`}>{ready ? <Check size={16} strokeWidth={2.8} /> : <AlertTriangle size={15} strokeWidth={2.4} />}</span>
          <div className="min-w-0 flex-1">
            <div className={`text-[12px] font-extrabold ${ready ? 'text-green-dark' : 'text-amber-ink'}`}>{ready ? L('Listo para publicar', 'Ready to publish') : L('Faltan datos esenciales', 'A few essentials are missing')}</div>
            <div className="text-[10.5px] font-medium leading-snug text-ink-3">{ready ? L('Todo en orden. Publicar lo activa al instante.', 'All set. Publishing makes it live instantly.') : L('Agrega nombre y precio antes de publicar.', 'Add a name and price before publishing.')}</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-btn-lg border border-hair">
          {reviewRows.map(([k, v, ok, step], i) => (
            <div key={k} className={`flex items-center gap-2.5 px-3 py-2.5 ${i < reviewRows.length - 1 ? 'border-b border-hair' : ''}`}>
              <span className="w-[74px] flex-none text-[10.5px] font-semibold text-muted-2">{k}</span>
              <span className={`min-w-0 flex-1 text-[11.5px] font-bold ${ok ? 'text-ink' : 'text-muted-faint'}`}>{v}</span>
              <button onClick={() => setWizStep(step)} className="flex-none cursor-pointer text-[10.5px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
            </div>
          ))}
        </div>
        <div>
          <div className={fieldLabel}>{L('Opciones de publicación', 'Publish options')}</div>
          <div className="flex flex-col gap-2">
            {([['now', L('Publicar ahora', 'Publish now'), L('Aparece en tu menú al instante.', 'Goes live immediately.'), Zap], ['schedule', L('Programar', 'Schedule'), L('Elige fecha y hora.', 'Pick a date & time.'), Calendar], ['draft', L('Guardar borrador', 'Save as draft'), L('Oculto hasta que estés listo.', 'Hidden until ready.'), Copy]] as [string, string, string, LucideIcon][]).map(([k, lab, sub, Icon]) => {
              const on = draft.publishMode === k;
              return (
                <button key={k} onClick={() => upDraft({ publishMode: k })} className={`flex w-full items-center gap-3 rounded-btn-lg border-[1.5px] p-3 ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                  <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-lilac"><Icon size={15} className="text-primary-dark" strokeWidth={2} /></span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[12px] font-extrabold text-ink">{lab}</span>
                    <span className="block text-[10px] font-medium text-muted-2">{sub}</span>
                  </span>
                  <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[1.5px] ${on ? 'border-primary' : 'border-lilac-line'}`}>{on && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWizard = () => (
    <div className="pb-8">
      <button onClick={() => setView('module')} className="mb-3 flex items-center gap-1.5 text-[12px] font-extrabold text-primary-dark">
        <ChevronRight size={14} className="rotate-180" strokeWidth={2.6} />{L('Agregar platillo', 'Add menu item')} · {L(draftCat.es, draftCat.en)}
      </button>

      {/* stepper */}
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 min-w-0 overflow-x-auto px-1">
        {wizStepDefs.map((label, i) => {
          const active = wizStep === i; const done = i < wizStep || (i <= wizMax && i !== wizStep);
          return (
            <button key={label} onClick={() => { if (i <= wizMax) setWizStep(i); }} className={`flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${active ? 'bg-primary text-white' : done ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted-2'}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white ${active ? 'bg-white/25' : done ? 'bg-primary' : 'bg-muted-faint'}`}>{done ? '✓' : i + 1}</span>
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
        {/* step content */}
        <div className="order-2 xl:order-1">
          <div className={`${cardCls} p-4`}>
            <div className="mb-3.5 text-[13.5px] font-extrabold text-ink">{wizTitle}</div>
            {renderWizardStep()}
          </div>
          {/* footer nav */}
          <div className="mt-4 flex items-center gap-3">
            <button onClick={wizBack} className="flex h-[46px] w-[46px] flex-none cursor-pointer items-center justify-center rounded-btn-lg bg-lilac-2"><ChevronRight size={18} className="rotate-180 text-ink" strokeWidth={2.4} /></button>
            <div className="flex-1 text-center text-[11px] font-semibold text-muted-2">{L('Paso ', 'Step ')}{wizStep + 1}{L(' de ', ' of ')}{wizStepDefs.length}</div>
            <button
              onClick={wizNext}
              disabled={!nextGated}
              className={`flex-1 rounded-btn-lg py-3.5 text-[13.5px] font-extrabold text-white ${nextGated ? 'cursor-pointer bg-primary shadow-cta-sm' : 'cursor-not-allowed bg-lilac-line'}`}
            >
              {wizStep >= wizStepDefs.length - 1 ? L('Publicar platillo', 'Publish item') : L('Continuar', 'Continue')}
            </button>
          </div>
        </div>

        {/* live preview (sticky side rail on desktop) */}
        <div className="order-1 xl:order-2 xl:sticky xl:top-[74px]">
          <div className={`mb-2 ${sectionLabel}`}>{L('Vista previa en vivo', 'Live preview')}</div>
          {previewCard}
        </div>
      </div>
    </div>
  );

  // ============ SUCCESS ============
  const renderSuccess = () => {
    const chansSel = chanDefs.filter((c) => draft.channels[c[0]]).length;
    return (
      <div className="mx-auto flex max-w-[420px] flex-col items-center pb-8 pt-6 text-center">
        <div className="mb-3.5 flex h-16 w-16 items-center justify-center rounded-panel bg-green-bg text-green-dark"><Check size={32} strokeWidth={2.6} /></div>
        <div className="text-[21px] font-extrabold tracking-[-.02em] text-ink">{(draft.name || L('Nuevo platillo', 'New item'))} {L('está activo', 'is live')}</div>
        <div className="mt-2 max-w-[300px] text-[13px] font-medium leading-relaxed text-muted">
          {L(`Ya está en tu menú de ${L(draftCat.es, draftCat.en)} en ${chansSel} canales. Los cambios se publican al instante.`, `It's now on your menu across ${chansSel} channels. Changes go live instantly.`)}
        </div>
        <div className="mt-5 w-full overflow-hidden rounded-tile border border-hair bg-white text-left">
          <div className="h-[110px]" style={{ background: `repeating-linear-gradient(135deg,${draftCat.tile})` }} />
          <div className="flex items-center justify-between p-3.5">
            <div className="min-w-0">
              <div className="text-[14px] font-extrabold text-ink">{draft.name || L('Nuevo platillo', 'New item')}</div>
              <div className="mt-0.5 text-[11.5px] font-medium text-muted-2">{L(draftCat.es, draftCat.en)} · {draft.price ? '$' + draft.price : '$0.00'}</div>
            </div>
            <span className="flex-none rounded-lg bg-green-bg px-2.5 py-1 text-[10.5px] font-extrabold text-green-dark">{L('Activo', 'Live')}</span>
          </div>
        </div>
        <div className="mt-5 flex w-full flex-col gap-2.5">
          <button onClick={startAdd} className="w-full cursor-pointer rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta-sm">+ {L('Agregar otro platillo', 'Add another item')}</button>
          <button onClick={() => { setView('module'); setSubtab('items'); }} className="w-full cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white py-3.5 text-[13.5px] font-extrabold text-ink">{L('Volver al menú', 'Back to menu')}</button>
        </div>
      </div>
    );
  };

  // ============ EDIT SHEET ============
  const editDirty = sheetId != null && edit != null && JSON.stringify(edit) !== JSON.stringify(items.find((i) => i.id === sheetId));
  const closeSheet = () => { setSheetId(null); setEdit(null); };
  const upEdit = (p: Partial<Item>) => setEdit((e) => (e ? { ...e, ...p } : e));
  const saveEdit = () => { if (edit) setItems((xs) => xs.map((i) => (i.id === sheetId ? { ...i, ...edit } : i))); closeSheet(); flash(L('Guardado · listado actualizado', 'Saved · listing updated')); };
  const deleteItem = () => { setItems((xs) => xs.filter((i) => i.id !== sheetId)); closeSheet(); flash(L('Platillo eliminado', 'Item deleted')); };

  const editSheet = sheetId != null && edit != null && (
    <>
      <div onClick={closeSheet} className="fixed inset-0 z-40 bg-[rgba(28,24,46,.5)]" />
      <div className="no-scrollbar fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90vh] max-w-[560px] overflow-y-auto rounded-t-[24px] bg-white shadow-sheet">
        <div className="sticky top-0 z-10 flex justify-center rounded-t-[24px] bg-white pb-1.5 pt-2.5">
          <span className="h-1.5 w-[42px] rounded-full bg-lilac-line" />
          <button onClick={closeSheet} className="absolute right-3.5 top-2.5 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-lilac-2"><X size={13} className="text-ink" strokeWidth={2.6} /></button>
        </div>
        <div className="relative h-[124px]" style={{ background: `repeating-linear-gradient(135deg,${catOf(edit.cat).tile})` }}>
          <span className="absolute bottom-3 right-3 rounded-[9px] bg-white/90 px-2.5 py-1.5 text-[11px] font-extrabold text-ink">📷 {L('Foto', 'Photo')}</span>
        </div>
        <div className="flex flex-col gap-3.5 p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-extrabold text-ink">{L('Editar platillo', 'Edit item')}</span>
            <span className={`rounded-md px-2 py-1 text-[9.5px] font-extrabold ${editDirty ? 'bg-amber-bg text-amber-ink' : 'bg-green-bg text-green-dark'}`}>{editDirty ? L('Sin guardar', 'Unsaved') : L('Sincronizado', 'Synced')}</span>
          </div>
          <div><div className={fieldLabel}>{L('Nombre del platillo', 'Item name')}</div><input value={edit.name} onChange={(e) => upEdit({ name: e.target.value })} className={inputCls} /></div>
          <div><div className={fieldLabel}>{L('Descripción', 'Description')}</div><textarea value={es ? edit.es : edit.en} onChange={(e) => upEdit(es ? { es: e.target.value } : { en: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></div>
          <div className="flex gap-3">
            <div className="flex-1"><div className={fieldLabel}>{L('Precio', 'Price')}</div><div className="flex items-center rounded-field border-[1.5px] border-lilac-line px-3 focus-within:border-primary"><span className="text-[13px] font-bold text-muted-2">$</span><input value={edit.price} onChange={(e) => upEdit({ price: Number(String(e.target.value).replace(/[^0-9.]/g, '')) || 0 })} className="min-w-0 flex-1 border-none bg-transparent px-2 py-2.5 text-[13px] font-semibold text-ink outline-none" /></div></div>
            <div className="flex-1">
              <div className={fieldLabel}>{L('Disponibilidad', 'Availability')}</div>
              <div className="flex gap-1.5">
                {([['in', L('En stock', 'In')], ['low', L('Bajo', 'Low')], ['out', '86']] as [Stock, string][]).map(([k, lab]) => (
                  <button key={k} onClick={() => upEdit({ stock: k })} className={`flex-none cursor-pointer rounded-[9px] px-2.5 py-2 text-[10.5px] font-extrabold ${edit.stock === k ? 'bg-primary text-white' : 'bg-lilac-2 text-ink-2'}`}>{lab}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className={fieldLabel}>{L('Etiquetas dietéticas', 'Dietary tags')}</div>
            <div className="flex flex-wrap gap-2">
              {([['V', L('Vegetariano', 'Vegetarian')], ['VG', L('Vegano', 'Vegan')], ['GF', L('Sin gluten', 'Gluten-free')], ['Picante', L('Picante', 'Spicy')]] as [string, string][]).map(([k, lab]) => {
                const has = edit.diet.includes(k);
                return <button key={k} onClick={() => upEdit({ diet: has ? edit.diet.filter((x) => x !== k) : [...edit.diet, k] })} className={chip(has)}>{lab}</button>;
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-field border border-hair bg-app p-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-bold text-ink">{L('Visible en el listado', 'Visible on listing')}</span>
              <span className="block text-[10px] font-medium leading-snug text-muted-2">{L('Apágalo para ocultar sin eliminar.', 'Turn off to hide without deleting.')}</span>
            </span>
            <Toggle on={edit.visible} onClick={() => upEdit({ visible: !edit.visible })} />
          </div>
          <div className="flex gap-2.5 pt-1">
            <button onClick={deleteItem} className="cursor-pointer rounded-btn border-[1.5px] border-pink-bg bg-white px-4 py-3 text-[12.5px] font-extrabold text-pink-dark">{L('Eliminar', 'Delete')}</button>
            <button onClick={saveEdit} className={`flex-1 rounded-btn py-3 text-[13px] font-extrabold text-white ${editDirty ? 'cursor-pointer bg-primary' : 'bg-lilac-line'}`}>{L('Guardar cambios', 'Save changes')}</button>
          </div>
        </div>
      </div>
    </>
  );

  // ============ RENDER ============
  const body = view === 'wizard' ? renderWizard()
    : view === 'success' ? renderSuccess()
      : (
        <div className="pb-8">
          <div className="no-scrollbar -mx-1 mb-4 flex gap-2 min-w-0 overflow-x-auto px-1">
            {subtabDefs.map(([k, label]) => (
              <button key={k} onClick={() => setSubtab(k)} className={chip(subtab === k)}>{label}</button>
            ))}
          </div>
          {subtab === 'items' && renderItems()}
          {subtab === 'categories' && renderCategories()}
          {subtab === 'mods' && renderMods()}
          {subtab === 'schedules' && renderSchedules()}
          {subtab === 'promos' && renderPromos()}
          {subtab === 'allergens' && renderAllergens()}
          {subtab === 'stock' && renderStock()}
        </div>
      );

  return (
    <div className="relative">
      {body}
      {editSheet}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-ink px-4 py-3 text-[12.5px] font-bold text-white shadow-modal">
          <Check size={14} strokeWidth={2.6} className="text-[#7BE0A8]" />
          {toast}
        </div>
      )}
    </div>
  );
}
