'use client';

// Productos module (business dashboard) — the online-shop CATALOG. Sub-tabs:
// Catálogo · Inventario · Variantes · Colecciones · Descuentos, plus a sell-
// online vs catalog-only switch. Includes a 4-step "add product" wizard
// (Detalles → Precio → Inventario → Revisar) with a live preview + success
// screen, an edit bottom-sheet, and live filtering/toggles. Mobile-first; on
// desktop content widens into multi-column grids with a sticky summary rail.
// Delivery + shipping (zones, drivers, pickup, carriers) now live in the SHARED
// `Entregas y envíos` module (modules/Fulfillment.tsx) — reachable from the rail
// + a shortcut card — so Products and the Food menu configure fulfillment once.

import { useEffect, useMemo, useState } from 'react';
import {
  Boxes, Check, CreditCard, HardHat,
  Layers, MapPin, Package, Percent, Plus, Route, Search,
  Store, Tag, Truck, Upload, Zap,
} from 'lucide-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';
import { useBizAdmin } from '@/lib/bizAdmin';
import { deleteBizItem, insertBizItem, listBizItems, updateBizItem, type BizItemRow, type NewBizItem } from '@/lib/bizItems';

// ---------- static content model (ported from the Products handoff prototype) ----------

type Cat = { id: string; es: string; en: string; tile: string };
const CATS: Cat[] = [
  { id: 'pantry', es: 'Despensa', en: 'Pantry', tile: '#F3D9C8 0 8px,#E8C3AC 8px 16px' },
  { id: 'merch', es: 'Mercancía', en: 'Merch', tile: '#EAE2F8 0 8px,#DCCEF2 8px 16px' },
  { id: 'baking', es: 'Repostería', en: 'Baking', tile: '#F3E2CE 0 8px,#ECD3B4 8px 16px' },
  { id: 'coffee', es: 'Café', en: 'Coffee', tile: '#EDE0D4 0 8px,#DFCBB6 8px 16px' },
  { id: 'books', es: 'Libros', en: 'Books', tile: '#E4ECFB 0 8px,#D7E3F6 8px 16px' },
];

type Product = { id: number; dbId?: string; name: string; sku: string; price: number; stock: number; cat: string; variants: number; sales: string };

// Map a business_items row (kind='product') ↔ Product.
function rowToProduct(r: BizItemRow, idx: number): Product {
  const a = (r.attrs ?? {}) as Record<string, unknown>;
  return {
    id: idx + 1,
    dbId: r.id,
    name: r.name,
    sku: String(a.sku ?? ''),
    price: Number(r.price ?? 0),
    stock: Number(a.stock ?? 0),
    cat: r.section ?? 'pantry',
    variants: Number(a.variants ?? 0),
    sales: String(a.sales ?? '$0'),
  };
}
function productToRow(p: Product, businessId: string, sort: number): NewBizItem {
  return {
    business_id: businessId,
    kind: 'product',
    name: p.name,
    description: null,
    price: p.price,
    unit: null,
    section: p.cat,
    available: true,
    sort,
    image_url: null,
    attrs: { sku: p.sku, stock: p.stock, variants: p.variants, sales: p.sales },
  };
}
const SEED: Product[] = [
  { id: 1, name: 'Mermelada fresa-ruibarbo · 6oz', sku: 'JAM-001', price: 14, stock: 42, cat: 'pantry', variants: 3, sales: '$1,820' },
  { id: 2, name: 'Libro de recetas Country Loaf', sku: 'BOOK-001', price: 42, stock: 12, cat: 'books', variants: 1, sales: '$924' },
  { id: 3, name: 'Tote de lona To’Latino', sku: 'MRC-001', price: 28, stock: 84, cat: 'merch', variants: 2, sales: '$2,128' },
  { id: 4, name: 'Masa madre · 100g', sku: 'STR-001', price: 18, stock: 5, cat: 'baking', variants: 1, sales: '$486' },
  { id: 5, name: 'Canasta de fermentado', sku: 'TOL-001', price: 32, stock: 24, cat: 'baking', variants: 2, sales: '$640' },
  { id: 6, name: 'Aceite de oliva · 500ml', sku: 'OIL-001', price: 24, stock: 0, cat: 'pantry', variants: 1, sales: '$2,400' },
  { id: 7, name: 'Café en grano · 12oz', sku: 'COF-001', price: 19, stock: 62, cat: 'coffee', variants: 3, sales: '$1,178' },
];

// Fulfillment (delivery zones, pickup, national shipping, drivers) lives in the
// SHARED `Entregas y envíos` module (modules/Fulfillment.tsx) — it reads/writes
// the same businesses.settings jsonb and is used by both Products and the Food
// menu. Products is now purely the catalog.

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';

type ProdTab = 'catalog' | 'inventory' | 'variants' | 'collections' | 'discounts';
type View = 'module' | 'wizard' | 'success';
type Draft = { name: string; desc: string; cat: string; price: string; sku: string; tax: string; variants: boolean; stock: string; reorder: string; fulfill: string; photo: boolean };
type Edit = { id: number; name: string; price: string; stock: string; cat: string };

const newDraft = (): Draft => ({ name: '', desc: '', cat: 'pantry', price: '', sku: '', tax: 'goods', variants: false, stock: '', reorder: '', fulfill: 'ship', photo: false });

export function ProductsModule({ ctx }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es, isFree, ci, go } = ctx;
  void es;

  const [prodTab, setProdTab] = useState<ProdTab>('catalog');
  const [sellOn, setSellOn] = useState(true);
  const [cat, setCat] = useState('all');
  const [query, setQuery] = useState('');

  const [products, setProducts] = useState<Product[]>(SEED);
  const admin = useBizAdmin();
  const real = admin.active;
  const persistable = !admin.demo && !!real; // real signed-in business → persist

  // Load the real business's products (demo keeps the sample seed).
  useEffect(() => {
    if (!persistable || !real) {
      setProducts(SEED);
      return;
    }
    let cancelled = false;
    (async () => {
      const rows = await listBizItems(real.id, 'product');
      if (!cancelled) setProducts(rows.map(rowToProduct));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  const nextProdId = () => (products.length ? Math.max(...products.map((p) => p.id)) : 0) + 1;
  const persistNewProd = async (p: Product) => {
    if (!persistable || !real) return;
    const dbId = await insertBizItem(productToRow(p, real.id, products.length));
    if (dbId) setProducts((ps) => ps.map((x) => (x.id === p.id ? { ...x, dbId } : x)));
  };
  const persistProdPatch = (p: Product | undefined) => {
    if (persistable && p?.dbId) updateBizItem(p.dbId, { name: p.name, price: p.price, section: p.cat, attrs: { sku: p.sku, stock: p.stock, variants: p.variants, sales: p.sales } });
  };
  const [collState, setCollState] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: false, 3: true });

  const [sheet, setSheet] = useState<Edit | null>(null);
  const [view, setView] = useState<View>('module');
  const [wizStep, setWizStep] = useState(0);
  const [wizMax, setWizMax] = useState(0);
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [toast, setToast] = useState('');

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 1900); };

  const catOf = (id: string) => CATS.find((c) => c.id === id) ?? CATS[0];
  const money = (n: number) => '$' + n.toFixed(2);

  const stockPill = (s: number): [string, string] =>
    s === 0 ? [L('Agotado', 'Out'), 'bg-pink-bg text-pink-dark'] : s <= 8 ? [L('Bajo', 'Low'), 'bg-amber-bg text-amber-ink'] : [L('En stock', 'In stock'), 'bg-green-bg text-green-dark'];

  // ---------- shared styles ----------
  const chip = (on: boolean) =>
    `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12.5px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'bg-lilac-2 font-bold text-ink-soft'}`;
  const dashBtn = 'w-full cursor-pointer rounded-btn-lg border-[1.5px] border-dashed border-lilac-line bg-lilac-3 px-3 py-3.5 text-[12.5px] font-extrabold text-primary-dark';

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`relative h-[26px] w-[46px] flex-none cursor-pointer rounded-full transition-colors ${on ? 'bg-primary' : 'bg-lilac-line'}`}
    >
      <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-all ${on ? 'left-[23px]' : 'left-[3px]'}`} />
    </button>
  );

  // ---------- catalog ----------
  const filtered = useMemo(() => {
    let list = cat === 'all' ? products : products.filter((p) => p.cat === cat);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.name + ' ' + p.sku).toLowerCase().includes(q));
    return list;
  }, [products, cat, query]);

  const catFilters = [{ id: 'all', label: L('Todos', 'All') }, ...CATS.filter((c) => products.some((p) => p.cat === c.id)).map((c) => ({ id: c.id, label: L(c.es, c.en) }))];

  const catalogView = (
    <div className="flex flex-col gap-3.5">
      {/* sell online vs catalog only */}
      <div className={`rounded-card-sm border-[1.5px] bg-white p-3.5 ${sellOn ? 'border-primary/30' : 'border-hair'}`}>
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-btn ${sellOn ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted-2'}`}>
            <CreditCard size={19} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-extrabold text-ink">{sellOn ? L('Venta en línea activa', 'Online sale active') : L('Solo catálogo', 'Catalog only')}</div>
            <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-muted-2">
              {sellOn ? L('Vende con inventario, envío y checkout.', 'Sell with inventory, shipping & checkout.') : L('Muestra productos con precio, sin comprar.', 'Show products with prices, no checkout.')}
            </div>
          </div>
          <Toggle on={sellOn} onClick={() => setSellOn((v) => !v)} />
        </div>
      </div>

      {/* search */}
      <div className="flex items-center gap-2.5 rounded-field border border-hair bg-white px-3 py-2.5">
        <Search size={15} strokeWidth={2.2} className="flex-none text-muted-2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={L('Buscar productos…', 'Search products…')}
          className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-muted-2"
        />
      </div>

      {/* category filters */}
      <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
        {catFilters.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={chip(cat === c.id)}>{c.label}</button>
        ))}
      </div>

      {/* product cards */}
      {filtered.length === 0 ? (
        <div className={`${cardCls} p-9 text-center text-[13px] font-semibold text-muted`}>{L('Ningún producto coincide con tu búsqueda.', 'No products match your search.')}</div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {filtered.map((p) => {
            const [lab, pillCls] = stockPill(p.stock);
            return (
              <button
                key={p.id}
                onClick={() => setSheet({ id: p.id, name: p.name, price: String(p.price), stock: String(p.stock), cat: p.cat })}
                className={`flex cursor-pointer gap-3 rounded-card-sm border border-hair bg-white p-2.5 text-left transition-shadow hover:shadow-card-lg`}
              >
                <span className="h-[60px] w-[60px] flex-none rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${catOf(p.cat).tile})` }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-extrabold leading-tight text-ink">{p.name}</span>
                    <span className="flex-none text-[13px] font-extrabold text-ink">{money(p.price)}</span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-lilac-2 px-2 py-0.5 text-[9.5px] font-bold text-ink-2">{L(catOf(p.cat).es, catOf(p.cat).en)}</span>
                    <span className="text-[9.5px] font-semibold text-muted-2">SKU {p.sku}</span>
                    {p.variants > 1 && <span className="rounded-md bg-lilac px-2 py-0.5 text-[9.5px] font-extrabold text-primary-dark">{p.variants} {L('variantes', 'variants')}</span>}
                  </span>
                  {sellOn && (
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9.5px] font-extrabold ${pillCls}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {p.stock === 0 ? lab : p.stock}
                      </span>
                      <span className="text-[9.5px] font-semibold text-muted-2">{p.sales} {L('vendido', 'sold')}</span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button onClick={startWizard} className="flex cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta-sm xl:hidden">
        <Plus size={16} strokeWidth={2.6} />{L('Agregar producto', 'Add product')}
      </button>
    </div>
  );

  // ---------- inventory ----------
  const invRaw = [
    { name: 'Mermelada fresa · 6oz', sku: 'JAM-001', on: 42, reorder: 20, incoming: 0, st: 'ok', cat: 'pantry' },
    { name: 'Libro de recetas', sku: 'BOOK-001', on: 12, reorder: 8, incoming: 24, st: 'ok', cat: 'books' },
    { name: 'Tote de lona', sku: 'MRC-001', on: 84, reorder: 30, incoming: 0, st: 'ok', cat: 'merch' },
    { name: 'Masa madre · 100g', sku: 'STR-001', on: 5, reorder: 15, incoming: 50, st: 'low', cat: 'baking' },
    { name: 'Aceite de oliva · 500ml', sku: 'OIL-001', on: 0, reorder: 12, incoming: 36, st: 'out', cat: 'pantry' },
    { name: 'Café en grano · 12oz', sku: 'COF-001', on: 62, reorder: 25, incoming: 0, st: 'ok', cat: 'coffee' },
  ] as const;

  const inventoryView = (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-3 gap-2.5">
        <div className={`${cardCls} p-3`}>
          <div className="text-[9px] font-bold text-muted-2">{L('Valor inv.', 'Inv. value')}</div>
          <div className="mt-0.5 text-[16px] font-extrabold text-ink">$5,480</div>
          <div className="text-[9px] font-extrabold text-muted-2">7 SKU</div>
        </div>
        <div className="rounded-card-sm border border-amber/40 bg-amber-bg p-3">
          <div className="text-[9px] font-bold text-amber-ink">{L('Reabastecer', 'Reorder')}</div>
          <div className="mt-0.5 text-[16px] font-extrabold text-ink">2</div>
          <div className="text-[9px] font-extrabold text-amber-ink">⚠ {L('Bajo umbral', 'Below')}</div>
        </div>
        <div className={`${cardCls} p-3`}>
          <div className="text-[9px] font-bold text-muted-2">{L('Entrante', 'Incoming')}</div>
          <div className="mt-0.5 text-[16px] font-extrabold text-ink">110</div>
          <div className="text-[9px] font-extrabold text-primary-dark">3 PO</div>
        </div>
      </div>
      <div className={`${cardCls} overflow-hidden`}>
        {invRaw.map((r, i) => {
          const [lab, pillCls] = stockPill(r.st === 'out' ? 0 : r.st === 'low' ? 5 : 40);
          const onC = r.st === 'out' ? 'text-pink-dark' : r.st === 'low' ? 'text-amber-ink' : 'text-ink';
          return (
            <div key={r.sku} className={`flex items-center gap-3 px-3.5 py-3 ${i < invRaw.length - 1 ? 'border-b border-hair' : ''}`}>
              <span className="h-10 w-10 flex-none rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${catOf(r.cat).tile})` }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-extrabold text-ink">{r.name}</div>
                <div className="mt-0.5 text-[9.5px] font-semibold text-muted-2">
                  SKU {r.sku} · {L('Reordenar en', 'Reorder at')} {r.reorder}
                  {r.incoming > 0 && <span className="text-primary-dark"> · +{r.incoming} {L('entrante', 'incoming')}</span>}
                </div>
              </div>
              <div className="flex-none text-right">
                <div className={`text-[15px] font-extrabold ${onC}`}>{r.on}</div>
                <span className={`mt-0.5 inline-block rounded-md px-1.5 py-px text-[8.5px] font-extrabold ${pillCls}`}>{lab}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ---------- variants ----------
  const grinds = [L('Grano entero', 'Whole bean'), 'Espresso', L('Filtro', 'Filter')];
  const sizes = ['12 oz', '2 lb'];
  const vPrice: Record<string, number> = { '12 oz': 19, '2 lb': 46 };
  const vStock = [[40, 12], [14, 6], [8, 2]];
  const variantRows = grinds.flatMap((g, gi) => sizes.map((s, si) => ({ name: `${g} · ${s}`, price: money(vPrice[s]), stock: vStock[gi][si] })));

  const optionSet = (title: string, values: string[]) => (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 text-[10.5px] font-extrabold text-ink-soft">{title} · {values.length}</div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => <span key={v} className="rounded-btn bg-lilac-2 px-2.5 py-1.5 text-[11px] font-bold text-ink-soft">{v}</span>)}
        <span className="cursor-pointer rounded-btn border-[1.5px] border-dashed border-lilac-line px-2.5 py-1.5 text-[11px] font-extrabold text-primary-dark">+ {L('Valor', 'Value')}</span>
      </div>
    </div>
  );

  const variantsView = (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3 rounded-card-sm bg-lilac-2 p-3.5">
        <Zap size={16} strokeWidth={2} className="flex-none text-primary-dark" />
        <div>
          <div className="text-[11.5px] font-extrabold text-ink">{L('Editando variantes', 'Editing variants')} · Café en grano</div>
          <div className="mt-0.5 text-[10px] font-medium leading-snug text-ink-3">{L('Las opciones se combinan en variantes vendibles.', 'Options combine into sellable variants.')}</div>
        </div>
      </div>
      <div>
        <div className="mb-2 px-0.5 text-[12px] font-extrabold text-ink">{L('Conjuntos de opciones', 'Option sets')}</div>
        <div className={`${cardCls} p-3.5`}>
          {optionSet(L('Molienda', 'Grind'), grinds)}
          {optionSet(L('Tamaño', 'Size'), sizes)}
        </div>
      </div>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[12px] font-extrabold text-ink">{L('Variantes', 'Variants')} <span className="text-muted-2">{variantRows.length}</span></span>
        <span className="text-[10px] font-semibold text-muted-2">{grinds.length} × {sizes.length}</span>
      </div>
      <div className={`${cardCls} overflow-hidden`}>
        {variantRows.map((v, i) => (
          <div key={v.name} className={`flex items-center gap-2.5 px-3.5 py-3 ${i < variantRows.length - 1 ? 'border-b border-hair' : ''}`}>
            <span className="flex-1 text-[12px] font-semibold text-ink">{v.name}</span>
            <span className="text-[12.5px] font-extrabold text-ink">{v.price}</span>
            <span className={`w-9 text-right text-[11px] font-bold ${v.stock < 10 ? 'text-amber-ink' : 'text-ink'}`}>{v.stock}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ---------- collections ----------
  const collRaw = [
    { es: 'Sets de regalo', en: 'Gift sets', n: 6, tile: '#F3D9E2 0 8px,#E8BFCD 8px 16px', dEs: 'Paquetes curados de temporada', dEn: 'Curated seasonal bundles' },
    { es: 'Básicos de despensa', en: 'Pantry staples', n: 12, tile: '#F3D9C8 0 8px,#E8C3AC 8px 16px', dEs: 'Mermeladas, aceites, miel, sal', dEn: 'Jams, oils, honey, salt' },
    { es: 'Kit de repostería', en: 'Home baking kit', n: 8, tile: '#F3E2CE 0 8px,#ECD3B4 8px 16px', dEs: 'Masa madre, canasta, harina', dEn: 'Starter, banneton, flour' },
    { es: 'Programa de café', en: 'Coffee program', n: 5, tile: '#EDE0D4 0 8px,#DFCBB6 8px 16px', dEs: 'Granos, equipo, suscripciones', dEn: 'Beans, gear, subscriptions' },
  ];

  const collectionsView = (
    <div className="flex flex-col gap-3.5">
      <div className="px-0.5 text-[11.5px] font-medium leading-snug text-ink-2">{L('Agrupa productos en colecciones. Destaca algunas en tu listado.', 'Group products into collections. Feature some on your listing.')}</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {collRaw.map((c, i) => {
          const on = collState[i];
          return (
            <div key={c.es} className={`${cardCls} overflow-hidden`}>
              <div className="relative h-[70px]" style={{ background: `repeating-linear-gradient(135deg,${c.tile})` }}>
                {on && <span className="absolute left-2.5 top-2.5 rounded-md bg-ink px-2 py-0.5 text-[9px] font-extrabold text-white">★ {L('Destacada', 'Featured')}</span>}
                <span className="absolute bottom-2.5 right-2.5 rounded-md bg-ink/50 px-2 py-0.5 text-[9.5px] font-bold text-white">{c.n} {L('artículos', 'items')}</span>
              </div>
              <div className="flex items-center gap-2.5 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-extrabold text-ink">{L(c.es, c.en)}</div>
                  <div className="mt-0.5 text-[10.5px] font-medium text-muted-2">{L(c.dEs, c.dEn)}</div>
                </div>
                <Toggle on={on} onClick={() => setCollState((s) => ({ ...s, [i]: !on }))} />
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={() => flash(L('Nueva colección creada', 'New collection created'))} className={dashBtn}>+ {L('Nueva colección', 'New collection')}</button>
    </div>
  );

  // ---------- discounts ----------
  const discRaw = [
    { code: 'WELCOME15', val: '15%', iconCls: 'bg-lilac text-primary-dark', cEs: 'Primer pedido', cEn: 'First order', used: 248, auto: false, ended: false },
    { code: 'FREESHIP75', val: '🚚', iconCls: 'bg-blue-bg text-blue', cEs: 'Pedidos sobre $75', cEn: 'Orders over $75', used: 412, auto: true, ended: false },
    { code: 'GIFT10', val: '$10', iconCls: 'bg-green-bg text-green-dark', cEs: 'Sets de regalo · fiestas', cEn: 'Gift sets · holiday', used: 64, auto: false, ended: false },
    { code: 'LOCAL20', val: '20%', iconCls: 'bg-amber-bg text-amber-ink', cEs: 'Recoger · ZIP local', cEn: 'Pickup · local ZIP', used: 90, auto: false, ended: false },
    { code: 'SUMMER', val: '10%', iconCls: 'bg-lilac-2 text-muted-2', cEs: 'Terminó 30 sep', cEn: 'Ended Sep 30', used: 520, auto: false, ended: true },
  ];

  const discountsView = (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { l: L('Códigos', 'Active codes'), v: '4', d: null },
          { l: L('Canjes 30d', 'Redeems 30d'), v: '814', d: '▲ 16%' },
          { l: L('Otorgado', 'Given 30d'), v: '$4.2k', d: null },
        ].map((s) => (
          <div key={s.l} className={`${cardCls} p-3`}>
            <div className="text-[9px] font-bold text-muted-2">{s.l}</div>
            <div className="mt-0.5 text-[18px] font-extrabold text-ink">{s.v}</div>
            {s.d && <div className="text-[9px] font-extrabold text-green">{s.d}</div>}
          </div>
        ))}
      </div>
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {discRaw.map((d) => (
          <div key={d.code} className={`flex items-center gap-3 rounded-card-sm border border-hair bg-white p-3 ${d.ended ? 'opacity-60' : ''}`}>
            <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-btn text-[13px] font-extrabold ${d.iconCls}`}>{d.val}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[12.5px] font-extrabold text-ink">{d.code}</span>
                {d.auto && <span className="rounded bg-lilac px-1.5 py-px text-[8px] font-extrabold text-primary-dark">{L('Auto', 'Auto')}</span>}
              </div>
              <div className="mt-0.5 text-[10px] font-medium text-muted-2">{L(d.cEs, d.cEn)} · {d.used} {L('usos', 'used')}</div>
            </div>
            <span className={`flex-none rounded-md px-2 py-1 text-[9px] font-extrabold ${d.ended ? 'bg-lilac-2 text-muted-2' : 'bg-green-bg text-green-dark'}`}>{d.ended ? L('Terminó', 'Ended') : L('Activo', 'Active')}</span>
          </div>
        ))}
      </div>
      <button onClick={() => flash(L('Nuevo descuento creado', 'New discount created'))} className={dashBtn}>+ {L('Nuevo descuento', 'New discount')}</button>
    </div>
  );

  // ---------- wizard ----------
  const dCat = catOf(draft.cat);
  const wizStepDefs: [string, string][] = [
    [L('Detalles', 'Details'), L('Detalles del producto', 'Product details')],
    [L('Precio', 'Pricing'), L('Precio y SKU', 'Pricing & SKU')],
    [L('Inventario', 'Inventory'), L('Inventario y cumplimiento', 'Inventory & fulfillment')],
    [L('Revisar', 'Review'), L('Revisar y publicar', 'Review & publish')],
  ];
  const upD = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const pReady = !!draft.name && !!draft.price;

  function startWizard() {
    setDraft(newDraft());
    setWizStep(0);
    setWizMax(0);
    setView('wizard');
  }
  // Turn the wizard draft into a real product (adds to the catalog + persists).
  const addProductFromDraft = () => {
    const p: Product = {
      id: nextProdId(),
      name: draft.name.trim() || L('Nuevo producto', 'New product'),
      sku: draft.sku,
      price: Number(draft.price) || 0,
      stock: Number(draft.stock) || 0,
      cat: draft.cat,
      variants: draft.variants ? 1 : 0,
      sales: '$0',
    };
    setProducts((ps) => [p, ...ps]);
    persistNewProd(p);
  };
  const wizNext = () => {
    if (wizStep >= wizStepDefs.length - 1) { addProductFromDraft(); setView('success'); return; }
    const n = wizStep + 1;
    setWizStep(n);
    setWizMax((m) => Math.max(m, n));
  };
  const wizBack = () => {
    if (wizStep === 0) { setView('module'); return; }
    setWizStep((s) => s - 1);
  };

  const fieldCls = 'w-full rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted-2 focus:border-primary';
  const fieldLabel = 'mb-1.5 block text-[11px] font-extrabold text-ink-soft';
  const miniChip = (on: boolean) => `flex-none cursor-pointer rounded-full px-3 py-1.5 text-[11.5px] ${on ? 'bg-primary font-extrabold text-white' : 'bg-lilac-2 font-bold text-ink-soft'}`;

  const fulfillDefs: [string, string, string, typeof Truck][] = [
    ['ship', L('Envío', 'Shipping'), L('Transportista a domicilio', 'Carrier to address'), Truck],
    ['local', L('Entrega local', 'Local delivery'), L('Tus repartidores o apps', 'Your drivers or apps'), HardHat],
    ['pickup', L('Recoger', 'Pickup'), L('Recoger en tienda', 'In-store pickup'), Store],
  ];
  const taxDefs: [string, string][] = [['prep', L('Comida preparada', 'Prepared food')], ['goods', L('Empacado', 'Packaged')], ['exempt', L('Exento', 'Exempt')]];

  const wizardPreview = (
    <div className={`${cardCls} overflow-hidden`}>
      <div className="h-24" style={{ background: `repeating-linear-gradient(135deg,${dCat.tile})` }} />
      <div className="flex items-start justify-between gap-2.5 p-3">
        <div className="min-w-0">
          <div className={`text-[14px] font-extrabold ${draft.name ? 'text-ink' : 'text-muted-faint'}`}>{draft.name || L('Nombre del producto', 'Product name')}</div>
          <div className="mt-0.5 text-[10.5px] font-medium text-muted-2">{L(dCat.es, dCat.en)}</div>
        </div>
        <span className="flex-none text-[14px] font-extrabold text-ink">{draft.price ? '$' + draft.price : '$0.00'}</span>
      </div>
    </div>
  );

  const wizardBody = (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3.5 text-[13.5px] font-extrabold text-ink">{wizStepDefs[wizStep][1]}</div>
      {wizStep === 0 && (
        <div className="flex flex-col gap-3.5">
          <div>
            <label className={fieldLabel}>{L('Nombre del producto', 'Product name')} *</label>
            <input value={draft.name} onChange={(e) => upD({ name: e.target.value })} placeholder={L('Ej. Mermelada de fresa', 'e.g. Strawberry jam')} className={fieldCls} />
          </div>
          <div>
            <label className={fieldLabel}>{L('Descripción', 'Description')}</label>
            <textarea value={draft.desc} onChange={(e) => upD({ desc: e.target.value })} placeholder={L('Detalles, materiales, tamaño…', 'Details, materials, size…')} rows={2} className={`${fieldCls} resize-none`} />
          </div>
          <div>
            <label className={fieldLabel}>{L('Categoría', 'Category')} *</label>
            <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
              {CATS.map((c) => <button key={c.id} onClick={() => upD({ cat: c.id })} className={miniChip(draft.cat === c.id)}>{L(c.es, c.en)}</button>)}
            </div>
          </div>
          <div>
            <label className={fieldLabel}>{L('Fotos', 'Photos')}</label>
            <button onClick={() => upD({ photo: !draft.photo })} className="relative flex h-28 w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-tile border-[1.5px] border-dashed border-lilac-line bg-lilac-3">
              {draft.photo && <span className="absolute inset-0" style={{ background: `repeating-linear-gradient(135deg,${dCat.tile})` }} />}
              {!draft.photo && <><Upload size={20} strokeWidth={2} className="text-primary" /><span className="text-[12px] font-bold text-ink-soft">{L('Toca para subir', 'Tap to upload')}</span></>}
            </button>
          </div>
        </div>
      )}
      {wizStep === 1 && (
        <div className="flex flex-col gap-3.5">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={fieldLabel}>{L('Precio', 'Price')} *</label>
              <div className="flex items-center rounded-field border-[1.5px] border-lilac-line px-3 focus-within:border-primary">
                <span className="text-[13px] font-bold text-muted-2">$</span>
                <input value={draft.price} onChange={(e) => upD({ price: e.target.value })} placeholder="0.00" inputMode="decimal" className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-[13px] font-semibold text-ink outline-none" />
              </div>
            </div>
            <div className="flex-1">
              <label className={fieldLabel}>SKU</label>
              <input value={draft.sku} onChange={(e) => upD({ sku: e.target.value })} placeholder="ABC-001" className={fieldCls} />
            </div>
          </div>
          <div>
            <label className={fieldLabel}>{L('Categoría fiscal', 'Tax category')}</label>
            <div className="no-scrollbar -mx-1 flex gap-2 min-w-0 overflow-x-auto px-1">
              {taxDefs.map(([id, lab]) => <button key={id} onClick={() => upD({ tax: id })} className={miniChip(draft.tax === id)}>{lab}</button>)}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-field border border-hair bg-lilac-3 p-3">
            <div className="flex-1">
              <div className="text-[12.5px] font-bold text-ink">{L('¿Tiene variantes?', 'Has variants?')}</div>
              <div className="mt-0.5 text-[10px] font-medium leading-snug text-muted-2">{L('Tamaños, colores, sabores…', 'Sizes, colors, flavors…')}</div>
            </div>
            <Toggle on={draft.variants} onClick={() => upD({ variants: !draft.variants })} />
          </div>
        </div>
      )}
      {wizStep === 2 && (
        <div className="flex flex-col gap-3.5">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={fieldLabel}>{L('Cantidad', 'Stock qty')}</label>
              <input value={draft.stock} onChange={(e) => upD({ stock: e.target.value })} placeholder="0" inputMode="numeric" className={fieldCls} />
            </div>
            <div className="flex-1">
              <label className={fieldLabel}>{L('Reordenar en', 'Reorder at')}</label>
              <input value={draft.reorder} onChange={(e) => upD({ reorder: e.target.value })} placeholder="10" inputMode="numeric" className={fieldCls} />
            </div>
          </div>
          <div>
            <label className={fieldLabel}>{L('Cumplimiento', 'Fulfillment')}</label>
            <div className="flex flex-col gap-2">
              {fulfillDefs.map(([id, lab, sub, Icon]) => {
                const on = draft.fulfill === id;
                return (
                  <button key={id} onClick={() => upD({ fulfill: id })} className={`flex items-center gap-3 rounded-field border-[1.5px] p-3 text-left ${on ? 'border-primary bg-lilac-3' : 'border-lilac-line bg-white'}`}>
                    <span className={`flex h-4 w-4 flex-none items-center justify-center rounded ${on ? 'bg-primary' : 'bg-lilac-line'}`}>{on && <Check size={10} strokeWidth={3.4} className="text-white" />}</span>
                    <Icon size={16} strokeWidth={2} className={on ? 'text-primary-dark' : 'text-muted-2'} />
                    <span className="flex-1">
                      <span className="block text-[12px] font-extrabold text-ink">{lab}</span>
                      <span className="block text-[10px] font-semibold text-muted-2">{sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {wizStep === 3 && (
        <div className="flex flex-col gap-3.5">
          <div className={`flex items-center gap-3 rounded-field border p-3 ${pReady ? 'border-green/40 bg-green-bg' : 'border-amber/40 bg-amber-bg'}`}>
            <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-btn bg-white text-[14px] font-extrabold ${pReady ? 'text-green-dark' : 'text-amber-ink'}`}>{pReady ? '✓' : '⚠'}</span>
            <div className="flex-1">
              <div className={`text-[12px] font-extrabold ${pReady ? 'text-green-dark' : 'text-amber-ink'}`}>{pReady ? L('Listo para publicar', 'Ready to publish') : L('Faltan datos', 'A few essentials missing')}</div>
              <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-ink-3">{pReady ? L('Aparecerá en tu tienda al instante.', 'It’ll appear in your shop instantly.') : L('Agrega nombre y precio antes de publicar.', 'Add a name and price before publishing.')}</div>
            </div>
          </div>
          <div className={`${cardCls} overflow-hidden`}>
            {([
              [L('Nombre', 'Name'), draft.name || '—', !!draft.name, 0],
              [L('Categoría', 'Category'), L(dCat.es, dCat.en), true, 0],
              [L('Precio', 'Price'), draft.price ? '$' + draft.price : '—', !!draft.price, 1],
              ['SKU', draft.sku || '—', !!draft.sku, 1],
              [L('Cumplimiento', 'Fulfillment'), ({ ship: L('Envío', 'Shipping'), local: L('Entrega local', 'Local delivery'), pickup: L('Recoger', 'Pickup') } as Record<string, string>)[draft.fulfill], true, 2],
            ] as [string, string, boolean, number][]).map((r, i, a) => (
              <div key={r[0]} className={`flex items-center gap-2.5 px-3.5 py-3 ${i < a.length - 1 ? 'border-b border-hair' : ''}`}>
                <span className="w-20 flex-none text-[10.5px] font-semibold text-muted-2">{r[0]}</span>
                <span className={`min-w-0 flex-1 truncate text-[11.5px] font-bold ${r[2] ? 'text-ink' : 'text-muted-faint'}`}>{r[1]}</span>
                <button onClick={() => setWizStep(r[3])} className="flex-none cursor-pointer text-[10.5px] font-extrabold text-primary-dark">{L('Editar', 'Edit')}</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const wizardPage = (
    <ModulePage
      title={L('Agregar producto', 'Add product')}
      subtitle={`${L(dCat.es, dCat.en)} · ${L('Paso', 'Step')} ${wizStep + 1}/${wizStepDefs.length}`}
      onBack={() => setView('module')}
      backLabel={L('Cancelar', 'Cancel')}
      maxW={940}
      footer={
        <div className="flex items-center gap-3">
          <button onClick={wizBack} className="flex-none cursor-pointer rounded-btn-lg border-[1.5px] border-lilac-line bg-white px-4 py-3.5 text-[12.5px] font-extrabold text-ink">
            {wizStep === 0 ? L('Cancelar', 'Cancel') : L('Atrás', 'Back')}
          </button>
          <button onClick={wizNext} className="flex-1 cursor-pointer rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta-sm">
            {wizStep >= wizStepDefs.length - 1 ? L('Publicar producto', 'Publish product') : L('Continuar', 'Continue')}
          </button>
        </div>
      }
    >
      {/* step chips */}
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 min-w-0 overflow-x-auto px-1">
        {wizStepDefs.map(([lab], i) => {
          const active = wizStep === i;
          const done = i < wizStep || (i <= wizMax && i !== wizStep);
          return (
            <button key={lab} onClick={() => { if (i <= wizMax) setWizStep(i); }} className={`flex flex-none cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${active ? 'bg-primary text-white' : done ? 'bg-lilac text-primary-dark' : 'bg-lilac-2 text-muted-2'}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white ${active ? 'bg-white/25' : done ? 'bg-primary' : 'bg-lilac-line'}`}>{done ? '✓' : i + 1}</span>
              {lab}
            </button>
          );
        })}
      </div>
      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4 xl:sticky xl:top-0 xl:self-start">{wizardPreview}</div>
        {wizardBody}
      </div>
    </ModulePage>
  );

  // ---------- success ----------
  const successPage = (
    <ModulePage title={L('¡Publicado!', 'Published!')} onBack={() => { setView('module'); setProdTab('catalog'); }}>
      <div className="flex flex-col items-center pb-4 pt-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-card-sm bg-green-bg text-green"><Check size={32} strokeWidth={2.6} /></div>
        <div className="mt-3.5 text-[21px] font-extrabold tracking-[-.02em] text-ink">{(draft.name || L('Nuevo producto', 'New product'))} {L('está activo', 'is live')}</div>
        <div className="mt-2 max-w-[320px] text-[13px] font-medium leading-relaxed text-muted">{L('Ya aparece en tu tienda en línea.', 'It now appears in your online shop.')}</div>
        <div className={`mt-5 w-full max-w-[440px] overflow-hidden text-left ${cardCls}`}>
          <div className="h-[104px]" style={{ background: `repeating-linear-gradient(135deg,${dCat.tile})` }} />
          <div className="flex items-center justify-between p-3">
            <div className="min-w-0">
              <div className="text-[14px] font-extrabold text-ink">{draft.name || L('Nuevo producto', 'New product')}</div>
              <div className="mt-0.5 text-[11.5px] font-medium text-muted-2">{L(dCat.es, dCat.en)} · {draft.price ? '$' + draft.price : '$0.00'}</div>
            </div>
            <span className="flex-none rounded-btn bg-green-bg px-3 py-1.5 text-[10.5px] font-extrabold text-green-dark">{L('Activo', 'Live')}</span>
          </div>
        </div>
        <div className="mt-5 flex w-full max-w-[440px] flex-col gap-2.5">
          <button onClick={startWizard} className="cursor-pointer rounded-btn bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta-sm">+ {L('Agregar otro producto', 'Add another product')}</button>
          <button onClick={() => { setView('module'); setProdTab('catalog'); }} className="cursor-pointer rounded-btn border-[1.5px] border-lilac-line bg-white py-3.5 text-[13.5px] font-extrabold text-ink">{L('Volver a productos', 'Back to products')}</button>
        </div>
      </div>
    </ModulePage>
  );

  // ---------- edit product (full page) ----------
  const saveSheet = () => {
    if (!sheet) return;
    setProducts((ps) => {
      const next = ps.map((p) => (p.id === sheet.id ? { ...p, name: sheet.name, price: Number(sheet.price) || p.price, stock: Number(sheet.stock) || 0 } : p));
      persistProdPatch(next.find((p) => p.id === sheet.id));
      return next;
    });
    setSheet(null);
    flash(L('Guardado · tienda actualizada', 'Saved · shop updated'));
  };
  const deleteSheet = () => {
    if (!sheet) return;
    const target = products.find((p) => p.id === sheet.id);
    setProducts((ps) => ps.filter((p) => p.id !== sheet.id));
    if (persistable && target?.dbId) deleteBizItem(target.dbId);
    setSheet(null);
    flash(L('Producto eliminado', 'Product deleted'));
  };

  const editPage = sheet && (
    <ModulePage
      title={L('Editar producto', 'Edit product')}
      subtitle={L(catOf(sheet.cat).es, catOf(sheet.cat).en)}
      onBack={() => setSheet(null)}
      footer={
        <div className="flex gap-2.5">
          <button onClick={deleteSheet} className="cursor-pointer rounded-btn border-[1.5px] border-pink/40 bg-white px-4 py-3 text-[12.5px] font-extrabold text-pink-dark">{L('Eliminar', 'Delete')}</button>
          <button onClick={saveSheet} className="flex-1 cursor-pointer rounded-btn bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm">{L('Guardar cambios', 'Save changes')}</button>
        </div>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="h-28 overflow-hidden rounded-tile" style={{ background: `repeating-linear-gradient(135deg,${catOf(sheet.cat).tile})` }} />
        <div>
          <label className={fieldLabel}>{L('Nombre del producto', 'Product name')}</label>
          <input value={sheet.name} onChange={(e) => setSheet({ ...sheet, name: e.target.value })} className={fieldCls} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={fieldLabel}>{L('Precio', 'Price')}</label>
            <input value={sheet.price} onChange={(e) => setSheet({ ...sheet, price: e.target.value })} inputMode="decimal" className={fieldCls} />
          </div>
          <div className="flex-1">
            <label className={fieldLabel}>{L('Cantidad', 'Stock qty')}</label>
            <input value={sheet.stock} onChange={(e) => setSheet({ ...sheet, stock: e.target.value })} inputMode="numeric" className={fieldCls} />
          </div>
        </div>
      </div>
    </ModulePage>
  );

  // ---------- module body (sub-tabs + content) ----------
  const prodSub: [ProdTab, string, typeof Boxes][] = [
    ['catalog', L('Catálogo', 'Catalog'), Package],
    ['inventory', L('Inventario', 'Inventory'), Boxes],
    ['variants', L('Variantes', 'Variants'), Layers],
    ['collections', L('Colecciones', 'Collections'), Tag],
    ['discounts', L('Descuentos', 'Discounts'), Percent],
  ];

  const content =
    prodTab === 'catalog' ? catalogView
      : prodTab === 'inventory' ? inventoryView
        : prodTab === 'variants' ? variantsView
          : prodTab === 'collections' ? collectionsView
            : discountsView;

  // contextual sticky side rail (desktop material)
  const railLinks = (rows: { Icon: typeof Route; cls: string; title: string; sub: string; right?: string; onClick: () => void }[]) => (
    <div className={`${cardCls} p-4`}>
      <div className="mb-3 text-[13px] font-extrabold text-ink">{L('Envío y entrega', 'Shipping & delivery')}</div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <button key={r.title} onClick={r.onClick} className="flex items-center gap-2.5 text-left">
            <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-btn ${r.cls}`}><r.Icon size={16} strokeWidth={2.2} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-extrabold text-ink">{r.title}</span>
              <span className="block text-[10.5px] font-semibold text-muted-2">{r.sub}</span>
            </span>
            <span className="text-[13px] font-extrabold text-muted-2">{r.right ?? '›'}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const rail = (
    <div className="flex flex-col gap-4 xl:sticky xl:top-[74px] xl:self-start">
      <div className={`${cardCls} p-4`}>
        <div className="mb-0.5 text-[13px] font-extrabold text-ink">{L('Resumen de tienda', 'Shop summary')}</div>
        <div className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold text-muted-2">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-lilac text-[7px] font-extrabold text-primary-dark">{ci.initials}</span>
          {ci.name}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {([[L('Productos', 'Products'), '7'], [L('En stock', 'In stock'), '5'], [L('Valor inv.', 'Inv. value'), '$5.4k'], [L('Ventas 30d', 'Sales 30d'), '$9.6k']] as [string, string][]).map(([l, v]) => (
            <div key={l} className="rounded-btn-lg bg-app p-3">
              <div className="text-[10px] font-bold text-muted-2">{l}</div>
              <div className="mt-0.5 text-[17px] font-extrabold text-ink">{v}</div>
            </div>
          ))}
        </div>
      </div>
      {railLinks([
        { Icon: MapPin, cls: 'bg-green-bg text-green-dark', title: L('Entrega local', 'Local delivery'), sub: L('Zonas y repartidores', 'Zones & drivers'), onClick: () => go('fulfillment') },
        { Icon: Truck, cls: 'bg-blue-bg text-blue', title: L('Envío nacional', 'National shipping'), sub: 'USPS · UPS · FedEx', onClick: () => go('fulfillment') },
      ])}
    </div>
  );

  // Edit / create flows take over the screen as full pages (no cramped popups).
  if (view === 'wizard') return <>{wizardPage}<Toast msg={toast} /></>;
  if (view === 'success') return <>{successPage}<Toast msg={toast} /></>;
  if (editPage) return <>{editPage}<Toast msg={toast} /></>;

  return (
    <div className="relative pb-8">
      {isFree && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-card-sm bg-amber-bg p-3.5">
          <span className="text-[18px]">✦</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-extrabold text-ink">{L('La tienda en línea es una función Verified.', 'The online shop is a Verified feature.')}</span>
            <span className="block text-[11px] font-semibold text-amber-ink">{L('Estás viendo una vista previa. Verifícate para vender productos.', "You're seeing a preview. Get verified to sell products.")}</span>
          </span>
          <button onClick={() => go('billing')} className="flex-none cursor-pointer rounded-btn bg-ink px-3.5 py-2 text-[11.5px] font-extrabold text-white">{L('Verificar', 'Verify')}</button>
        </div>
      )}

      {/* delivery + shipping now live in the shared "Entregas y envíos" module */}
      <button onClick={() => go('fulfillment')} className="mb-3 flex w-full items-center gap-3 rounded-card-sm border border-hair bg-white p-3 text-left shadow-card">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-lilac text-primary-dark"><Truck size={17} strokeWidth={2} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-extrabold text-ink">{L('Entregas y envíos', 'Delivery & shipping')}</span>
          <span className="block text-[10.5px] font-semibold leading-snug text-muted-2">{L('Zonas, repartidores y envío nacional — compartido con tu menú', 'Zones, drivers & national shipping — shared with your menu')}</span>
        </span>
        <span className="flex-none text-[13px] font-extrabold text-muted-2">›</span>
      </button>

      {/* sub-tabs */}
      <div className="no-scrollbar -mx-1 mb-4 flex items-center gap-2 min-w-0 overflow-x-auto px-1">
        {prodSub.map(([k, label]) => <button key={k} onClick={() => setProdTab(k)} className={chip(prodTab === k)}>{label}</button>)}
        <button onClick={startWizard} className="ml-auto hidden flex-none cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[12.5px] font-extrabold text-white shadow-cta-sm xl:flex">
          <Plus size={15} strokeWidth={2.6} />{L('Agregar producto', 'Add product')}
        </button>
      </div>

      <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">{content}</div>
        {rail}
      </div>

      <Toast msg={toast} />
    </div>
  );
}
