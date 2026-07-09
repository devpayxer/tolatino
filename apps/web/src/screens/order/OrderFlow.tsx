'use client';

/*
 * OrderFlow — faithful reimplementation of the design handoff
 * "ToLatino Ordenar.dc.html" (Cliente / Ordenar). Full-screen restaurant
 * ordering experience: menu (hero + info + delivery/pickup + address + search +
 * populares + sticky category chips + sections) → item detail sheet (addon
 * groups + special instructions + live price) → cart (lines + upsell + promo) →
 * checkout (address + when + payment + tip + charge summary) → real Stripe.
 *
 * Pixel-perfect to the handoff (its exact tokens, radii, shadows, animations).
 * Data is REAL: the restaurant meta comes from business_by_slug (the Business
 * object) and the menu from business_menu_by_slug (PublicMenu). Placing the
 * order routes through the real marketplace-checkout (Stripe Connect).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/state';
import { useAddresses } from '@/lib/addresses';
import { useMyActivity } from '@/lib/myActivity';
import { startMarketplaceCheckout } from '@/lib/stripe';
import { CAT } from '@/lib/tiles';
import { bizStatus } from '@/lib/hours';
import { useNow } from '@/lib/useNow';
import type { Business } from '@/data/fixtures';
import type { Bi, MenuItem, OptionGroup } from '@/data/bizdetail';
import type { PublicMenu } from '@/lib/live';
import { Glyph, IconBack, IconShare, IconHeart, IconTruck, IconPickup, IconPin, IconSearch, IconX, IconPlus, IconMinus, IconCheck, IconChevron, IconLock, IconTag } from '@/screens/order/orderIcons';

// ---- design tokens (from the handoff) -------------------------------------
const INK = '#1E1B2E', PRI = '#7B61FF', PRI2 = '#6D4DF6';
const money = (n: number) => '$' + (Math.round(n * 100) / 100).toFixed(2);
const grad = (stops: string) => `repeating-linear-gradient(135deg,${stops})`;

type Sel = Record<string, number | number[]>;
type Line = { key: string; itemId: string; qty: number; sel: Sel; note: string };
type Sheet = { itemId: string; editKey: string | null; qty: number; sel: Sel; note: string };
type Modal = 'address' | 'newaddr' | 'dropoff' | null;

const badgeStyle = (b: string): [string, string] => {
  const map: Record<string, [string, string]> = {
    Popular: ['#FCEFD6', '#9A6A12'], Nuevo: ['#EFEBFF', '#6D4DF6'], Picante: ['#FDE7EF', '#D6336C'],
    Vegano: ['#E3F5EA', '#1F8A4C'], Vegetariano: ['#E3F5EA', '#1F8A4C'],
  };
  return map[b] || ['#F1EFFA', '#6E6A85'];
};
const badgeOf = (it: MenuItem): string => (it.tag ? it.tag[0] : '');

export function OrderFlow({ b, menu, onClose }: { b: Business; menu: PublicMenu; onClose: () => void }) {
  const { L } = useLang();
  const B = (p?: Bi) => (p ? L(p[0], p[1]) : '');
  const { user, profile } = useAuth();
  const app = useApp();
  const addressStore = useAddresses();
  const act = useMyActivity();
  const now = useNow();

  const [view, setView] = useState<'menu' | 'cart' | 'checkout'>('menu');
  const [mode, setMode] = useState<'delivery' | 'pickup'>(b.delivery?.on ? 'delivery' : 'pickup');
  const [cat, setCat] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [fav, setFav] = useState(false);
  const [cart, setCart] = useState<Line[]>([]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [addrId, setAddrId] = useState<string | null>(null);
  const [payId, setPayId] = useState('visa');
  const [tipPct, setTipPct] = useState(18);
  const [asap, setAsap] = useState(true);
  const [promo, setPromo] = useState('');
  const [promoOk, setPromoOk] = useState(false);
  const [dropoff, setDropoff] = useState('door');
  const [dropoffNote, setDropoffNote] = useState('');
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState('');
  const [na, setNa] = useState({ line: '', apt: '', zip: '', label: 'Casa' });
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastT = useRef<number | null>(null);
  const flash = (m: string) => { if (toastT.current) window.clearTimeout(toastT.current); setToast(m); toastT.current = window.setTimeout(() => setToast(''), 1800); };

  // ---- restaurant meta (design shape, from the real Business) --------------
  const R = useMemo(() => {
    const st = bizStatus(b.hours, now, b.open, b.hoursExceptions);
    return {
      name: b.name, verified: b.verified, rating: Number(b.rating).toFixed(1),
      reviews: b.reviews >= 1000 ? (b.reviews / 1000).toFixed(1) + 'k' : String(b.reviews),
      cuisine: L(CAT[b.cat].es, CAT[b.cat].en), priceLevel: b.price, open: st.open,
      hoursShort: st.open ? L('Abierto', 'Open') : L('Cerrado', 'Closed'),
      tileA: b.t[0], tileB: b.t[1], address: b.address || '',
      dealText: menu.promo ? B(menu.promo) : '',
      deliveryFee: b.delivery?.fee ?? 0, minFree: b.delivery?.min ?? 0,
      etaMin: b.delivery?.prep ? b.delivery.prep + 10 : 20, etaMax: b.delivery?.prep ? b.delivery.prep + 25 : 35,
      deliveryOn: !!b.delivery?.on, acceptsPayments: !!b.acceptsPayments,
      serviceRate: 0.05, // the founder's tested rate (see note in reply); design structure kept
      pickPrep: b.delivery?.prep ?? 15,
    };
  }, [b, menu, now, L]);

  // ---- flatten the menu → item index keyed by `${catKey}::${nameEs}` --------
  const index = useMemo(() => {
    const m = new Map<string, { it: MenuItem; catKey: string; catName: Bi; tile: string }>();
    for (const c of menu.cats) for (const it of c.items) m.set(`${c.key}::${it.n[0]}`, { it, catKey: c.key, catName: c.name, tile: it.bg });
    return m;
  }, [menu]);
  const itemById = (id: string) => index.get(id);
  const groupsOf = (catKey: string, it: MenuItem): OptionGroup[] => menu.groups[`${catKey}::${it.n[0]}`] ?? [];
  const defSel = (catKey: string, it: MenuItem): Sel => { const s: Sel = {}; groupsOf(catKey, it).forEach((g) => { s[g.id] = g.type === 'single' ? 0 : []; }); return s; };
  const addonsPrice = (catKey: string, it: MenuItem, sel: Sel): number => {
    let p = 0; groupsOf(catKey, it).forEach((g) => { const v = sel[g.id]; if (g.type === 'single') { if (typeof v === 'number' && g.choices[v]) p += g.choices[v].price; } else { (Array.isArray(v) ? v : []).forEach((i) => { if (g.choices[i]) p += g.choices[i].price; }); } }); return p;
  };
  const addonsSummary = (catKey: string, it: MenuItem, sel: Sel): string => {
    const parts: string[] = [];
    groupsOf(catKey, it).forEach((g) => { const v = sel[g.id];
      if (g.type === 'single') { if (typeof v === 'number' && v > 0 && g.choices[v]) parts.push(B(g.choices[v].label)); }
      else { (Array.isArray(v) ? v : []).forEach((i) => { if (g.choices[i]) parts.push(B(g.choices[i].label)); }); }
    });
    return parts.join(' · ');
  };
  const lineBase = (id: string, sel: Sel): number => { const e = itemById(id); return e ? e.it.price + addonsPrice(e.catKey, e.it, sel) : 0; };

  // ---- pricing (design formula; rates from R) ------------------------------
  const T = useMemo(() => {
    let sub = 0; cart.forEach((l) => { sub += lineBase(l.itemId, l.sel) * l.qty; });
    const del = mode === 'delivery' ? R.deliveryFee : 0;
    const service = Math.round(sub * R.serviceRate * 100) / 100;
    const disc = promoOk ? Math.min(5, Math.round(sub * 0.1 * 100) / 100) : 0;
    const tip = mode === 'delivery' ? Math.round(sub * (tipPct / 100) * 100) / 100 : 0;
    const total = sub - disc + del + service + tip;
    return { sub, del, service, disc, tip, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, mode, promoOk, tipPct, R]);
  const cartCount = cart.reduce((n, l) => n + l.qty, 0);
  const belowMin = mode === 'delivery' && T.sub < R.minFree && T.sub > 0;

  // ---- addresses (real) ----------------------------------------------------
  const chosenAddr = addressStore.addresses.find((a) => a.id === addrId) ?? addressStore.addresses.find((a) => a.is_default) ?? addressStore.addresses[0] ?? null;

  // ---- actions -------------------------------------------------------------
  const openSheet = (id: string) => { const e = itemById(id); if (!e) return; setSheet({ itemId: id, editKey: null, qty: 1, sel: defSel(e.catKey, e.it), note: '' }); };
  const editLine = (key: string) => { const l = cart.find((x) => x.key === key); if (!l) return; setSheet({ itemId: l.itemId, editKey: key, qty: l.qty, sel: JSON.parse(JSON.stringify(l.sel)), note: l.note }); };
  const quickAdd = (id: string) => { const e = itemById(id); if (!e) return; const sel = defSel(e.catKey, e.it); setCart((c) => { const found = c.find((l) => l.itemId === id && JSON.stringify(l.sel) === JSON.stringify(sel) && !l.note); if (found) return c.map((l) => (l === found ? { ...l, qty: l.qty + 1 } : l)); return [...c, { key: 'k' + Date.now(), itemId: id, qty: 1, sel, note: '' }]; }); flash(B(e.it.n) + ' ' + L('agregado', 'added') + ' ✓'); };
  const pickOpt = (gid: string, i: number, single: boolean, max: number) => setSheet((s) => { if (!s) return s; const sel = { ...s.sel }; if (single) sel[gid] = i; else { const arr = Array.isArray(sel[gid]) ? (sel[gid] as number[]).slice() : []; const at = arr.indexOf(i); if (at >= 0) arr.splice(at, 1); else { if (arr.length >= max) arr.shift(); arr.push(i); } sel[gid] = arr; } return { ...s, sel }; });
  const commitSheet = () => { setSheet((s) => { if (!s) return null; setCart((c) => { if (s.editKey) return c.map((x) => (x.key === s.editKey ? { key: s.editKey!, itemId: s.itemId, qty: s.qty, sel: s.sel, note: s.note } : x)); return [...c, { key: 'k' + Date.now(), itemId: s.itemId, qty: s.qty, sel: s.sel, note: s.note }]; }); return null; }); flash(sheet?.editKey ? (L('Actualizado', 'Updated') + ' ✓') : (L('Agregado al carrito', 'Added to cart') + ' ✓')); };
  const chgQty = (key: string, d: number) => setCart((c) => c.map((l) => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));
  const applyPromo = () => { const ok = promo.trim().toUpperCase() === 'AMIGO10'; setPromoOk(ok); flash(ok ? '✓ ' + L('Promo aplicada', 'Promo applied') : L('Código no válido', 'Invalid code')); };
  const saveNewAddr = async () => {
    if (!na.line.trim()) return;
    const formatted = na.line.trim() + (na.apt ? ' · ' + na.apt : '') + (na.zip ? ', ' + na.zip : '');
    const created = await addressStore.add(na.label, formatted, app.coords?.lat ?? 0, app.coords?.lng ?? 0, app.city ?? null);
    if (created) { setAddrId(created.id); flash(L('Dirección guardada', 'Address saved') + ' ✓'); }
    setModal(null); setNa({ line: '', apt: '', zip: '', label: 'Casa' });
  };

  const placeOrder = async () => {
    if (paying || cartCount === 0) return;
    if (!user) { flash(L('Inicia sesión para pagar', 'Sign in to pay')); return; }
    if (!R.acceptsPayments) { flash(L('Este restaurante aún no acepta pagos', 'This restaurant does not accept payments yet')); return; }
    if (mode === 'delivery' && belowMin) { flash(L('No llegas al mínimo', "You haven't reached the minimum")); return; }
    if (mode === 'delivery' && !chosenAddr) { setModal('address'); return; }
    setPaying(true);
    const items = cart.map((l) => { const e = itemById(l.itemId)!; const s = addonsSummary(e.catKey, e.it, l.sel); return { name: B(e.it.n), qty: l.qty, price: lineBase(l.itemId, l.sel), opts: [s, l.note ? `📝 ${l.note}` : ''].filter(Boolean).join(' · ') || undefined }; });
    const { url, error } = await startMarketplaceCheckout({
      kind: 'order', slug: b.slug, items, channel: mode,
      ...(mode === 'delivery' && chosenAddr ? { address: { formatted: chosenAddr.formatted, label: chosenAddr.label ?? undefined } } : {}),
      ...(mode === 'delivery' && (dropoffNote.trim() || dropoff) ? { instructions: [dropLabel(dropoff), dropoffNote.trim()].filter(Boolean).join(' · ') } : {}),
      ...(T.tip > 0 ? { tip: T.tip } : {}),
      ...(promoOk ? { promo: 'AMIGO10' } : {}),
    });
    if (url) { window.location.href = url; return; }
    setPaying(false);
    flash(error === 'below_minimum' ? L('No llegas al mínimo', "You haven't reached the minimum") : L('No se pudo iniciar el pago', 'Could not start payment'));
  };
  const dropLabel = (d: string) => (d === 'door' ? L('Dejar en la puerta', 'Leave at door') : d === 'hand' ? L('Entregar en mano', 'Hand it to me') : L('Tocar el timbre', 'Ring the bell'));

  // ---- derived menu view data ----------------------------------------------
  const q = query.trim().toLowerCase();
  const allItems = useMemo(() => menu.cats.flatMap((c) => c.items.map((it) => ({ it, catKey: c.key, catName: c.name, tile: it.bg }))), [menu]);
  const qtyInCart = (id: string) => cart.filter((l) => l.itemId === id).reduce((n, l) => n + l.qty, 0);
  const popular = allItems.filter((e) => badgeOf(e.it) === 'Popular').slice(0, 8);
  const etaText = mode === 'delivery' ? `${R.etaMin}–${R.etaMax} min` : L(`Listo en ~${R.pickPrep} min`, `Ready in ~${R.pickPrep} min`);

  type Section = { id: string; name: string; tile: string; count: number; items: { e: typeof allItems[number] }[] };
  let sections: Section[] = []; let noResults = false;
  if (q) {
    const found = allItems.filter((e) => (B(e.it.n) + ' ' + B(e.it.d)).toLowerCase().includes(q));
    sections = found.length ? [{ id: 'res', name: L('Resultados', 'Results'), tile: found[0].tile, count: found.length, items: found.map((e) => ({ e })) }] : [];
    noResults = found.length === 0;
  } else if (cat === 'all') {
    sections = menu.cats.map((c) => ({ id: c.key, name: B(c.name), tile: c.items[0]?.bg ?? '', count: c.items.length, items: c.items.map((it) => ({ e: { it, catKey: c.key, catName: c.name, tile: it.bg } })) }));
  } else if (cat === 'pop') {
    sections = [{ id: 'pop', name: L('Los más pedidos', 'Most ordered'), tile: popular[0]?.tile ?? '', count: popular.length, items: popular.map((e) => ({ e })) }];
  } else { const c = menu.cats.find((x) => x.key === cat); if (c) sections = [{ id: c.key, name: B(c.name), tile: c.items[0]?.bg ?? '', count: c.items.length, items: c.items.map((it) => ({ e: { it, catKey: c.key, catName: c.name, tile: it.bg } })) }]; }

  const catChips = [{ id: 'all', label: L('Todos', 'All') }, { id: 'pop', label: '🔥 ' + L('Populares', 'Popular') }, ...menu.cats.map((c) => ({ id: c.key, label: B(c.name) }))];

  // reset scroll on view change
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [view]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#F4F2F9', display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <style>{`@keyframes tlsheet{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes tlfade{from{opacity:0}to{opacity:1}}@keyframes tlpop{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}@keyframes tlspin{to{transform:rotate(360deg)}}.of-ns::-webkit-scrollbar{display:none}.of-ns{scrollbar-width:none}`}</style>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ============ MENU ============ */}
        {view === 'menu' && (
          <div className="of-ns" ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>
            {/* hero */}
            <div style={{ position: 'relative', height: 186, background: grad(`${R.tileA} 0 13px,${R.tileB} 13px 26px`), flex: 'none' }}>
              <div style={{ position: 'absolute', top: 'max(14px,env(safe-area-inset-top))', left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onClose} style={roundBtn}><IconBack /></button>
                <div style={{ display: 'flex', gap: 9 }}>
                  <button style={roundBtn}><IconShare /></button>
                  <button onClick={() => setFav((f) => !f)} style={roundBtn}><IconHeart fill={fav ? '#F0466E' : 'none'} /></button>
                </div>
              </div>
              {R.dealText && <div style={{ position: 'absolute', left: 16, bottom: 52, background: '#F6E05E', color: INK, padding: '5px 11px', borderRadius: 10, font: "800 11.5px 'Plus Jakarta Sans'" }}>🔥 {R.dealText}</div>}
            </div>

            {/* info card */}
            <div style={{ background: '#F4F2F9', borderRadius: '24px 24px 0 0', marginTop: -26, position: 'relative', padding: '18px 18px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ font: "800 23px 'Plus Jakarta Sans'", color: INK, letterSpacing: '-.02em' }}>{R.name}</span>
                {R.verified && <span style={{ display: 'inline-flex', width: 19, height: 19, borderRadius: '50%', background: PRI, alignItems: 'center', justifyContent: 'center', flex: 'none' }}><IconCheck w={11} sw={3.5} stroke="#fff" /></span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 8, font: "700 12.5px 'Plus Jakarta Sans'" }}>
                <span style={{ color: '#F4B740' }}>★</span><span style={{ fontWeight: 800, color: INK }}>{R.rating}</span>
                <span style={{ color: '#9A96AE', fontWeight: 600 }}>({R.reviews}+) ·</span>
                <span style={{ color: '#8A86A0' }}>{R.cuisine} · {R.priceLevel}</span>
                <span style={{ color: R.open ? '#1F9D57' : '#D6336C', fontWeight: 800 }}>· {R.hoursShort}</span>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <MiniStat value={etaText} label={L('Tiempo', 'Time')} />
                <MiniStat value={mode === 'delivery' ? (R.deliveryFee ? money(R.deliveryFee) : L('Gratis', 'Free')) : L('Gratis', 'Free')} label={L('Entrega', 'Delivery')} valueC={mode === 'delivery' && R.deliveryFee ? INK : '#1F9D57'} />
                <MiniStat value={`${R.rating}★`} label={`${R.reviews} ${L('reseñas', 'reviews')}`} />
              </div>

              {/* delivery / pickup */}
              <div style={{ display: 'flex', background: '#ECE8F6', borderRadius: 13, padding: 4, marginTop: 12 }}>
                {R.deliveryOn && <SegBtn on={mode === 'delivery'} onClick={() => setMode('delivery')}><IconTruck /> {L('Entrega', 'Delivery')}</SegBtn>}
                <SegBtn on={mode === 'pickup'} onClick={() => setMode('pickup')}><IconPickup /> {L('Recoger', 'Pickup')}</SegBtn>
              </div>

              {/* address / pickup bar */}
              <button onClick={() => setModal(mode === 'delivery' ? 'address' : null)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid rgba(30,27,46,.08)', borderRadius: 13, padding: '11px 13px', marginTop: 10, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: '#EFEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><IconPin /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', font: "800 12px 'Plus Jakarta Sans'", color: INK }}>{mode === 'delivery' ? `${L('Entregar a', 'Deliver to')} ${chosenAddr?.label || L('elige dirección', 'choose address')}` : `${L('Recoger en', 'Pickup at')} ${R.name}`}</span>
                  <span style={{ display: 'block', font: "600 11px 'Plus Jakarta Sans'", color: '#9A96AE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mode === 'delivery' ? (chosenAddr?.formatted || L('Toca para elegir', 'Tap to choose')) : R.address}</span>
                </span>
                {mode === 'delivery' && <IconChevron />}
              </button>

              {/* search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1px solid rgba(30,27,46,.1)', borderRadius: 12, padding: '11px 13px', marginTop: 10 }}>
                <IconSearch />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`${L('Buscar en', 'Search')} ${R.name}…`} style={{ flex: 1, border: 'none', outline: 'none', background: 'none', font: "500 13px 'Plus Jakarta Sans'", color: INK }} />
                {q && <button onClick={() => setQuery('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><IconX w={15} stroke="#9A96AE" /></button>}
              </div>
            </div>

            {/* popular */}
            {!q && cat === 'all' && popular.length >= 3 && (
              <div style={{ padding: '16px 0 4px' }}>
                <div style={{ font: "800 15px 'Plus Jakarta Sans'", color: INK, padding: '0 18px', marginBottom: 11 }}>🔥 {L('Los más pedidos', 'Most ordered')}</div>
                <div className="of-ns" style={{ display: 'flex', gap: 11, overflowX: 'auto', padding: '0 18px 4px' }}>
                  {popular.map((e) => (
                    <div key={e.catKey + e.it.n[0]} onClick={() => openSheet(`${e.catKey}::${e.it.n[0]}`)} style={{ flex: 'none', width: 138, cursor: 'pointer' }}>
                      <div style={{ height: 96, borderRadius: 14, position: 'relative', overflow: 'hidden', background: grad(e.tile), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Glyph cat={e.catKey} size={30} />
                        <button onClick={(ev) => { ev.stopPropagation(); quickAdd(`${e.catKey}::${e.it.n[0]}`); }} style={quickBtn(28)}><IconPlus /></button>
                      </div>
                      <div style={{ font: "800 12px 'Plus Jakarta Sans'", color: INK, marginTop: 7, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 30 }}>{B(e.it.n)}</div>
                      <div style={{ font: "800 12px 'Plus Jakarta Sans'", color: INK, marginTop: 2 }}>{money(e.it.price)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* sticky category bar */}
            <div className="of-ns" style={{ position: 'sticky', top: 0, zIndex: 4, display: 'flex', gap: 7, overflowX: 'auto', padding: '11px 18px', background: 'rgba(244,242,249,.94)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(30,27,46,.06)' }}>
              {catChips.map((c) => { const on = cat === c.id && !q; return <button key={c.id} onClick={() => { setCat(c.id); setQuery(''); }} style={{ flex: 'none', border: on ? 'none' : '1px solid rgba(30,27,46,.1)', cursor: 'pointer', padding: '8px 14px', borderRadius: 999, font: `${on ? 800 : 700} 12.5px 'Plus Jakarta Sans'`, background: on ? INK : '#fff', color: on ? '#fff' : '#56506E' }}>{c.label}</button>; })}
            </div>

            {/* sections */}
            <div style={{ padding: '6px 18px 8px' }}>
              {sections.map((sec) => (
                <div key={sec.id} style={{ paddingTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 9, background: grad(sec.tile), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Glyph cat={sec.id} size={16} /></span>
                    <span style={{ font: "800 17px 'Plus Jakarta Sans'", color: INK, letterSpacing: '-.01em' }}>{sec.name}</span>
                    <span style={{ font: "700 12px 'Plus Jakarta Sans'", color: '#B7B3C6' }}>{sec.count}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {sec.items.map(({ e }) => { const id = `${e.catKey}::${e.it.n[0]}`; const bdg = badgeOf(e.it); const [bb, bc] = badgeStyle(bdg); const qc = qtyInCart(id); return (
                      <div key={id} onClick={() => openSheet(id)} style={{ display: 'flex', gap: 13, padding: '14px 0', borderBottom: '1px solid rgba(30,27,46,.06)', cursor: 'pointer' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ font: "800 14px 'Plus Jakarta Sans'", color: INK, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{B(e.it.n)}</span>
                            {bdg && <span style={{ background: bb, color: bc, padding: '2px 6px', borderRadius: 6, font: "800 8.5px 'Plus Jakarta Sans'", flex: 'none' }}>{bdg}</span>}
                          </div>
                          <div style={{ font: "500 11.5px 'Plus Jakarta Sans'", color: '#8A86A0', marginTop: 4, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{B(e.it.d)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <span style={{ font: "800 13.5px 'Plus Jakarta Sans'", color: INK }}>{money(e.it.price)}</span>
                            {e.it.kcal ? <span style={{ font: "600 11px 'Plus Jakarta Sans'", color: '#B7B3C6' }}>· {e.it.kcal} Cal</span> : null}
                          </div>
                        </div>
                        <div style={{ width: 92, height: 92, borderRadius: 14, flex: 'none', position: 'relative', overflow: 'hidden', background: e.it.img ? undefined : grad(e.tile), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {e.it.img ? <img src={e.it.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Glyph cat={e.catKey} size={30} />}
                          <button onClick={(ev) => { ev.stopPropagation(); quickAdd(id); }} style={quickBtn(30)}><IconPlus /></button>
                          {qc > 0 && <span style={{ position: 'absolute', left: 6, top: 6, minWidth: 22, height: 22, padding: '0 5px', borderRadius: 11, background: PRI, color: '#fff', font: "800 11px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{qc}</span>}
                        </div>
                      </div>
                    ); })}
                  </div>
                </div>
              ))}
              {noResults && <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9A96AE', font: "600 13px 'Plus Jakarta Sans'" }}>{L('Sin resultados para', 'No results for')} “{query}”.</div>}
              <div style={{ height: 96 }} />
            </div>
          </div>
        )}

        {/* cart bar (menu view) */}
        {view === 'menu' && cartCount > 0 && (
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 18, zIndex: 6, animation: 'tlpop .25s ease' }}>
            <button onClick={() => setView('cart')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, border: 'none', cursor: 'pointer', background: PRI, color: '#fff', padding: '13px 16px', borderRadius: 16, boxShadow: '0 14px 30px rgba(123,97,255,.42)' }}>
              <span style={{ minWidth: 26, height: 26, padding: '0 7px', borderRadius: 13, background: 'rgba(255,255,255,.24)', font: "800 13px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>
              <span style={{ font: "800 14.5px 'Plus Jakarta Sans'", flex: 1, textAlign: 'left' }}>{L('Ver carrito', 'View cart')}</span>
              <span style={{ font: "800 14.5px 'Plus Jakarta Sans'" }}>{money(T.sub)}</span>
            </button>
          </div>
        )}

        {/* ============ CART ============ */}
        {view === 'cart' && (
          <CartView />
        )}

        {/* ============ CHECKOUT ============ */}
        {view === 'checkout' && (
          <CheckoutView />
        )}

        {/* ============ ITEM SHEET ============ */}
        {sheet && <ItemSheet />}

        {/* ============ MODALS ============ */}
        {modal && <SecondarySheet />}

        {/* placing overlay */}
        {paying && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(244,242,249,.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'tlfade .2s ease' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', border: '5px solid #E3DEF2', borderTopColor: PRI, animation: 'tlspin .8s linear infinite' }} />
            <div style={{ font: "800 16px 'Plus Jakarta Sans'", color: INK, marginTop: 20 }}>{L('Realizando tu pedido…', 'Placing your order…')}</div>
            <div style={{ font: "600 12px 'Plus Jakarta Sans'", color: '#9A96AE', marginTop: 6 }}>{L('Enviando a', 'Sending to')} {R.name}</div>
          </div>
        )}

        {/* toast */}
        {toast && (
          <div style={{ position: 'absolute', bottom: 92, left: '50%', transform: 'translateX(-50%)', zIndex: 42, background: INK, color: '#fff', padding: '11px 18px', borderRadius: 12, font: "700 12.5px 'Plus Jakarta Sans'", display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 12px 30px rgba(28,24,46,.4)', whiteSpace: 'nowrap', animation: 'tlpop .2s ease', maxWidth: '90%' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{toast}</span>
          </div>
        )}
      </div>
    </div>
  );

  // ================= nested views (share the closure) =================
  function CartView() {
    const upItems = allItems.filter((e) => badgeOf(e.it) !== 'Popular').slice(0, 6);
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px 12px', background: '#fff', borderBottom: '1px solid rgba(30,27,46,.07)' }}>
          <button onClick={() => setView('menu')} style={backBtn}><IconBack w={17} /></button>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 16px 'Plus Jakarta Sans'", color: INK }}>{L('Tu carrito', 'Your cart')}</div><div style={{ font: "600 11px 'Plus Jakarta Sans'", color: '#9A96AE' }}>{R.name} · {cartCount} {L('artículos', 'items')}</div></div>
        </div>
        <div className="of-ns" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#EFEBFF', borderRadius: 13, padding: '11px 13px', marginBottom: 14 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{mode === 'delivery' ? <IconTruck stroke={PRI2} /> : <IconPin />}</span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 12px 'Plus Jakarta Sans'", color: INK }}>{mode === 'delivery' ? `${L('Entrega a', 'Delivery to')} ${chosenAddr?.label || '—'}` : `${L('Recoger en', 'Pickup at')} ${R.name}`}</div><div style={{ font: "600 11px 'Plus Jakarta Sans'", color: '#6E6A85', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mode === 'delivery' ? (chosenAddr?.formatted || R.address) : R.address}</div></div>
            <span style={{ font: "800 11.5px 'Plus Jakarta Sans'", color: PRI2 }}>{etaText}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {cart.map((l) => { const e = itemById(l.itemId); if (!e) return null; const mods = addonsSummary(e.catKey, e.it, l.sel); return (
              <div key={l.key} style={{ display: 'flex', gap: 12, padding: '13px 0', borderBottom: '1px solid rgba(30,27,46,.06)' }}>
                <div onClick={() => editLine(l.key)} style={{ width: 60, height: 60, borderRadius: 12, flex: 'none', background: grad(e.tile), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Glyph cat={e.catKey} size={26} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span onClick={() => editLine(l.key)} style={{ font: "800 13.5px 'Plus Jakarta Sans'", color: INK, cursor: 'pointer' }}>{B(e.it.n)}</span><span style={{ font: "800 13.5px 'Plus Jakarta Sans'", color: INK, whiteSpace: 'nowrap' }}>{money(lineBase(l.itemId, l.sel) * l.qty)}</span></div>
                  {mods && <div style={{ font: "500 11px 'Plus Jakarta Sans'", color: '#8A86A0', marginTop: 3, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{mods}</div>}
                  {l.note && <div style={{ font: "600 10.5px 'Plus Jakarta Sans'", color: '#9A6A12', marginTop: 3 }}>📝 {l.note}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#F1EFFA', borderRadius: 10, padding: '5px 6px' }}>
                      <button onClick={() => chgQty(l.key, -1)} style={stepBtn}>{l.qty <= 1 ? <IconX w={13} stroke="#D6336C" /> : <IconMinus />}</button>
                      <span style={{ font: "800 13px 'Plus Jakarta Sans'", color: INK, minWidth: 14, textAlign: 'center' }}>{l.qty}</span>
                      <button onClick={() => chgQty(l.key, 1)} style={stepBtn}><IconPlus /></button>
                    </div>
                    <button onClick={() => editLine(l.key)} style={{ border: 'none', background: 'none', cursor: 'pointer', font: "800 11px 'Plus Jakarta Sans'", color: PRI2, padding: 0 }}>{L('Editar', 'Edit')}</button>
                  </div>
                </div>
              </div>
            ); })}
          </div>

          <button onClick={() => setView('menu')} style={{ width: '100%', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: '1.5px solid #E2DEF4', background: '#fff', color: PRI2, padding: 12, borderRadius: 12, font: "800 12.5px 'Plus Jakarta Sans'", cursor: 'pointer' }}><IconPlus stroke={PRI2} /> {L('Agregar más artículos', 'Add more items')}</button>

          {upItems.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ font: "800 13px 'Plus Jakarta Sans'", color: INK, marginBottom: 11 }}>{L('¿Se te antoja algo más?', 'Want anything else?')}</div>
              <div className="of-ns" style={{ display: 'flex', gap: 11, overflowX: 'auto', paddingBottom: 4 }}>
                {upItems.map((e) => (
                  <div key={e.catKey + e.it.n[0]} style={{ flex: 'none', width: 120 }}>
                    <div style={{ height: 80, borderRadius: 13, position: 'relative', overflow: 'hidden', background: grad(e.tile), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Glyph cat={e.catKey} size={26} /><button onClick={() => quickAdd(`${e.catKey}::${e.it.n[0]}`)} style={quickBtn(26)}><IconPlus /></button></div>
                    <div style={{ font: "700 11px 'Plus Jakarta Sans'", color: INK, marginTop: 6, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{B(e.it.n)}</div>
                    <div style={{ font: "800 11px 'Plus Jakarta Sans'", color: INK, marginTop: 1 }}>{money(e.it.price)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid rgba(30,27,46,.08)', borderRadius: 13, padding: '11px 13px', marginTop: 18 }}>
            <IconTag />
            <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder={L('Código promocional', 'Promo code')} style={{ flex: 1, border: 'none', outline: 'none', background: 'none', font: "600 12.5px 'Plus Jakarta Sans'", color: INK, textTransform: 'uppercase' }} />
            <button onClick={applyPromo} style={{ border: 'none', background: 'none', cursor: 'pointer', font: "800 12px 'Plus Jakarta Sans'", color: PRI2, padding: 0 }}>{L('Aplicar', 'Apply')}</button>
          </div>
          {promoOk && <div style={{ font: "700 11px 'Plus Jakarta Sans'", color: '#1F8A4C', marginTop: 7, paddingLeft: 3 }}>✓ {L('10% de descuento aplicado (AMIGO10)', '10% off applied (AMIGO10)')}</div>}
          <div style={{ height: 12 }} />
        </div>

        <div style={{ flex: 'none', padding: '11px 16px max(16px,env(safe-area-inset-bottom))', background: '#fff', borderTop: '1px solid rgba(30,27,46,.07)' }}>
          {belowMin && <div style={{ font: "700 11px 'Plus Jakarta Sans'", color: '#9A6A12', textAlign: 'center', marginBottom: 8 }}>{L('Agrega', 'Add')} {money(Math.max(0, R.minFree - T.sub))} {L('más para el pedido mínimo', 'more for the minimum order')}</div>}
          <button onClick={() => setView('checkout')} disabled={cartCount === 0} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', cursor: 'pointer', background: PRI, color: '#fff', padding: '15px 18px', borderRadius: 15, boxShadow: '0 12px 24px rgba(123,97,255,.3)' }}><span style={{ font: "800 14.5px 'Plus Jakarta Sans'" }}>{L('Ir a pagar', 'Checkout')}</span><span style={{ font: "800 14.5px 'Plus Jakarta Sans'" }}>{money(T.sub)}</span></button>
        </div>
      </div>
    );
  }

  function CheckoutView() {
    const isDelivery = mode === 'delivery';
    const payDefs = [
      { id: 'visa', badge: 'VISA', badgeBg: '#F1EFFA', badgeC: '#1A1F71', label: 'Visa ···· 4242', sub: L('Vence 08/27', 'Exp 08/27') },
      { id: 'mc', badge: 'MC', badgeBg: '#FDE7EF', badgeC: '#C0392B', label: 'Mastercard ···· 8890', sub: L('Vence 11/26', 'Exp 11/26') },
      { id: 'apple', badge: '', badgeBg: '#1E1B2E', badgeC: '#fff', label: 'Apple Pay', sub: L('Toca para confirmar', 'Tap to confirm') },
    ];
    const rows: { label: string; value: string; info?: string; strong?: boolean; green?: boolean }[] = [{ label: L('Subtotal', 'Subtotal'), value: money(T.sub) }];
    if (T.disc > 0) rows.push({ label: L('Descuento (AMIGO10)', 'Discount (AMIGO10)'), value: '-' + money(T.disc), green: true });
    if (isDelivery) rows.push({ label: L('Tarifa de entrega', 'Delivery fee'), value: money(T.del) });
    rows.push({ label: L('Tarifa de servicio', 'Service fee'), value: money(T.service) });
    if (isDelivery) rows.push({ label: L('Propina repartidor', 'Driver tip'), value: money(T.tip), info: tipPct + '%' });
    const tipDefs = [0, 10, 15, 18, 20];
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px 12px', background: '#fff', borderBottom: '1px solid rgba(30,27,46,.07)' }}>
          <button onClick={() => setView('cart')} style={backBtn}><IconBack w={17} /></button>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 16px 'Plus Jakarta Sans'", color: INK }}>{L('Pagar', 'Checkout')}</div><div style={{ font: "600 11px 'Plus Jakarta Sans'", color: '#9A96AE' }}>{cartCount} {L('artículos', 'items')} · {R.name}</div></div>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: '#E3F5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><IconLock /></span>
        </div>
        <div className="of-ns" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 16px' }}>
          <Overline>{isDelivery ? L('Entregar en', 'Deliver to') : L('Recoger en', 'Pickup at')}</Overline>
          <button onClick={() => setModal(isDelivery ? 'address' : null)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid rgba(30,27,46,.08)', borderRadius: 14, padding: 13, cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: '#EFEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{isDelivery ? <IconPin w={18} /> : <IconPickup stroke={PRI2} />}</span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', font: "800 13px 'Plus Jakarta Sans'", color: INK }}>{isDelivery ? (chosenAddr?.label || L('Elige dirección', 'Choose address')) : R.name}</span><span style={{ display: 'block', font: "600 11.5px 'Plus Jakarta Sans'", color: '#9A96AE', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isDelivery ? (chosenAddr?.formatted || L('Toca para elegir', 'Tap to choose')) : R.address}</span></span>
            {isDelivery && <span style={{ font: "800 11.5px 'Plus Jakarta Sans'", color: PRI2, flex: 'none' }}>{L('Cambiar', 'Change')}</span>}
          </button>

          {isDelivery && (
            <button onClick={() => setModal('dropoff')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid rgba(30,27,46,.08)', borderRadius: 14, padding: 13, cursor: 'pointer', textAlign: 'left', marginTop: 10 }}>
              <span style={{ width: 38, height: 38, borderRadius: 11, background: '#EFEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><IconPickup stroke={PRI2} /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', font: "800 13px 'Plus Jakarta Sans'", color: INK }}>{L('Instrucciones de entrega', 'Delivery instructions')}</span><span style={{ display: 'block', font: "600 11.5px 'Plus Jakarta Sans'", color: '#9A96AE', marginTop: 1 }}>{dropLabel(dropoff)}</span></span>
              <IconChevron />
            </button>
          )}

          <Overline mt>{L('Cuándo', 'When')}</Overline>
          <div style={{ display: 'flex', gap: 9 }}>
            <WhenBtn on={asap} onClick={() => setAsap(true)} title={L('Lo antes posible', 'ASAP')} sub={etaText} />
            <WhenBtn on={!asap} onClick={() => setAsap(false)} title={L('Programar', 'Schedule')} sub={L('Elige hora', 'Pick a time')} />
          </div>

          <Overline mt>{L('Método de pago', 'Payment method')}</Overline>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {payDefs.map((p) => { const on = payId === p.id; return (
              <button key={p.id} onClick={() => setPayId(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', border: `1.5px solid ${on ? PRI : '#E2DEF4'}`, background: on ? '#F7F5FF' : '#fff', cursor: 'pointer', padding: '11px 13px', borderRadius: 12 }}>
                <span style={{ width: 38, height: 26, borderRadius: 6, background: p.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', font: "800 9px 'Plus Jakarta Sans'", color: p.badgeC }}>{p.badge || ''}</span>
                <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}><span style={{ display: 'block', font: "800 12.5px 'Plus Jakarta Sans'", color: INK }}>{p.label}</span><span style={{ display: 'block', font: "600 10.5px 'Plus Jakarta Sans'", color: '#9A96AE' }}>{p.sub}</span></span>
                <span style={radio(on)}>{on && <span style={{ width: 9, height: 9, borderRadius: '50%', background: PRI }} />}</span>
              </button>
            ); })}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 3px' }}><IconLock w={13} stroke="#9A96AE" /><span style={{ font: "600 10.5px 'Plus Jakarta Sans'", color: '#9A96AE', lineHeight: 1.4 }}>{L('El pago se procesa de forma segura con Stripe al confirmar.', 'Payment is processed securely with Stripe on confirm.')}</span></div>
          </div>

          {isDelivery && (
            <>
              <Overline mt>{L('Propina para el repartidor', 'Tip for your driver')}</Overline>
              <div style={{ display: 'flex', gap: 7 }}>
                {tipDefs.map((p) => { const on = tipPct === p; return (
                  <button key={p} onClick={() => setTipPct(p)} style={{ flex: 1, border: `1.5px solid ${on ? PRI : '#E2DEF4'}`, background: on ? '#F7F5FF' : '#fff', color: on ? PRI2 : INK, cursor: 'pointer', padding: '9px 4px', borderRadius: 11, textAlign: 'center' }}>
                    <span style={{ font: "800 13px 'Plus Jakarta Sans'" }}>{p === 0 ? L('Otra', 'Other') : p + '%'}</span>
                    <span style={{ display: 'block', font: "600 9.5px 'Plus Jakarta Sans'", marginTop: 1, opacity: .8 }}>{p === 0 ? '' : money(Math.round(T.sub * (p / 100) * 100) / 100)}</span>
                  </button>
                ); })}
              </div>
              <div style={{ font: "600 10.5px 'Plus Jakarta Sans'", color: '#9A96AE', marginTop: 8, textAlign: 'center' }}>{L('El 100% de la propina es para tu repartidor', '100% of the tip goes to your driver')} 💜</div>
            </>
          )}

          <div style={{ background: '#fff', border: '1px solid rgba(30,27,46,.08)', borderRadius: 15, padding: 14, marginTop: 20 }}>
            <div style={{ font: "800 13px 'Plus Jakarta Sans'", color: INK, marginBottom: 11 }}>{L('Resumen del cobro', 'Charge summary')}</div>
            {rows.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                <span style={{ font: `${s.green ? 700 : 600} 12.5px 'Plus Jakarta Sans'`, color: s.green ? '#1F8A4C' : '#6E6A85' }}>{s.label}{s.info && <span style={{ color: '#B7B3C6', fontWeight: 600 }}> · {s.info}</span>}</span>
                <span style={{ font: `${s.green ? 700 : 600} 12.5px 'Plus Jakarta Sans'`, color: s.green ? '#1F8A4C' : INK }}>{s.value}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'rgba(30,27,46,.08)', margin: '9px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ font: "800 15px 'Plus Jakarta Sans'", color: INK }}>{L('Total', 'Total')}</span><span style={{ font: "800 18px 'Plus Jakarta Sans'", color: INK }}>{money(T.total)}</span></div>
          </div>
          <div style={{ height: 8 }} />
        </div>
        <div style={{ flex: 'none', padding: '11px 16px max(16px,env(safe-area-inset-bottom))', background: '#fff', borderTop: '1px solid rgba(30,27,46,.07)' }}>
          <button onClick={placeOrder} disabled={paying} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', cursor: 'pointer', background: PRI, color: '#fff', padding: '16px 18px', borderRadius: 15, boxShadow: '0 12px 24px rgba(123,97,255,.32)' }}><span style={{ font: "800 15px 'Plus Jakarta Sans'" }}>{L('Realizar pedido', 'Place order')}</span><span style={{ font: "800 15px 'Plus Jakarta Sans'" }}>{money(T.total)}</span></button>
        </div>
      </div>
    );
  }

  function ItemSheet() {
    if (!sheet) return null;
    const e = itemById(sheet.itemId); if (!e) return null;
    const groups = groupsOf(e.catKey, e.it);
    const bdg = badgeOf(e.it); const [bb, bc] = badgeStyle(bdg);
    const running = e.it.price + addonsPrice(e.catKey, e.it, sheet.sel);
    return (
      <>
        <div onClick={() => setSheet(null)} style={overlay(30)} />
        <div className="of-ns" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 31, maxHeight: '92%', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '24px 24px 0 0', boxShadow: '0 -18px 50px rgba(28,24,46,.3)', animation: 'tlsheet .26s cubic-bezier(.4,0,.2,1)' }}>
          <div className="of-ns" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <div style={{ height: 150, position: 'relative', background: e.it.img ? undefined : grad(e.tile), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {e.it.img ? <img src={e.it.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Glyph cat={e.catKey} size={54} />}
              <button onClick={() => setSheet(null)} style={{ position: 'absolute', right: 14, top: 14, width: 34, height: 34, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(0,0,0,.15)' }}><IconX w={15} stroke={INK} /></button>
            </div>
            <div style={{ padding: '16px 18px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}><span style={{ font: "800 19px 'Plus Jakarta Sans'", color: INK, letterSpacing: '-.01em' }}>{B(e.it.n)}</span><span style={{ font: "800 17px 'Plus Jakarta Sans'", color: INK, whiteSpace: 'nowrap' }}>{money(e.it.price)}</span></div>
              <div style={{ font: "500 12.5px 'Plus Jakarta Sans'", color: '#7C7790', marginTop: 6, lineHeight: 1.5 }}>{B(e.it.d)}</div>
              {(e.it.kcal || bdg) && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>{e.it.kcal ? <span style={{ font: "600 11px 'Plus Jakarta Sans'", color: '#B7B3C6' }}>{e.it.kcal} Cal</span> : null}{bdg && <span style={{ background: bb, color: bc, padding: '2px 8px', borderRadius: 6, font: "800 9px 'Plus Jakarta Sans'" }}>{bdg}</span>}</div>}
            </div>
            <div style={{ padding: '0 18px' }}>
              {groups.map((g) => { const v = sheet.sel[g.id]; const single = g.type === 'single'; const max = g.max ?? 99; return (
                <div key={g.id} style={{ padding: '14px 0', borderTop: '1px solid rgba(30,27,46,.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
                    <span style={{ font: "800 14px 'Plus Jakarta Sans'", color: INK }}>{B(g.name)}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 6, font: "800 8.5px 'Plus Jakarta Sans'", background: g.required ? '#EFEBFF' : '#F1EFFA', color: g.required ? PRI2 : '#9A96AE' }}>{g.required ? L('Obligatorio', 'Required') : L('Opcional', 'Optional')}</span>
                    <span style={{ marginLeft: 'auto', font: "600 10.5px 'Plus Jakarta Sans'", color: '#9A96AE' }}>{single ? L('Elige uno', 'Choose one') : `${L('Elige hasta', 'Up to')} ${max}`}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {g.choices.map((o, i) => { const on = single ? v === i : Array.isArray(v) && v.includes(i); return (
                      <button key={i} onClick={() => pickOpt(g.id, i, single, max)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', border: 'none', background: 'none', cursor: 'pointer', padding: '9px 2px', textAlign: 'left' }}>
                        <span style={{ width: 20, height: 20, borderRadius: single ? '50%' : 6, border: `1.5px solid ${on ? PRI : '#D8D2E6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', background: on ? PRI : '#fff' }}>{on && (single ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} /> : <IconCheck w={11} sw={3.4} stroke="#fff" />)}</span>
                        <span style={{ flex: 1, font: `${on ? 700 : 500} 12.5px 'Plus Jakarta Sans'`, color: INK }}>{B(o.label)}</span>
                        {o.price ? <span style={{ font: "700 12px 'Plus Jakarta Sans'", color: '#6E6A85' }}>{o.price > 0 ? '+' + money(o.price) : money(o.price)}</span> : null}
                      </button>
                    ); })}
                  </div>
                </div>
              ); })}
              <div style={{ padding: '14px 0', borderTop: '1px solid rgba(30,27,46,.07)' }}>
                <div style={{ font: "800 14px 'Plus Jakarta Sans'", color: INK, marginBottom: 9 }}>{L('Instrucciones especiales', 'Special instructions')}</div>
                <textarea value={sheet.note} onChange={(ev) => { const val = ev.target.value; setSheet((s) => (s ? { ...s, note: val } : s)); }} placeholder={L('¿Alguna preferencia? Ej. sin cebolla, bien cocido…', 'Any preferences? E.g. no onions, well done…')} style={{ width: '100%', height: 64, resize: 'none', border: '1.5px solid #E2DEF4', borderRadius: 12, padding: '11px 13px', font: "500 12.5px 'Plus Jakarta Sans'", color: INK, outline: 'none', lineHeight: 1.5 }} />
              </div>
              <div style={{ height: 8 }} />
            </div>
          </div>
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px max(18px,env(safe-area-inset-bottom))', borderTop: '1px solid rgba(30,27,46,.08)', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F1EFFA', borderRadius: 13, padding: '8px 10px', flex: 'none' }}>
              <button onClick={() => setSheet((s) => (s ? { ...s, qty: Math.max(1, s.qty - 1) } : s))} style={{ width: 30, height: 30, borderRadius: 9, background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{sheet.qty <= 1 ? <IconX w={14} stroke="#9A96AE" /> : <IconMinus />}</button>
              <span style={{ font: "800 15px 'Plus Jakarta Sans'", color: INK, minWidth: 16, textAlign: 'center' }}>{sheet.qty}</span>
              <button onClick={() => setSheet((s) => (s ? { ...s, qty: s.qty + 1 } : s))} style={{ width: 30, height: 30, borderRadius: 9, background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconPlus w={14} /></button>
            </div>
            <button onClick={commitSheet} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', cursor: 'pointer', background: PRI, color: '#fff', padding: '14px 16px', borderRadius: 14, boxShadow: '0 10px 22px rgba(123,97,255,.32)' }}><span style={{ font: "800 13.5px 'Plus Jakarta Sans'" }}>{sheet.editKey ? L('Actualizar', 'Update') : `${L('Agregar', 'Add')} ${sheet.qty}`}</span><span style={{ font: "800 13.5px 'Plus Jakarta Sans'" }}>{money(running * sheet.qty)}</span></button>
          </div>
        </div>
      </>
    );
  }

  function SecondarySheet() {
    const title = modal === 'address' ? L('Elige una dirección', 'Choose an address') : modal === 'newaddr' ? L('Nueva dirección', 'New address') : modal === 'dropoff' ? L('Instrucciones de entrega', 'Delivery instructions') : '';
    const dropDefs: [string, string][] = [['door', L('Dejar en la puerta', 'Leave at door')], ['hand', L('Entregar en mano', 'Hand it to me')], ['bell', L('Tocar el timbre / llamar', 'Ring the bell / call')]];
    return (
      <>
        <div onClick={() => setModal(null)} style={overlay(34)} />
        <div className="of-ns" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 35, maxHeight: '88%', overflowY: 'auto', background: '#fff', borderRadius: '24px 24px 0 0', boxShadow: '0 -18px 50px rgba(28,24,46,.3)', animation: 'tlsheet .24s ease' }}>
          <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '9px 0 6px', display: 'flex', justifyContent: 'center', borderRadius: '24px 24px 0 0', zIndex: 2 }}><span style={{ width: 42, height: 5, borderRadius: 3, background: '#E3DEF2' }} /></div>
          <div style={{ padding: '2px 18px max(22px,env(safe-area-inset-bottom))' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}><span style={{ font: "800 17px 'Plus Jakarta Sans'", color: INK }}>{title}</span><button onClick={() => setModal(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#F1EFFA', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX w={13} stroke={INK} /></button></div>

            {modal === 'address' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {addressStore.addresses.length === 0 && <div style={{ font: "600 12px 'Plus Jakarta Sans'", color: '#9A96AE', padding: '4px 2px' }}>{L('Aún no tienes direcciones guardadas.', 'No saved addresses yet.')}</div>}
                {addressStore.addresses.map((a) => { const on = (chosenAddr?.id ?? null) === a.id; return (
                  <button key={a.id} onClick={() => { setAddrId(a.id); setModal(null); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: `1.5px solid ${on ? PRI : '#E2DEF4'}`, background: on ? '#F7F5FF' : '#fff', cursor: 'pointer', padding: 12, borderRadius: 13 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 11, background: '#EFEBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><IconPin w={18} /></span>
                    <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}><span style={{ display: 'block', font: "800 13px 'Plus Jakarta Sans'", color: INK }}>{a.label || L('Dirección', 'Address')}{a.is_default ? ` · ${L('Principal', 'Default')}` : ''}</span><span style={{ display: 'block', font: "600 11px 'Plus Jakarta Sans'", color: '#9A96AE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.formatted}</span></span>
                    <span style={radio(on)}>{on && <span style={{ width: 9, height: 9, borderRadius: '50%', background: PRI }} />}</span>
                  </button>
                ); })}
                <button onClick={() => setModal('newaddr')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, border: '1.5px dashed #C9C2E6', background: '#F7F6FC', color: PRI2, cursor: 'pointer', padding: 13, borderRadius: 12, font: "800 12.5px 'Plus Jakarta Sans'", marginTop: 4 }}><IconPlus stroke={PRI2} /> {L('Agregar dirección nueva', 'Add new address')}</button>
              </div>
            )}

            {modal === 'newaddr' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <Field label={L('Dirección', 'Address')}><input value={na.line} onChange={(e) => setNa((s) => ({ ...s, line: e.target.value }))} placeholder={L('Calle y número', 'Street and number')} style={inputCss} /></Field>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Field label={L('Apto / Interior', 'Apt / Unit')} flex><input value={na.apt} onChange={(e) => setNa((s) => ({ ...s, apt: e.target.value }))} placeholder={L('Opcional', 'Optional')} style={inputCss} /></Field>
                  <Field label={L('Código postal', 'ZIP')} flex><input value={na.zip} onChange={(e) => setNa((s) => ({ ...s, zip: e.target.value }))} placeholder="18201" style={inputCss} /></Field>
                </div>
                <Field label={L('Etiqueta', 'Label')}>
                  <div style={{ display: 'flex', gap: 8 }}>{['Casa', 'Trabajo', 'Otro'].map((x) => { const on = na.label === x; return <button key={x} onClick={() => setNa((s) => ({ ...s, label: x }))} style={{ flex: 1, border: `1.5px solid ${on ? PRI : '#E2DEF4'}`, background: on ? '#F7F5FF' : '#fff', color: on ? PRI2 : '#56506E', cursor: 'pointer', padding: 10, borderRadius: 11, font: "800 12px 'Plus Jakarta Sans'" }}>{x}</button>; })}</div>
                </Field>
                <button onClick={saveNewAddr} style={{ width: '100%', border: 'none', background: na.line.trim() ? PRI : '#D8D2EC', color: '#fff', padding: 14, borderRadius: 13, font: "800 13.5px 'Plus Jakarta Sans'", cursor: 'pointer', marginTop: 2 }}>{L('Guardar y usar', 'Save and use')}</button>
              </div>
            )}

            {modal === 'dropoff' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {dropDefs.map(([id, label]) => { const on = dropoff === id; return (
                  <button key={id} onClick={() => setDropoff(id)} style={{ display: 'flex', alignItems: 'center', width: '100%', border: `1.5px solid ${on ? PRI : '#E2DEF4'}`, background: on ? '#F7F5FF' : '#fff', cursor: 'pointer', padding: 13, borderRadius: 12 }}><span style={{ flex: 1, textAlign: 'left', font: "700 13px 'Plus Jakarta Sans'", color: INK }}>{label}</span><span style={radio(on)}>{on && <span style={{ width: 9, height: 9, borderRadius: '50%', background: PRI }} />}</span></button>
                ); })}
                <textarea value={dropoffNote} onChange={(e) => setDropoffNote(e.target.value)} placeholder={L('Nota para el repartidor (ej. portón azul, dejar con recepción)', 'Note for the driver (e.g. blue gate, leave with reception)')} style={{ width: '100%', height: 60, resize: 'none', border: '1.5px solid #E2DEF4', borderRadius: 12, padding: '11px 13px', font: "500 12px 'Plus Jakarta Sans'", color: INK, outline: 'none', lineHeight: 1.5, marginTop: 4 }} />
                <button onClick={() => setModal(null)} style={{ width: '100%', border: 'none', background: PRI, color: '#fff', padding: 14, borderRadius: 13, font: "800 13.5px 'Plus Jakarta Sans'", cursor: 'pointer', marginTop: 2 }}>{L('Listo', 'Done')}</button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
}

// ---- small presentational helpers -----------------------------------------
const roundBtn: React.CSSProperties = { width: 38, height: 38, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(60,50,110,.16)' };
const backBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: '50%', background: '#F1EFFA', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' };
const stepBtn: React.CSSProperties = { width: 24, height: 24, borderRadius: 7, background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const inputCss: React.CSSProperties = { width: '100%', border: '1.5px solid #E2DEF4', borderRadius: 11, padding: '11px 13px', font: "600 12.5px 'Plus Jakarta Sans'", color: INK, outline: 'none' };
const quickBtn = (s: number): React.CSSProperties => ({ position: 'absolute', right: s > 28 ? 6 : 7, bottom: s > 28 ? 6 : 7, width: s, height: s, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 8px rgba(60,50,110,.22)' });
const overlay = (z: number): React.CSSProperties => ({ position: 'absolute', inset: 0, zIndex: z, background: 'rgba(28,24,46,.5)', animation: 'tlfade .2s ease' });
const radio = (on: boolean): React.CSSProperties => ({ width: 19, height: 19, borderRadius: '50%', border: `1.5px solid ${on ? PRI : '#D8D2E6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' });

function MiniStat({ value, label, valueC = INK }: { value: string; label: string; valueC?: string }) {
  return <div style={{ flex: 1, background: '#fff', border: '1px solid rgba(30,27,46,.08)', borderRadius: 13, padding: '10px 8px', textAlign: 'center' }}><div style={{ font: "800 14px 'Plus Jakarta Sans'", color: valueC }}>{value}</div><div style={{ font: "600 9.5px 'Plus Jakarta Sans'", color: '#9A96AE', marginTop: 2 }}>{label}</div></div>;
}
function SegBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', cursor: 'pointer', padding: 9, borderRadius: 10, font: "800 12.5px 'Plus Jakarta Sans'", background: on ? '#fff' : 'transparent', color: on ? PRI : '#6E6A85', boxShadow: on ? '0 2px 6px rgba(60,50,110,.12)' : 'none' }}>{children}</button>;
}
function WhenBtn({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) {
  return <button onClick={onClick} style={{ flex: 1, border: `1.5px solid ${on ? PRI : '#E2DEF4'}`, background: on ? '#F7F5FF' : '#fff', color: on ? PRI2 : INK, cursor: 'pointer', padding: 11, borderRadius: 12, textAlign: 'left' }}><span style={{ font: "800 12.5px 'Plus Jakarta Sans'" }}>{title}</span><span style={{ display: 'block', font: "600 10.5px 'Plus Jakarta Sans'", marginTop: 2, opacity: .85 }}>{sub}</span></button>;
}
function Overline({ children, mt }: { children: React.ReactNode; mt?: boolean }) {
  return <div style={{ font: "800 10px 'Plus Jakarta Sans'", color: '#A8A4B8', textTransform: 'uppercase', letterSpacing: '.06em', margin: mt ? '18px 0 9px' : '0 0 9px' }}>{children}</div>;
}
function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return <div style={{ flex: flex ? 1 : undefined }}><div style={{ font: "800 11px 'Plus Jakarta Sans'", color: '#56506E', marginBottom: 6 }}>{label}</div>{children}</div>;
}
