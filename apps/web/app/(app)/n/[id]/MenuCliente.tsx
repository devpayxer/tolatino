"use client";
/* Pestaña Menú de la ficha (prototipo «Ficha · menú», «Menú · plato y opciones», «Menú · tu pedido», «otra igual o con
   cambios», «cuál quitas» y sus versiones desktop; menuVals). Compuesto con el sistema de diseño (MenuItemRow, MenuTile,
   OptionGroup, QtyStepper, CartLine, OrderBar). El carrito vive en este teléfono (por negocio); el precio, las opciones
   y el inventario los vuelve a decidir el servidor al enviar. */
import * as UI from "@tolatino/ui";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react";
import type { MenuPublico, PItem } from "@/lib/pedir";

type N = "Icon" | "Button" | "Tag" | "Chip" | "MenuItemRow" | "MenuTile" | "OptionGroup" | "QtyStepper" | "CartLine" | "OrderBar";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Tag, Chip, MenuItemRow, MenuTile, OptionGroup, QtyStepper, CartLine, OrderBar } = UI as unknown as Record<N, ComponentType<any>>;

export type Linea = { id: string; ch: Record<string, number[]>; q: number; nt: string; k: Record<string, string[]> };
const CLAVE = "tl-carrito-v1", VIDA = 24 * 3600 * 1000;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const hora = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const foto = (u: string | null): CSSProperties => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
const stop = (e?: { stopPropagation?: () => void }) => e?.stopPropagation?.();

/* ── Carrito en el teléfono (por negocio, 24 h) ── */
function leer(): Record<string, { at: number; lines: Linea[] }> {
  try { const o = JSON.parse(localStorage.getItem(CLAVE) || "{}"); return o && typeof o === "object" ? o : {}; } catch { return {}; }
}
export function carritoGuardado(negocio: string): Linea[] {
  const x = leer()[negocio];
  return x && Date.now() - x.at < VIDA && Array.isArray(x.lines) ? x.lines : [];
}
export function guardarCarrito(negocio: string, lines: Linea[]) {
  try {
    const o = leer();
    for (const k of Object.keys(o)) if (Date.now() - (o[k]?.at ?? 0) > VIDA) delete o[k];
    if (lines.length) o[negocio] = { at: Date.now(), lines }; else delete o[negocio];
    localStorage.setItem(CLAVE, JSON.stringify(o));
  } catch { /* sin almacenamiento: el carrito vive solo en esta pantalla */ }
}
/* Delivery o Pickup: lo último que eligió la persona en ese negocio (en este teléfono). */
const CLAVE_MODO = "tl-modo-v1";
export type Modo = "delivery" | "pickup";
export function modoGuardado(negocio: string): Modo | null {
  try { const v = JSON.parse(localStorage.getItem(CLAVE_MODO) || "{}")[negocio]; return v === "delivery" || v === "pickup" ? v : null; } catch { return null; }
}
export function guardarModo(negocio: string, modo: Modo) {
  try { const o = JSON.parse(localStorage.getItem(CLAVE_MODO) || "{}"); o[negocio] = modo; localStorage.setItem(CLAVE_MODO, JSON.stringify(o)); } catch { /* sin almacenamiento */ }
}
/* El modo que vale: el guardado si el negocio lo tiene ahora; si no, el primero que ofrece (delivery primero). */
export const modoDe = (m: MenuPublico, guardado: Modo | null): Modo => (guardado && m.estado.modes.includes(guardado) ? guardado : m.estado.modes[0] ?? "pickup");
/* Envío, mínimo, zona y platos de un solo modo (menuVals: fee, blk, blkS, freeNote): para el carrito, la tarjeta y el pago. */
export function entrega(m: MenuPublico, lines: Linea[], modo: Modo, es: boolean) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const C = calc(m, lines), D = m.estado.dlv, dl = modo === "delivery" && !!D;
  const fee = dl && C.sub > 0 ? (D!.free && C.sub >= D!.free ? 0 : D!.fee) : 0;
  const bad = lines.map((l) => m.items[l.id]).find((it) => it && (dl ? !it.dlv : !it.pick));
  const minMiss = dl && D!.min && C.sub > 0 && C.sub < D!.min ? D!.min - C.sub : 0;
  const fuera = dl && m.dir && m.dir.mi != null && !m.dir.dentro;
  const blk = !lines.length ? "" : fuera ? E2(`Tu dirección queda a ${m.dir!.mi} mi y ${m.negocio.nombre} lleva hasta ${D!.zone} mi. Pide pickup.`, `Your address is ${m.dir!.mi} mi away and ${m.negocio.nombre} delivers up to ${D!.zone} mi. Order pickup.`)
    : bad ? E2(`«${bad.name}» es solo ${dl ? "pickup" : "delivery"}: cambia a ${dl ? "Pickup" : "Delivery"} o quítalo.`, `“${bad.name}” is ${dl ? "pickup" : "delivery"} only: switch to ${dl ? "Pickup" : "Delivery"} or remove it.`)
    : minMiss ? E2(`Delivery desde ${money(D!.min)}: agrega ${money(minMiss)} más.`, `Delivery from ${money(D!.min)}: add ${money(minMiss)} more.`) : "";
  const blkS = !blk ? "" : fuera ? E2("No llega a tu dirección", "Does not reach your address") : bad ? E2("Revisa tu pedido", "Check your order") : `${E2("Mínimo ", "Minimum ")}${money(D!.min)}${E2(" · faltan ", " · add ")}${money(minMiss)}`;
  const hasFree = !!blk || (dl && C.sub > 0 && !!D!.free);
  const freeNote = blk || (D?.free && C.sub >= D.free ? E2(`Envío gratis: tu pedido pasa de ${money(D.free)}.`, `Free delivery: your order is over ${money(D.free)}.`) : D?.free ? E2(`Te faltan ${money(Math.max(0, D.free - C.sub))} para envío gratis.`, `${money(Math.max(0, D.free - C.sub))} more for free delivery.`) : "");
  const freePct = blk ? (minMiss ? `${Math.round((C.sub / D!.min) * 100)}%` : "0%") : D?.free ? `${Math.min(100, Math.round((C.sub / D.free) * 100))}%` : "0%";
  const freeFg = blk ? (minMiss ? "var(--tl-pro-ink)" : "var(--tl-danger)") : D?.free && C.sub >= D.free ? "var(--tl-open-text)" : "rgba(11,14,18,.7)";
  return { dl, fee, total: C.total + fee, blk, blkS, hasFree, freeNote, freePct, freeFg };
}

/* Las líneas que ya no encajan con el menú de hoy (plato quitado, opción cambiada) se caen al cargar. */
export function limpiar(m: MenuPublico, lines: Linea[]) {
  return lines.filter((l) => {
    const it = m.items[l.id];
    if (!it || !(l.q >= 1)) return false;
    return Object.entries(l.ch || {}).every(([gk, ix]) => it.grp.includes(gk) && ix.every((i, n) => m.grps[gk]?.o[i] && (!l.k?.[gk] || l.k[gk]![n] === m.grps[gk]!.o[i]!.k)));
  });
}

/* ── Cálculos del pedido (los mismos del servidor, solo para mostrar) ── */
export function calc(m: MenuPublico, lines: Linea[]) {
  const unit = (it: PItem, ch: Record<string, number[]>) => it.cents + it.grp.reduce((a, gk) => a + (ch[gk] || []).reduce((x, i) => x + (m.grps[gk]?.o[i]?.cents ?? 0), 0), 0);
  let sub = 0, tax = 0, count = 0, extra = 0;
  const pcts = new Set<number>();
  for (const l of lines) {
    const it = m.items[l.id];
    if (!it) continue;
    const t = unit(it, l.ch) * l.q;
    sub += t; tax += (t * it.tax) / 100; count += l.q; extra = Math.max(extra, it.extra);
    if (it.tax > 0) pcts.add(it.tax);
  }
  tax = Math.round(tax);
  return { sub, tax, total: sub + tax, count, extra, unit, taxPct: pcts.size === 1 ? [...pcts][0]! : null };
}

type Ask = { kind: "again" | "which"; id: string; desk: boolean } | null;

/* El controlador del menú (menuVals): lo usan la pestaña, el Resumen, la barra y el carrito. */
export function useMenu(m: MenuPublico | null, es: boolean, opts: { onPay: () => void }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const biz = m?.negocio.id ?? "";
  const [cart, setCartS] = useState<Linea[]>([]);
  const [listo, setListo] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [ch, setCh] = useState<Record<string, number[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState<number | null>(null);
  const [backCart, setBackCart] = useState(false);
  const [custom, setCustom] = useState(false);
  const [vista, setVista] = useState<"" | "sheet" | "dlg">("");
  const [ask, setAsk] = useState<Ask>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo: Linea[] | null } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [noAsk, setNoAsk] = useState(false);
  const [cat, setCat] = useState<string | null>(null);
  const [modoG, setModoG] = useState<Modo | null>(null);
  const tt = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), to = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { if (m) { setCartS(limpiar(m, carritoGuardado(biz))); setModoG(modoGuardado(biz)); setListo(true); } }, [m, biz]);
  const setCart = useCallback((c: Linea[]) => { setCartS(c); guardarCarrito(biz, c); }, [biz]);
  const flash = useCallback((msg: string, undo: Linea[] | null = null) => {
    setToast({ msg, undo }); clearTimeout(tt.current); tt.current = setTimeout(() => setToast(null), undo ? 4000 : 1800);
  }, []);

  if (!m) return null;
  const est = m.estado, canOrd = est.canOrd;
  const modo = modoDe(m, modoG), dl = modo === "delivery";
  // Un plato que es solo pickup no se pide en delivery (y al revés): sale atenuado con su etiqueta.
  const offOf = (it: PItem) => (dl ? !it.dlv : !it.pick) || it.ago || it.nosell || it.hrsOff;
  const { unit } = calc(m, []);
  const miss = (it: PItem, c: Record<string, number[]>) => it.grp.filter((gk) => m.grps[gk]!.req && !(c[gk] || []).length);
  const sumTxt = (it: PItem, c: Record<string, number[]>) => it.grp.flatMap((gk) => (c[gk] || []).map((i) => m.grps[gk]!.o[i]?.l ?? "")).join(" · ");
  const capOf = (it: PItem) => Math.min(it.left ?? 99, it.maxQ || 99);
  const qOf = (id: string) => cart.filter((l) => l.id === id).reduce((a, l) => a + l.q, 0);
  const linesOf = (id: string) => cart.map((l, i) => [l, i] as const).filter(([l]) => l.id === id);
  const keysOf = (c: Record<string, number[]>) => Object.fromEntries(Object.entries(c).map(([gk, ix]) => [gk, ix.map((i) => m.grps[gk]?.o[i]?.k ?? "")]));
  const push = (c0: Linea[], id: string, c: Record<string, number[]>, q: number, nt = "") => {
    const it = m.items[id]!, cap = capOf(it), had = c0.filter((l) => l.id === id).reduce((a, l) => a + l.q, 0);
    if (had + q > cap) {
      setTimeout(() => flash(it.maxQ && it.maxQ <= (it.left ?? 99) ? E2(`Máximo ${it.maxQ} por pedido.`, `Up to ${it.maxQ} per order.`) : E2(`Solo quedan ${cap}.`, `Only ${cap} left.`)), 0);
      q = cap - had; if (q <= 0) return c0;
    }
    const key = id + JSON.stringify(c) + nt, c1 = c0.map((l) => ({ ...l })), f = c1.find((l) => l.id + JSON.stringify(l.ch) + l.nt === key);
    if (f) f.q += q; else c1.push({ id, ch: c, q, nt, k: keysOf(c) });
    return c1;
  };
  const expand = (id: string, desk = false) => { setAbierto(id); if (desk) return; clearTimeout(to.current); to.current = setTimeout(() => setAbierto(null), 3500); };
  const open = (id: string, desk = false) => {
    const it = m.items[id]; if (!it || offOf(it) || !canOrd) return;
    setSel(id); setCh({}); setQty(1); setNote(""); setEdit(null); setCustom(false); setAsk(null); setCartOpen(false); setVista(desk ? "dlg" : "sheet");
  };
  const quick = (id: string, desk = false) => {
    const it = m.items[id]; if (!it || offOf(it) || !canOrd) return;
    const q = qOf(id);
    if (!it.grp.length) { setCart(push(cart, id, {}, 1)); expand(id, desk); return; }
    if (!q) return open(id, desk);
    const LL = linesOf(id), last = LL[LL.length - 1]![0];
    if (noAsk) { setCart(push(cart, id, last.ch, 1, last.nt)); expand(id, desk); flash(E2(`Otra igual · ${q + 1} en tu pedido`, `One more · ${q + 1} in your order`)); return; }
    setAsk({ kind: "again", id, desk });
  };
  const minus = (id: string, desk = false) => {
    const it = m.items[id]!, LL = linesOf(id), q = qOf(id); if (!q) return;
    if (q === 1) { const antes = cart; setCart(cart.filter((l) => l.id !== id)); setAbierto(null); flash(E2(`Quitaste ${it.name}`, `Removed ${it.name}`), antes); return; }
    if (LL.length > 1) return setAsk({ kind: "which", id, desk });
    const c = cart.map((l) => ({ ...l })); c[LL[0]![1]]!.q -= 1; setCart(c); expand(id, desk);
  };
  const tagsOf = (it: PItem) => [
    est.modes.length > 1 && it.pick !== it.dlv && !it.ago ? { label: it.pick ? E2("SOLO PICKUP", "PICKUP ONLY") : E2("SOLO DELIVERY", "DELIVERY ONLY"), tone: "neutral" } : null,
    it.ago ? { label: E2("AGOTADO HOY", "SOLD OUT TODAY"), tone: "danger" } : null,
    it.nosell && !it.ago ? { label: E2("SOLO EN EL LOCAL", "IN STORE ONLY"), tone: "neutral" } : null,
    it.left != null && !it.ago && !it.nosell && it.left > 0 && it.left <= (est.low || 3) ? { label: E2(`QUEDAN ${it.left}`, `ONLY ${it.left} LEFT`), tone: "danger" } : null,
    m.pop.includes(it.id) ? { label: "POPULAR", tone: "neutral" } : null,
    it.hrsL ? { label: it.hrsL, tone: "neutral" } : null,
    it.extra ? { label: E2(`TARDA ${it.extra} MIN`, `TAKES ${it.extra} MIN`), tone: "neutral" } : null,
  ].filter(Boolean) as { label: string; tone: string }[];
  const card = (it: PItem) => {
    const q = qOf(it.id), off = offOf(it) || !canOrd, nF = cart.filter((l) => l.id === it.id).length;
    return {
      id: it.id, name: it.name, desc: it.desc, price: money(it.cents), image: it.img, tags: tagsOf(it), qty: q, off, open: q > 0 && abierto === it.id,
      selected: sel === it.id && !!vista && !off, forms: nF > 1 ? E2(`${nF} FORMAS`, `${nF} WAYS`) : "",
      onOpen: () => open(it.id), onDesk: () => open(it.id, true), onPlus: (e?: unknown) => { stop(e as Event); quick(it.id); }, onPlusD: (e?: unknown) => { stop(e as Event); quick(it.id, true); },
      onMinus: (e?: unknown) => { stop(e as Event); minus(it.id); }, onMinusD: (e?: unknown) => { stop(e as Event); minus(it.id, true); }, onExp: () => expand(it.id),
      onEnter: () => { if (q > 0 && abierto !== it.id) setAbierto(it.id); }, onLeave: () => { if (abierto === it.id) setAbierto(null); },
    };
  };
  const pop = m.pop.map((id) => card(m.items[id]!));
  const cats = m.secs.map((s) => ({ k: s.id, title: s.name, note: s.note, items: s.items.map((id) => card(m.items[id]!)) }));
  const catSel = cat ?? (pop.length ? "pop" : cats[0]?.k ?? "");
  const jump = (k: string, desk: boolean) => {
    setCat(k);
    setTimeout(() => {
      const el = document.querySelector(`[data-msec="${desk ? "d-" : "m-"}${k}"]`);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (desk ? 140 : 120), behavior: "smooth" });
    }, 0);
  };
  const chips = (pop.length ? [{ k: "pop", l: E2("Populares", "Popular") }] : []).concat(m.secs.map((s) => ({ k: s.id, l: s.name })))
    .map((c) => ({ ...c, on: catSel === c.k, onClick: () => jump(c.k, false), onDesk: () => jump(c.k, true) }));

  /* La hoja del plato */
  const it = sel ? m.items[sel] : undefined;
  const ms = it ? miss(it, ch) : [], u = it ? unit(it, ch) : 0;
  const shortN = (gk: string) => m.grps[gk]!.name.replace(/^(Elige (la |el )?|Choose (the )?)/i, "").toLowerCase();
  const add = () => {
    if (!it || ms.length) return;
    const nt = note.trim();
    if (edit != null && cart[edit]) {
      const c = cart.map((l) => ({ ...l })); c[edit] = { id: it.id, ch, q: qty, nt, k: keysOf(ch) }; setCart(c);
      setVista(""); setEdit(null); setCartOpen(backCart); flash(E2("Plato actualizado", "Dish updated")); return;
    }
    const had = qOf(it.id); setCart(push(cart, it.id, ch, qty, nt)); setVista(""); setCustom(false);
    flash(had ? `${custom ? E2("Otra con cambios · ", "One more, changed · ") : E2("Agregado · ", "Added · ")}${had + qty}${E2(" en tu pedido", " in your order")}` : `${E2("Agregado: ", "Added: ")}${it.name}`);
    expand(it.id, vista === "dlg");
  };
  const sh = it && vista ? {
    it, desk: vista === "dlg", name: it.name, desc: it.desc, price: money(it.cents), tags: tagsOf(it), img: it.img, isCustom: custom, qty, note,
    customNote: E2("Empezamos con lo de la anterior. Cambia lo que quieras; se agrega aparte.", "We started from your last one. Change anything; it is added separately."),
    tNote: it.extra ? E2(`Se hace al momento: tarda unos ${it.extra} minutos.`, `Made to order: takes about ${it.extra} minutes.`) : "",
    groups: it.grp.map((gk) => {
      const g = m.grps[gk]!, cur = ch[gk] || [], multi = g.max > 1;
      return {
        k: gk, title: g.name, required: g.req, done: g.req && cur.length > 0, multi,
        meta: g.req ? (multi ? E2(`ELIGE HASTA ${g.max}`, `CHOOSE UP TO ${g.max}`) : E2("ELIGE 1", "CHOOSE 1")) : E2(`OPCIONAL · HASTA ${g.max}`, `OPTIONAL · UP TO ${g.max}`),
        options: g.o.map((o, i) => {
          const on = cur.includes(i), sold = o.off && !on, full = (multi && !on && cur.length >= g.max) || sold;
          return { label: o.l + (sold ? E2(" · agotada", " · sold out") : ""), price: o.cents ? `+${money(o.cents)}` : "", selected: on, disabled: full };
        }),
        onToggle: (i: number) => {
          if (g.o[i]?.off && !cur.includes(i)) return;
          setCh((s) => { const c0 = s[gk] || []; const nx = g.max === 1 ? [i] : c0.includes(i) ? c0.filter((x) => x !== i) : c0.length < g.max ? c0.concat(i) : c0; return { ...s, [gk]: nx }; });
        },
      };
    }),
    disabled: ms.length > 0,
    cta: ms.length ? `${E2("Elige: ", "Choose: ")}${ms.map(shortN).join(", ")}` : `${edit != null ? E2("Guardar cambios · ", "Save changes · ") : E2("Agregar · ", "Add · ")}${money(u * qty)}`,
    onNote: (v: string) => setNote(v.slice(0, 200)),
    onInc: () => { const c2 = Math.min(20, capOf(it)); if (qty + 1 > c2) { flash(it.maxQ && it.maxQ === c2 ? E2(`Máximo ${c2} por pedido.`, `Up to ${c2} per order.`) : E2(`Solo quedan ${c2}.`, `Only ${c2} left.`)); return; } setQty(qty + 1); },
    onDec: () => setQty(Math.max(1, qty - 1)), onAdd: add,
    onClose: () => { setVista(""); if (edit != null && backCart) setCartOpen(true); setEdit(null); },
  } : null;

  /* El pedido */
  const C = calc(m, cart);
  const lines = cart.map((l, i) => {
    const li = m.items[l.id]; if (!li) return null;
    return {
      i, name: li.name, img: li.img, q: l.q, price: money(unit(li, l.ch) * l.q), sum: [sumTxt(li, l.ch), l.nt ? `“${l.nt}”` : ""].filter(Boolean).join(" · "),
      onEdit: (desk = false) => { setSel(l.id); setCh(l.ch); setQty(l.q); setNote(l.nt); setEdit(i); setBackCart(cartOpen); setCartOpen(false); setVista(desk ? "dlg" : "sheet"); },
      onInc: () => { const it2 = m.items[l.id]!; if (qOf(l.id) + 1 > capOf(it2)) return flash(E2(`Solo quedan ${capOf(it2)}.`, `Only ${capOf(it2)} left.`)); setCart(cart.map((x, j) => (j === i ? { ...x, q: x.q + 1 } : x))); },
      onDec: () => setCart(cart.map((x, j) => (j === i ? { ...x, q: x.q - 1 } : x)).filter((x) => x.q > 0)),
    };
  }).filter(Boolean) as { i: number; name: string; img: string | null; q: number; price: string; sum: string; onEdit: (d?: boolean) => void; onInc: () => void; onDec: () => void }[];
  const items = (n: number) => `${n} ${es ? (n === 1 ? "artículo" : "artículos") : n === 1 ? "item" : "items"}`;
  const listoA = est.now + est.readyMin + C.extra, D = est.dlv;
  const llega = dl && D ? [est.now + D.d1 + C.extra, est.now + D.d2 + C.extra] : null;
  const etaL = est.later && est.openAt != null ? E2(`Abre a las ${hora(est.openAt)}`, `Opens at ${hora(est.openAt)}`)
    : llega ? E2(`Llega entre ${hora(llega[0]!)} y ${hora(llega[1]!)}`, `Arrives ${hora(llega[0]!)}–${hora(llega[1]!)}`) : E2(`Listo a las ${hora(listoA)}`, `Ready at ${hora(listoA)}`);
  const etaCaps = est.later && est.openAt != null ? E2(`ABRE A LAS ${hora(est.openAt)} · PROGRAMA TU PEDIDO`, `OPENS AT ${hora(est.openAt)} · SCHEDULE YOUR ORDER`) : etaL.toUpperCase();
  const ENT = entrega(m, cart, modo, es);

  /* Preguntas «otra igual o con cambios» y «cuál quitas» */
  const A = ask && m.items[ask.id] ? ask : null;
  const askV = A ? (() => {
    const ai = m.items[A.id]!, AL = linesOf(A.id), aq = qOf(A.id), ag = A.kind === "again";
    const sm = (l: Linea) => [sumTxt(ai, l.ch), l.nt ? `“${l.nt}”` : ""].filter(Boolean).join(" · ") || ai.desc;
    return {
      ...A, img: ai.img, title: ag ? `${E2("Otra: ", "One more: ")}${ai.name}` : E2("¿Cuál quitas?", "Which one?"),
      meta: ag ? E2(`YA TIENES ${aq} EN TU PEDIDO`, `YOU HAVE ${aq} IN YOUR ORDER`) : E2(`TIENES ${ai.name.toUpperCase()} DE ${AL.length} FORMAS`, `${ai.name.toUpperCase()} · ${AL.length} WAYS`),
      rows: ag ? [...AL].reverse().map(([l], k) => ({
        sum: sm(l), price: money(unit(ai, l.ch)),
        inL: (AL.length > 1 ? (k === 0 ? E2("LA ÚLTIMA · ", "LAST ONE · ") : "") : E2("IGUAL A LA ANTERIOR · ", "SAME AS BEFORE · ")) + E2(`TIENES ${l.q}`, `YOU HAVE ${l.q}`),
        onAdd: () => { setCart(push(cart, A.id, l.ch, 1, l.nt)); setAsk(null); expand(A.id, A.desk); flash(E2(`Otra igual · ${aq + 1} en tu pedido`, `One more · ${aq + 1} in your order`)); },
      })) : AL.map(([l, i]) => ({
        sum: sm(l), price: money(unit(ai, l.ch) * l.q), q: l.q,
        onMinus: () => { const c = cart.map((x) => ({ ...x })); if (c[i]!.q === 1) { c.splice(i, 1); if (AL.length <= 2) setAsk(null); } else c[i]!.q -= 1; setCart(c); },
        onPlus: () => { if (aq + 1 > capOf(ai)) return flash(E2(`Solo quedan ${capOf(ai)}.`, `Only ${capOf(ai)} left.`)); const c = cart.map((x) => ({ ...x })); c[i]!.q += 1; setCart(c); },
      })),
      onCustom: () => { const last = AL[AL.length - 1]![0]; setAsk(null); setSel(A.id); setCh(JSON.parse(JSON.stringify(last.ch))); setQty(1); setNote(last.nt); setEdit(null); setCustom(true); setVista(A.desk ? "dlg" : "sheet"); },
      sameK: AL.length > 1 ? E2("REPETIR UNA DE ESTAS", "REPEAT ONE OF THESE") : E2("OTRA IGUAL", "SAME AGAIN"),
    };
  })() : null;

  return {
    // Abrir un plato desde fuera del menú (Novedades · «Pedir · $X»).
    abrir: open,
    m, es, E2, est, canOrd, listo, cart, pop, cats, chips, sh, lines, has: lines.length > 0, empty: !lines.length, count: C.count,
    countL: items(C.count), countCaps: items(C.count).toUpperCase(), sub: money(C.sub), tax: money(C.tax), total: money(ENT.total), totalC: ENT.total,
    modo, dl, fee: ENT.fee ? money(ENT.fee) : E2("Gratis", "Free"), ENT,
    modes: est.modes.map((k) => ({ k, l: k === "delivery" ? "Delivery" : "Pickup", icon: k === "delivery" ? "truck" : "bag", on: k === modo, onClick: () => { setModoG(k); guardarModo(biz, k); } })),
    taxL: C.taxPct != null ? E2(`Impuestos (${C.taxPct}%)`, `Taxes (${C.taxPct}%)`) : E2("Impuestos", "Taxes"), etaCaps, etaL, listoA,
    cta: lines.length ? (ENT.blk ? ENT.blkS : `${E2("Ir a pagar · ", "Go to checkout · ")}${money(ENT.total)}`) : E2("Agrega platos para pedir", "Add dishes to order"),
    onPay: () => { if (!lines.length) return; if (ENT.blk) { flash(ENT.blk); return; } setCartOpen(false); setVista(""); opts.onPay(); },
    cartOpen, openCart: () => { setCartOpen(true); setVista(""); }, closeCart: () => setCartOpen(false),
    toast, onUndo: () => { if (toast?.undo) setCart(toast.undo); setToast(null); },
    ask: askV, closeAsk: () => setAsk(null), noAsk, toggleNoAsk: () => setNoAsk(!noAsk),
    tiles: (m.pop.length ? m.pop : m.secs.flatMap((s) => s.items)).filter((id) => !offOf(m.items[id]!)).slice(0, 4).map((id) => card(m.items[id]!)),
    lbl: {
      order: E2("Tu pedido", "Your order"), sub: "Subtotal", total: "Total", fee: E2("Envío", "Delivery"), pop: E2("Populares", "Popular"), req: E2("OBLIGATORIO", "REQUIRED"), ready: E2("LISTO", "DONE"),
      kitchen: E2("Instrucciones para la cocina", "Kitchen instructions"), kitchenPh: E2("Ej.: sin cebolla, la salsa aparte", "E.g. no onion, sauce on the side"),
      undo: E2("Deshacer", "Undo"), empty: E2("Tu pedido está vacío", "Your order is empty"), emptySub: E2("Agrega platos del menú.", "Add dishes from the menu."),
      payNote: dl ? E2("Pagas en efectivo al recibir: no se cobra nada en la app.", "You pay cash on delivery: nothing is charged in the app.") : E2("Pagas en el local al recoger: no se cobra nada en la app.", "You pay at the store when you pick up: nothing is charged in the app."),
      edit: E2("Editar", "Edit"), customT: E2("Otra, con cambios", "Another, with changes"), customS: E2("Empieza con lo de la última y cambia lo que quieras.", "Starts from your last one; change what you want."),
      noAsk: E2("Repetir la última sin preguntar en este pedido", "Repeat the last one without asking in this order"), done: E2("Listo", "Done"), close: E2("Cerrar", "Close"),
    },
  };
}
export type Mn = NonNullable<ReturnType<typeof useMenu>>;

/* ── Piezas ── */
const k10 = "font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/55";

export function Modos({ modes }: { modes: { k: string; l: string; icon: string; on: boolean; onClick: () => void }[] }) {
  return (
    <div role="tablist" className="flex gap-1.5 rounded-[14px] bg-ink/5 p-1">
      {modes.map((x) => (
        <button key={x.k} type="button" role="tab" aria-selected={x.on} onClick={x.onClick}
          className={`flex h-[38px] flex-1 items-center justify-center gap-[7px] rounded-[11px] text-[12.5px] font-bold ${x.on ? "bg-white text-ink shadow-[0_1px_4px_rgba(11,14,18,.1)]" : "bg-transparent text-ink/50"}`}>
          <Icon name={x.icon} size={15} />{x.l}
        </button>
      ))}
    </div>
  );
}
function Modo({ mn, card }: { mn: Mn; card?: boolean }) {
  return (
    <div className={card ? "rounded-[17px] border border-line bg-white p-3.5" : ""}>
      <Modos modes={mn.modes} />
      <div className={`mt-[9px] flex items-center gap-[7px] ${k10}`}><Icon name="clock" size={13} color="var(--tl-open)" />{mn.etaCaps}</div>
    </div>
  );
}

function Cerrado({ mn, className = "" }: { mn: Mn; className?: string }) {
  if (!mn.est.closed) return null;
  return (
    <div className={`flex items-start gap-[11px] rounded-2xl bg-ink/5 px-3.5 py-[13px] ${className}`}>
      <span className="grid flex-none pt-px"><Icon name="clock" size={17} color="var(--tl-danger)" /></span>
      <div className="min-w-0">
        <div className="text-[13.5px] font-bold leading-[1.35]">{mn.est.closedT}</div>
        <div className="mt-[3px] text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/65">{mn.est.closedS}</div>
      </div>
    </div>
  );
}

/* Ficha · menú (móvil) */
export function MenuMovil({ mn }: { mn: Mn }) {
  return (
    <div data-screen-label="Ficha · menú" className="lg:hidden">
      <Cerrado mn={mn} className="mx-5 mt-4" />
      {mn.canOrd && <div className="px-5 pt-4"><Modo mn={mn} /></div>}
      <div className="sticky top-[57px] z-[15] mt-3 border-b border-ink/[.07] bg-white py-[11px]">
        <div className="hs flex gap-2 overflow-x-auto px-5">{mn.chips.map((c) => <Chip key={c.k} variant={c.on ? "selected" : "filter"} onClick={c.onClick}>{c.l}</Chip>)}</div>
      </div>
      {mn.pop.length > 0 && (
        <div data-msec="m-pop" className="pt-[18px]">
          <div className="px-5 font-display text-[18px] font-extrabold leading-none tracking-[-0.03em]">{mn.lbl.pop}</div>
          <div className="hs mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1.5">
            {mn.pop.map((it) => <MenuTile lang={mn.es ? "ES" : "EN"} key={it.id} off={it.off} name={it.name} price={it.price} image={it.image} qty={it.qty} selected={it.selected} open={it.open} width={148} height={112} onOpen={it.onOpen} onPlus={it.onPlus} onMinus={it.onMinus} onExpand={it.onExp} />)}
          </div>
        </div>
      )}
      {mn.cats.map((c) => (
        <div key={c.k} data-msec={`m-${c.k}`} className="px-5 pt-6">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-[18px] font-extrabold leading-none tracking-[-0.03em]">{c.title}</span>
            {c.note && <span className="font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{c.note}</span>}
          </div>
          {c.items.map((it) => (
            <div key={it.id} className="grid min-w-0">
              <MenuItemRow lang={mn.es ? "ES" : "EN"} name={it.name} desc={it.desc} price={it.price} tags={it.tags} image={it.image} qty={it.qty} forms={it.forms} off={it.off} selected={it.selected} open={it.open}
                onOpen={it.onOpen} onPlus={it.onPlus} onMinus={it.onMinus} onExpand={it.onExp} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* La tarjeta del pedido (desktop: columna derecha o debajo). */
export function PedidoTarjeta({ mn }: { mn: Mn }) {
  return (
    <div data-screen-label="Ficha · menú · tu pedido" className="flex flex-col gap-3.5 rounded-[22px] border border-ink/10 bg-white p-5 shadow-[var(--shadow-float)]">
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="font-display text-[20px] font-extrabold leading-none tracking-[-0.03em]">{mn.lbl.order}</span>
        <span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{mn.countCaps}</span>
      </div>
      {mn.canOrd && <Modo mn={mn} />}
      {mn.empty && <div className="py-[22px] text-center text-[13px] font-medium text-ink/50">{mn.lbl.emptySub}</div>}
      {mn.has && (
        <>
          <div>
            {mn.lines.map((l, k) => (
              <div key={l.i} className="grid"><CartLine name={l.name} summary={l.sum} price={l.price} qty={l.q} image={l.img} first={k === 0} editLabel={mn.lbl.edit} onEdit={() => l.onEdit(true)} onDec={l.onDec} onInc={l.onInc} /></div>
            ))}
          </div>
          <EnvioGratis e={mn.ENT} plano />
          <Totales mn={mn} plano />
        </>
      )}
      <div className="flex"><Button block disabled={mn.empty} onClick={mn.onPay}>{mn.cta}</Button></div>
      <div className="text-pretty text-[11.5px] font-medium leading-[1.5] text-ink/55">{mn.lbl.payNote}</div>
    </div>
  );
}

export function EnvioGratis({ e, plano }: { e: { hasFree: boolean; freeNote: string; freePct: string; freeFg: string }; plano?: boolean }) {
  if (!e.hasFree) return null;
  return (
    <div className={plano ? "" : "rounded-[17px] border border-line bg-white px-3.5 py-[13px]"}>
      <div role={e.freeFg.includes("danger") ? "alert" : undefined} className="text-[12px] font-semibold" style={{ color: e.freeFg }}>{e.freeNote}</div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink/[.08]"><div className="h-full bg-open" style={{ width: e.freePct }} /></div>
    </div>
  );
}
function Totales({ mn, plano }: { mn: Mn; plano?: boolean }) {
  const fila = (a: string, b: string) => <div className="flex justify-between"><span>{a}</span><span className="font-mono text-ink">{b}</span></div>;
  return (
    <div className={`flex flex-col gap-[9px] text-[12.5px] font-medium text-ink/60 ${plano ? "border-t border-line pt-3" : "rounded-[17px] border border-line bg-white p-[15px]"}`}>
      {fila(mn.lbl.sub, mn.sub)}
      {mn.dl && fila(mn.lbl.fee, mn.fee)}
      {fila(mn.taxL, mn.tax)}
      {!plano && <div className="h-px bg-line" />}
      <div className="flex items-baseline justify-between"><span className="text-[13.5px] font-bold text-ink">{mn.lbl.total}</span><span className="font-display text-[20px] font-extrabold leading-none tracking-[-0.02em] text-ink">{mn.total}</span></div>
    </div>
  );
}

/* Ficha · menú · desktop: índice de categorías a la izquierda y los platos en tarjetas. */
export function MenuDesk({ mn, unaColumna }: { mn: Mn; unaColumna: boolean }) {
  return (
    <div className="hidden lg:block">
      <Cerrado mn={mn} className="mt-6" />
      <div data-screen-label="Ficha · menú · desktop" className="grid grid-cols-[170px_minmax(0,1fr)] items-start gap-8 pt-6">
        <div className="sticky top-5 flex flex-col">
          {mn.chips.map((c) => (
            <button key={c.k} type="button" onClick={c.onDesk} className="py-2.5 pl-3.5 text-left text-[13.5px]"
              style={{ borderLeft: `2.5px solid ${c.on ? "var(--tl-ink)" : "transparent"}`, fontWeight: c.on ? 800 : 600, color: c.on ? "var(--tl-ink)" : "rgba(11,14,18,.5)" }}>{c.l}</button>
          ))}
        </div>
        <div className="min-w-0">
          {mn.pop.length > 0 && (
            <div data-msec="d-pop">
              <div className="font-display text-[20px] font-extrabold leading-none tracking-[-0.03em]">{mn.lbl.pop}</div>
              <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                {mn.pop.map((it) => <div key={it.id} className="grid min-w-0"><MenuTile lang={mn.es ? "ES" : "EN"} off={it.off} name={it.name} price={it.price} image={it.image} qty={it.qty} selected={it.selected} open={it.open} width="100%" height={118} onOpen={it.onDesk} onPlus={it.onPlusD} onMinus={it.onMinusD} onExpand={it.onExp} onEnter={it.onEnter} onLeave={it.onLeave} /></div>)}
              </div>
            </div>
          )}
          {mn.cats.map((c) => (
            <div key={c.k} data-msec={`d-${c.k}`} className="pt-[30px]">
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-[20px] font-extrabold leading-none tracking-[-0.03em]">{c.title}</span>
                {c.note && <span className="font-mono text-[10px] font-semibold tracking-[0.08em] text-ink/50">{c.note}</span>}
              </div>
              <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5">
                {c.items.map((it) => (
                  <div key={it.id} className="grid min-w-0">
                    <MenuItemRow lang={mn.es ? "ES" : "EN"} card name={it.name} desc={it.desc} price={it.price} tags={it.tags} image={it.image} qty={it.qty} forms={it.forms} off={it.off} selected={it.selected} open={it.open}
                      onOpen={it.onDesk} onPlus={it.onPlusD} onMinus={it.onMinusD} onExpand={it.onExp} onEnter={it.onEnter} onLeave={it.onLeave} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {unaColumna && <div className="mt-7 max-w-[520px]"><PedidoTarjeta mn={mn} /></div>}
        </div>
      </div>
    </div>
  );
}

/* Resumen · menú (móvil y desktop): hasta 4 platos para pedir directo. */
export function MenuResumen({ mn, desk, onAll }: { mn: Mn; desk: boolean; onAll?: () => void }) {
  if (!mn.tiles.length) return null;
  return (
    <div data-screen-label={desk ? "Resumen desktop · menú" : "Resumen · menú"}>
      <div className="flex items-baseline justify-between gap-3 lg:items-end lg:gap-5">
        <span className="font-display text-[18px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[24px] lg:tracking-[-0.035em]">{mn.E2("Menú", "Menu")}</span>
        {onAll && <button type="button" onClick={onAll} className="flex-none text-[12.5px] font-bold text-action lg:text-[13.5px]">{mn.E2("Ver el menú", "See the menu")}{desk ? " →" : ""}</button>}
      </div>
      <div className={desk ? "mt-4 grid grid-cols-[repeat(auto-fill,minmax(188px,1fr))] gap-4" : "mt-3 grid grid-cols-2 gap-x-3 gap-y-4"}>
        {mn.tiles.map((it) => (
          <div key={it.id} className="grid min-w-0">
            <MenuTile lang={mn.es ? "ES" : "EN"} off={it.off} name={it.name} price={it.price} image={it.image} qty={it.qty} selected={it.selected} open={it.open} width="100%" height={desk ? 136 : 120}
              onOpen={desk ? it.onDesk : it.onOpen} onPlus={desk ? it.onPlusD : it.onPlus} onMinus={desk ? it.onMinusD : it.onMinus} onExpand={it.onExp}
              onEnter={desk ? it.onEnter : undefined} onLeave={desk ? it.onLeave : undefined} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Hoja del plato (móvil) y ventana (desktop). */
function Plato({ mn }: { mn: Mn }) {
  const sh = mn.sh;
  if (!sh) return null;
  const cuerpo = (
    <>
      <div className="relative bg-photo-bg" style={{ height: sh.desk ? 230 : 210, ...foto(sh.img) }}>
        {!sh.desk && <div className="absolute left-1/2 top-2.5 -ml-[19px] h-1 w-[38px] rounded-[9px] bg-white/85" />}
        <button type="button" aria-label={mn.lbl.close} onClick={sh.onClose} className="absolute right-3.5 top-3.5 grid size-9 place-items-center rounded-xl bg-white/95"><Icon name="close" size={15} strokeWidth={2.4} /></button>
      </div>
      <div className={sh.desk ? "px-6 pb-6 pt-5" : "px-5 pb-6 pt-[18px]"}>
        <div className={`font-display font-extrabold leading-[1.15] tracking-[-0.035em] ${sh.desk ? "text-[24px]" : "text-[22px]"}`}>{sh.name}</div>
        <div className="mt-[9px] flex flex-wrap items-center gap-2">
          <span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{sh.price}</span>
          {sh.tags.map((t) => <Tag key={t.label} tone={t.tone}>{t.label}</Tag>)}
        </div>
        {sh.desc && <p className="mt-2.5 text-pretty text-[13px] leading-[1.6] text-ink/65">{sh.desc}</p>}
        {sh.isCustom && (
          <div className="mt-3 flex items-start gap-[9px] rounded-[13px] bg-action/[.07] px-[13px] py-[11px]">
            <span className="grid flex-none pt-px"><Icon name="edit" size={15} color="var(--tl-action)" /></span>
            <span className="text-pretty text-[12.5px] font-semibold leading-[1.5] text-action-hover">{sh.customNote}</span>
          </div>
        )}
        {sh.tNote && <div className="mt-3 flex items-center gap-[9px] rounded-[14px] bg-ink/[.04] px-[13px] py-[11px] text-[12px] font-medium leading-[1.45] text-ink/70"><Icon name="clock" size={15} />{sh.tNote}</div>}
        {sh.groups.map((g) => (
          <div key={g.k} className="mt-5 grid">
            <OptionGroup title={g.title} meta={g.meta} required={g.required} done={g.done} reqLabel={mn.lbl.req} doneLabel={mn.lbl.ready} options={g.options} multi={g.multi} onToggle={g.onToggle} />
          </div>
        ))}
        <div className="mt-[22px] border-t border-line pt-[18px]">
          <div className="text-[15px] font-bold">{mn.lbl.kitchen}</div>
          <textarea value={sh.note} onChange={(e) => sh.onNote(e.target.value)} placeholder={mn.lbl.kitchenPh} maxLength={200}
            className="mt-2.5 h-[72px] w-full resize-none rounded-[14px] border border-ink/[.12] bg-white px-3.5 py-3 text-[13px] font-medium leading-[1.5] text-ink outline-none" />
        </div>
      </div>
    </>
  );
  const pie = (
    <div className={`flex flex-none items-center gap-[11px] border-t border-line bg-white ${sh.desk ? "px-5 py-3.5" : "px-4 pb-[22px] pt-3"}`}>
      <div className="flex-none"><QtyStepper decLabel={mn.E2("Uno menos", "One less")} incLabel={mn.E2("Uno más", "One more")} value={sh.qty} onDec={sh.onDec} onInc={sh.onInc} /></div>
      <div className="flex min-w-0 flex-1"><Button block disabled={sh.disabled} onClick={sh.onAdd}>{sh.cta}</Button></div>
    </div>
  );
  if (sh.desk) return (
    <div data-screen-label="Menú · plato · desktop" onClick={sh.onClose} className="fixed inset-0 z-[60] hidden bg-ink/45 lg:block">
      <div onClick={stop} className="absolute left-1/2 top-[60px] flex max-h-[calc(100vh-100px)] w-[560px] -translate-x-1/2 flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_30px_60px_-20px_rgba(11,14,18,.5)]">
        <div className="hs flex-1 overflow-y-auto">{cuerpo}</div>{pie}
      </div>
    </div>
  );
  return (
    <div data-screen-label="Menú · plato y opciones" className="fixed inset-0 z-[60] lg:hidden">
      <div onClick={sh.onClose} className="absolute inset-0 bg-ink/50" />
      <div className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white">
        <div className="hs flex-1 overflow-y-auto">{cuerpo}</div>{pie}
      </div>
    </div>
  );
}

function Pregunta({ mn }: { mn: Mn }) {
  const a = mn.ask;
  if (!a) return null;
  const cab = (
    <div className={`flex items-center gap-3 ${a.desk ? "px-[22px] pt-5" : "px-5 pt-3"}`}>
      <span className="size-[52px] flex-none rounded-[14px] bg-photo-bg" style={foto(a.img)} />
      <div className="min-w-0 flex-1">
        <div className="font-display text-[18px] font-extrabold leading-[1.15] tracking-[-0.025em]">{a.title}</div>
        <div className="mt-[5px] font-mono text-[9.5px] font-bold tracking-[0.1em] text-ink/50">{a.meta}</div>
      </div>
      <button type="button" aria-label={mn.lbl.close} onClick={mn.closeAsk} className="grid size-9 flex-none place-items-center rounded-xl bg-ink/5"><Icon name="close" size={15} strokeWidth={2.2} /></button>
    </div>
  );
  const otra = a.kind === "again" ? (
    <div className="hs flex flex-col gap-2.5 overflow-y-auto px-5 pb-[22px] pt-[18px]">
      <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-ink/[.42]">{a.sameK}</div>
      {a.rows.map((x, k) => "onAdd" in x && (
        <button key={k} type="button" onClick={x.onAdd} className="flex items-center gap-3 rounded-[15px] border-[1.5px] border-ink py-[13px] pl-[15px] pr-3 text-left">
          <div className="min-w-0 flex-1">
            <div className="text-pretty text-[13.5px] font-bold leading-[1.4]">{x.sum}</div>
            <div className="mt-1 font-mono text-[9.5px] font-bold tracking-[0.08em] text-ink/50">{x.inL}</div>
          </div>
          <span className="flex h-10 flex-none items-center gap-1.5 rounded-xl bg-ink px-[13px] font-display text-[13px] font-extrabold leading-none text-white"><Icon name="plus" size={14} color="var(--tl-white)" strokeWidth={2.4} />{x.price}</span>
        </button>
      ))}
      <button type="button" onClick={a.onCustom} className="mt-1 flex items-center gap-3 rounded-[15px] border border-ink/[.12] px-[15px] py-[13px] text-left">
        <span className="grid size-[38px] flex-none place-items-center rounded-xl bg-action/[.08]"><Icon name="edit" size={17} color="var(--tl-action)" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold leading-[1.3]">{mn.lbl.customT}</div>
          <div className="mt-[3px] text-[12px] font-medium leading-[1.45] text-ink/55">{mn.lbl.customS}</div>
        </div>
        <Icon name="chevronRight" size={16} color="rgba(11,14,18,.35)" />
      </button>
      <button type="button" onClick={mn.toggleNoAsk} className="mt-2 flex items-center gap-2.5 text-left">
        <span className="grid size-5 flex-none place-items-center rounded-md" style={{ background: mn.noAsk ? "var(--tl-ink)" : "var(--tl-white)", border: mn.noAsk ? "1.5px solid var(--tl-ink)" : "1.5px solid rgba(11,14,18,.25)" }}>
          {mn.noAsk && <Icon name="check" size={12} color="var(--tl-white)" strokeWidth={2.8} />}
        </span>
        <span className="text-[12.5px] font-semibold leading-[1.4] text-ink/70">{mn.lbl.noAsk}</span>
      </button>
    </div>
  ) : (
    <>
      <div className="hs overflow-y-auto px-5 pb-2 pt-3.5">
        {a.rows.map((x, k) => "onMinus" in x && (
          <div key={k} className={`flex items-center gap-3 py-[13px] ${k ? "border-t border-ink/[.07]" : ""}`}>
            <div className="min-w-0 flex-1">
              <div className="text-pretty text-[13.5px] font-bold leading-[1.4]">{x.sum}</div>
              <div className="mt-1 font-mono text-[11.5px] font-bold">{x.price}</div>
            </div>
            <div className="flex-none"><QtyStepper decLabel={mn.E2("Uno menos", "One less")} incLabel={mn.E2("Uno más", "One more")} size="sm" value={x.q} onDec={x.onMinus} onInc={x.onPlus} /></div>
          </div>
        ))}
      </div>
      <div className="flex px-5 pb-[22px] pt-2.5"><Button variant="secondary" block onClick={mn.closeAsk}>{mn.lbl.done}</Button></div>
    </>
  );
  const etiqueta = a.kind === "again" ? "Menú · otra igual o con cambios" : "Menú · cuál quitas";
  if (a.desk) return (
    <div data-screen-label={`${etiqueta} · desktop`} onClick={mn.closeAsk} className="fixed inset-0 z-[60] hidden bg-ink/45 lg:block">
      <div onClick={stop} className="absolute left-1/2 top-[80px] flex max-h-[80vh] w-[460px] -translate-x-1/2 flex-col overflow-hidden rounded-[22px] bg-white">{cab}{otra}</div>
    </div>
  );
  return (
    <div data-screen-label={etiqueta} className="fixed inset-0 z-[60] lg:hidden">
      <div onClick={mn.closeAsk} className="absolute inset-0 bg-ink/50" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[88%] flex-col overflow-hidden rounded-t-[26px] bg-white">
        <div className="grid place-items-center pt-2.5"><span className="h-[5px] w-10 rounded-[9px] bg-ink/15" /></div>
        {cab}{otra}
      </div>
    </div>
  );
}

/* Menú · tu pedido (hoja móvil). */
function Carrito({ mn, nombre }: { mn: Mn; nombre: string }) {
  if (!mn.cartOpen) return null;
  return (
    <div data-screen-label="Menú · tu pedido" className="fixed inset-0 z-[60] lg:hidden">
      <div onClick={mn.closeCart} className="absolute inset-0 bg-ink/50" />
      <div className="absolute inset-x-0 bottom-0 top-24 flex flex-col overflow-hidden rounded-t-[26px] bg-paper">
        <div className="flex flex-none items-center gap-3 border-b border-line pb-[13px] pl-5 pr-4 pt-[17px]">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.03em]">{mn.lbl.order}</div>
            <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{nombre} · {mn.countCaps}</div>
          </div>
          <button type="button" aria-label={mn.lbl.close} onClick={mn.closeCart} className="grid size-9 flex-none place-items-center rounded-xl bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        </div>
        <div className="hs flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-[18px] pt-3.5">
          {mn.canOrd && <Modo mn={mn} card />}
          {mn.empty && <div className="px-4 py-10 text-center"><div className="text-[14px] font-bold">{mn.lbl.empty}</div><div className="mt-1.5 text-[12.5px] font-medium text-ink/50">{mn.lbl.emptySub}</div></div>}
          {mn.has && (
            <>
              <div className="rounded-[17px] border border-line bg-white px-3.5">
                {mn.lines.map((l, k) => <div key={l.i} className="grid"><CartLine name={l.name} summary={l.sum} price={l.price} qty={l.q} image={l.img} first={k === 0} editLabel={mn.lbl.edit} onEdit={() => l.onEdit(false)} onDec={l.onDec} onInc={l.onInc} /></div>)}
              </div>
              <EnvioGratis e={mn.ENT} />
              <Totales mn={mn} />
              <div className="flex items-start gap-[9px] px-1 py-0.5 text-[12px] font-medium leading-[1.5] text-ink/60">
                <span className="grid flex-none pt-px"><Icon name="info" size={15} color="rgba(11,14,18,.45)" /></span><span className="text-pretty">{mn.lbl.payNote}</span>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-none border-t border-line bg-white px-4 pb-[22px] pt-3"><Button block disabled={mn.empty} onClick={mn.onPay}>{mn.cta}</Button></div>
      </div>
    </div>
  );
}

/* Todo lo que flota sobre la ficha: barra del pedido (móvil), aviso, hoja del plato, preguntas y carrito. */
export function MenuCapas({ mn, nombre }: { mn: Mn; nombre: string }) {
  const t = mn.toast;
  return (
    <>
      {mn.has && !mn.cartOpen && !mn.sh && (
        <div data-screen-label="Ficha · barra del pedido" className="fixed inset-x-3.5 bottom-[22px] z-30 grid lg:hidden">
          <OrderBar label={mn.countL} sub={mn.etaCaps} total={mn.total} onClick={mn.openCart} />
        </div>
      )}
      {t && (
        <div role="status" className="fixed inset-x-4 top-[58px] z-[70] flex items-center gap-[9px] rounded-[13px] bg-ink px-3.5 py-[11px] text-[12.5px] font-bold text-white lg:left-auto lg:right-[30px] lg:top-[90px] lg:w-[372px]">
          <Icon name="check" size={15} color="var(--tl-signal)" strokeWidth={2.4} />
          <span className="min-w-0 flex-1 truncate">{t.msg}</span>
          {t.undo && <button type="button" onClick={mn.onUndo} className="flex-none text-[12.5px] font-extrabold text-signal">{mn.lbl.undo}</button>}
        </div>
      )}
      <Plato mn={mn} />
      <Pregunta mn={mn} />
      <Carrito mn={mn} nombre={nombre} />
    </>
  );
}
